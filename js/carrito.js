(() => {
    "use strict";

    const CLAVE_LISTA = "tianguis.listaCompras.v1";
    const UNIDADES_PERMITIDAS = ["kg", "pieza", "litro", "manojo", "paquete"];
    const tianguis = window.TIANGUIS_DEMO || [];

    const elementos = {
        formulario: document.getElementById("formularioProducto"),
        nombre: document.getElementById("nombreProducto"),
        cantidad: document.getElementById("cantidadProducto"),
        unidad: document.getElementById("unidadProducto"),
        sugerencias: document.getElementById("sugerenciasProductos"),
        aviso: document.getElementById("avisoAlmacenamiento"),
        lista: document.getElementById("listaProductos"),
        resumen: document.getElementById("resumenLista"),
        vaciar: document.getElementById("vaciarLista"),
        filtro: document.getElementById("filtroCategoria"),
        resultados: document.getElementById("resultadosTianguis"),
        marcadores: document.getElementById("marcadores"),
        mensajeMapa: document.getElementById("mensajeMapa"),
        detalle: document.getElementById("detalleTianguis"),
        panelRuta: document.getElementById("panelRuta")
    };

    let productosLista = cargarLista();
    let tianguisSeleccionado = null;

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("es")
            .trim()
            .replace(/\s+/g, " ");
    }

    function crearId() {
        return (window.crypto && window.crypto.randomUUID) 
            ? window.crypto.randomUUID() 
            : `${Date.now()}-${Math.random()}`;
    }

    function cargarLista() {
        try {
            const textoGuardado = localStorage.getItem(CLAVE_LISTA);
            if (!textoGuardado) return [];
            const listaGuardada = JSON.parse(textoGuardado);
            if (!Array.isArray(listaGuardada)) return [];

            return listaGuardada.filter(p =>
                p && typeof p.nombre === "string" && Number.isFinite(p.cantidad)
            );
        } catch {
            return [];
        }
    }

    function guardarLista() {
        try {
            localStorage.setItem(CLAVE_LISTA, JSON.stringify(productosLista));
        } catch (e) {
            console.error("Error al guardar lista", e);
        }
    }

    function obtenerProductosCatalogo() {
        return tianguis.flatMap(mercado =>
            mercado.puestos.flatMap(puesto => puesto.productos)
        );
    }

    function buscarOfertas(mercado, productoBuscado) {
        const nombreBuscado = normalizar(productoBuscado.nombre);

        return mercado.puestos.flatMap(puesto =>
            puesto.productos
                .filter(producto => {
                    const nombres = [producto.nombre, ...(producto.alias || [])];
                    return nombres.some(n => normalizar(n) === nombreBuscado || normalizar(n).includes(nombreBuscado) || nombreBuscado.includes(normalizar(n)));
                })
                .map(producto => ({
                    ...producto,
                    nombrePuesto: puesto.nombre,
                    categoriaPuesto: puesto.categoria
                }))
        );
    }

    function obtenerPendientes() {
        return productosLista.filter(producto => !producto.comprado);
    }

    function formatoMoneda(precio) {
        return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(precio);
    }

    function mostrarLista() {
        elementos.lista.replaceChildren();

        productosLista.forEach(producto => {
            const fila = document.createElement("li");
            fila.className = `elementoProducto ${producto.comprado ? "comprado" : ""}`;

            const etiqueta = document.createElement("label");
            etiqueta.className = "etiquetaProducto";

            const casilla = document.createElement("input");
            casilla.type = "checkbox";
            casilla.checked = Boolean(producto.comprado);
            casilla.addEventListener("change", () => {
                producto.comprado = casilla.checked;
                guardarLista();
                dibujarPagina();
            });

            const texto = document.createElement("span");
            texto.innerHTML = `<span class="nombreProducto">${producto.nombre}</span> <small class="detalleProducto">${producto.cantidad} ${producto.unidad}</small>`;

            etiqueta.append(casilla, texto);

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "botonEliminar";
            botonEliminar.textContent = "×";
            botonEliminar.addEventListener("click", () => {
                productosLista = productosLista.filter(item => item.id !== producto.id);
                guardarLista();
                dibujarPagina();
            });

            fila.append(etiqueta, botonEliminar);
            elementos.lista.appendChild(fila);
        });

        if (productosLista.length === 0) {
            elementos.lista.innerHTML = `<li class="vacia">Tu lista está vacía. Añade productos desde el catálogo o la barra superior.</li>`;
        }

        const pendientes = obtenerPendientes().length;
        elementos.resumen.textContent = productosLista.length
            ? `${pendientes} pendiente(s) · ${productosLista.length - pendientes} comprado(s)`
            : "";
    }

    /* Genera el Itinerario / Ruta de Compra Paso a Paso */
    function generarRutaOptima() {
        const pendientes = obtenerPendientes();
        if (!elementos.panelRuta) return;

        if (pendientes.length === 0) {
            elementos.panelRuta.innerHTML = `
                <div class="ruta-header">
                    <h3>🗺️ Ruta de Compras</h3>
                </div>
                <p style="font-size:13px; color:var(--texto-suave); margin:0;">Agrega productos a tu lista para trazarte la ruta más eficiente.</p>
            `;
            return;
        }

        // Encontrar el tianguis con mayor cobertura
        let mejorTianguis = null;
        let maxCobertura = -1;

        tianguis.forEach(mercado => {
            let cubiertos = 0;
            pendientes.forEach(p => {
                if (buscarOfertas(mercado, p).length > 0) cubiertos++;
            });
            if (cubiertos > maxCobertura) {
                maxCobertura = cubiertos;
                mejorTianguis = mercado;
            }
        });

        if (!mejorTianguis || maxCobertura === 0) {
            elementos.panelRuta.innerHTML = `
                <div class="ruta-header">
                    <h3>🗺️ Ruta Sugerida</h3>
                </div>
                <p style="font-size:13px; color:var(--texto-suave); margin:0;">Buscando disponibilidad en tianguis cercanos para tus productos...</p>
            `;
            return;
        }

        // Construir pasos agrupando productos por puestos del tianguis seleccionado
        let totalEstimado = 0;
        let pasoNum = 1;
        let pasosHTML = "";

        const mapaPuestos = {};

        pendientes.forEach(prod => {
            const ofertas = buscarOfertas(mejorTianguis, prod);
            if (ofertas.length > 0) {
                const mejorOferta = ofertas[0];
                const nombrePuesto = mejorOferta.nombrePuesto;

                if (!mapaPuestos[nombrePuesto]) {
                    mapaPuestos[nombrePuesto] = [];
                }

                const costoProd = mejorOferta.precio * prod.cantidad;
                totalEstimado += costoProd;

                mapaPuestos[nombrePuesto].push({
                    producto: prod.nombre,
                    cantidad: `${prod.cantidad} ${prod.unidad}`,
                    precioUnitario: mejorOferta.precio,
                    subtotal: costoProd
                });
            }
        });

        for (const [puesto, prods] of Object.entries(mapaPuestos)) {
            const detalleProds = prods.map(p => `<strong>${p.producto}</strong> (${p.cantidad}) - ${formatoMoneda(p.subtotal)}`).join(", ");

            pasosHTML += `
                <li class="ruta-paso">
                    <span class="paso-num">${pasoNum++}</span>
                    <div class="paso-info">
                        <span class="paso-puesto">Puesto: ${puesto}</span>
                        <div>Comprar: ${detalleProds}</div>
                    </div>
                </li>
            `;
        }

        elementos.panelRuta.innerHTML = `
            <div class="ruta-header">
                <h3>🗺️ Ruta de Compra Recomendada</h3>
                <span class="ruta-badge">${maxCobertura}/${pendientes.length} cubiertos</span>
            </div>
            <div class="ruta-tianguis-nombre">📍 ${mejorTianguis.nombre}</div>
            <div style="font-size:12px; color:var(--texto-suave);">${mejorTianguis.horario}</div>
            <ul class="ruta-pasos-lista">
                ${pasosHTML}
            </ul>
            <div class="ruta-total">
                <span>Presupuesto Estimado Total:</span>
                <span>${formatoMoneda(totalEstimado)}</span>
            </div>
        `;
    }

    function obtenerTianguisVisibles() {
        const busqueda = normalizar(elementos.nombre.value);
        const categoria = elementos.filtro.value;

        return tianguis.filter(mercado => {
            if (categoria !== "todos") {
                const tieneCat = mercado.puestos.some(p => normalizar(p.categoria) === normalizar(categoria) || p.categoria === categoria);
                if (!tieneCat) return false;
            }
            if (!busqueda) return true;
            return normalizar(mercado.nombre).includes(busqueda);
        });
    }

    function mostrarTianguis() {
        const visibles = obtenerTianguisVisibles();
        const pendientes = obtenerPendientes();

        elementos.resultados.replaceChildren();
        elementos.marcadores.replaceChildren();

        visibles.forEach(mercado => {
            const tarjeta = document.createElement("button");
            tarjeta.type = "button";
            tarjeta.className = `tarjetaTianguis ${mercado.id === tianguisSeleccionado ? "seleccionado" : ""}`;
            tarjeta.innerHTML = `
                <strong>${mercado.nombre}</strong>
                <span class="cobertura">📍 ${mercado.referencia}</span>
                <small class="horario">${mercado.horario}</small>
            `;
            tarjeta.addEventListener("click", () => {
                tianguisSeleccionado = mercado.id;
                mostrarTianguis();
            });
            elementos.resultados.appendChild(tarjeta);

            const marcador = document.createElement("button");
            marcador.type = "button";
            marcador.className = `marcador conOferta ${mercado.id === tianguisSeleccionado ? "seleccionado" : ""}`;
            marcador.style.setProperty("--x", `${mercado.x}%`);
            marcador.style.setProperty("--y", `${mercado.y}%`);
            marcador.textContent = "📍";
            marcador.addEventListener("click", () => {
                tianguisSeleccionado = mercado.id;
                mostrarTianguis();
            });
            elementos.marcadores.appendChild(marcador);
        });

        mostrarDetalle();
    }

    function mostrarDetalle() {
        const mercado = tianguis.find(item => item.id === tianguisSeleccionado);
        elementos.detalle.replaceChildren();
        elementos.detalle.hidden = !mercado;

        if (!mercado) return;

        elementos.detalle.innerHTML = `
            <button class="botonCerrar" onclick="this.parentElement.hidden=true">×</button>
            <h3>${mercado.nombre}</h3>
            <p><strong>Horario:</strong> ${mercado.horario}</p>
            <p><strong>Ubicación:</strong> ${mercado.referencia}</p>
            <hr style="border:0; border-top:1px solid var(--borde); margin:10px 0;">
            <p style="font-weight:700; color:var(--verde);">Puestos registrados:</p>
            <ul>
                ${mercado.puestos.map(p => `<li><strong>${p.nombre}</strong> (${p.categoria})</li>`).join('')}
            </ul>
        `;
    }

    function dibujarPagina() {
        mostrarLista();
        generarRutaOptima();
        mostrarTianguis();
    }

    elementos.formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        const nombre = elementos.nombre.value.trim();
        const cantidad = Number(elementos.cantidad.value);
        const unidad = elementos.unidad.value;

        if (!nombre) return;

        productosLista.push({
            id: crearId(),
            nombre,
            cantidad,
            unidad,
            comprado: false
        });

        guardarLista();
        dibujarPagina();
        elementos.nombre.value = "";
    });

    elementos.vaciar.addEventListener("click", () => {
        productosLista = [];
        guardarLista();
        dibujarPagina();
    });

    elementos.filtro.addEventListener("change", mostrarTianguis);

    dibujarPagina();
})();