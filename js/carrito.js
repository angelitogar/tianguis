/*
 * Controla la lista de compras, la búsqueda de ofertas y los marcadores.
 *
 * La lista se guarda en localStorage, dentro del navegador actual.
 * Este código no genera pedidos, reservas ni pagos.
 */

(() => {
    "use strict";

    // Clave que identifica la lista guardada en el navegador.
    const CLAVE_LISTA = "tianguis.listaCompras.v1";

    // Unidades permitidas en el formulario.
    const UNIDADES_PERMITIDAS = [
        "kg",
        "pieza",
        "litro",
        "manojo",
        "paquete"
    ];

    // Los datos de ejemplo se cargan antes que este archivo.
    const tianguis = window.TIANGUIS_DEMO || [];

    // Referencias a elementos de la página para reutilizarlos.
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
        detalle: document.getElementById("detalleTianguis")
    };

    let productosLista = cargarLista();
    let tianguisSeleccionado = null;

    /*
     * Normaliza texto para comparar nombres ignorando mayúsculas,
     * acentos y espacios repetidos.
     */
    function normalizar(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("es")
            .trim()
            .replace(/\s+/g, " ");
    }

    /*
     * Crea un identificador para cada producto de la lista.
     * Usa la función del navegador si está disponible y ofrece
     * una alternativa sencilla si no lo está.
     */
    function crearId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()}`;
    }

    /*
     * Recupera y valida la lista guardada. Si el contenido está dañado
     * o el navegador bloquea el almacenamiento, empieza con una lista vacía.
     */
    function cargarLista() {
        try {
            const textoGuardado = localStorage.getItem(CLAVE_LISTA);

            if (!textoGuardado) {
                return [];
            }

            const listaGuardada = JSON.parse(textoGuardado);

            if (!Array.isArray(listaGuardada)) {
                throw new Error("La lista guardada no es válida.");
            }

            return listaGuardada.filter(producto =>
                producto &&
                typeof producto.id === "string" &&
                typeof producto.nombre === "string" &&
                Number.isFinite(producto.cantidad) &&
                producto.cantidad > 0 &&
                UNIDADES_PERMITIDAS.includes(producto.unidad) &&
                typeof producto.comprado === "boolean"
            );
        } catch {
            elementos.aviso.textContent =
                "No se pudo leer la lista guardada. Puedes crear una nueva.";
            return [];
        }
    }

    /*
     * Guarda la lista actual en el navegador.
     * Si no se puede guardar, informa a la persona usuaria.
     */
    function guardarLista() {
        try {
            localStorage.setItem(CLAVE_LISTA, JSON.stringify(productosLista));
            elementos.aviso.textContent = "";
        } catch {
            elementos.aviso.textContent =
                "El navegador no permitió guardar la lista. Puedes seguir usando esta página mientras permanezca abierta.";
        }
    }

    /*
     * Reúne todos los productos de los puestos para llenar sugerencias
     * y encontrar los nombres conocidos.
     */
    function obtenerProductosCatalogo() {
        return tianguis.flatMap(mercado =>
            mercado.puestos.flatMap(puesto => puesto.productos)
        );
    }

    /*
     * Convierte alias conocidos a un nombre único.
     * Por ejemplo, "tomate rojo" se guarda como "jitomate".
     */
    function obtenerNombreCanonico(nombre) {
        const catalogo = obtenerProductosCatalogo();
        const nombreNormalizado = normalizar(nombre);

        const coincidencia = catalogo.find(producto => {
            const nombres = [producto.nombre, ...producto.alias];
            return nombres.some(alias =>
                normalizar(alias) === nombreNormalizado
            );
        });

        return coincidencia
            ? coincidencia.nombre
            : nombre.trim().replace(/\s+/g, " ");
    }

    /*
     * Devuelve los productos que ofrece un tianguis para el nombre buscado,
     * incluyendo el puesto donde se reporta la oferta.
     */
    function buscarOfertas(mercado, productoBuscado) {
        const nombreBuscado = normalizar(productoBuscado.nombre);

        return mercado.puestos.flatMap(puesto =>
            puesto.productos
                .filter(producto => {
                    const nombres = [producto.nombre, ...producto.alias];

                    return nombres.some(nombre =>
                        normalizar(nombre) === nombreBuscado
                    );
                })
                .map(producto => ({
                    ...producto,
                    nombrePuesto: puesto.nombre
                }))
        );
    }

    /*
     * Devuelve los productos de la lista que todavía no se han marcado
     * como comprados.
     */
    function obtenerPendientes() {
        return productosLista.filter(producto => !producto.comprado);
    }

    /*
     * Cuenta cuántos renglones pendientes tienen alguna oferta reportada
     * como disponible en este tianguis. Cada renglón cuenta una sola vez.
     */
    function contarProductosOfrecidos(mercado) {
        return obtenerPendientes().filter(producto =>
            buscarOfertas(mercado, producto).some(oferta =>
                oferta.disponibilidad === "disponible"
            )
        ).length;
    }

    /*
     * Da formato a los precios como moneda mexicana.
     */
    function formatoMoneda(precio) {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(precio);
    }

    /*
     * Añade una sugerencia por cada producto distinto del catálogo.
     */
    function mostrarSugerencias() {
        const nombres = [
            ...new Set(
                obtenerProductosCatalogo().map(producto => producto.nombre)
            )
        ];

        elementos.sugerencias.replaceChildren();

        nombres.forEach(nombre => {
            const opcion = document.createElement("option");
            opcion.value = nombre;
            elementos.sugerencias.appendChild(opcion);
        });
    }

    /*
     * Dibuja la lista con nodos de texto para que los nombres escritos
     * por el usuario no se interpreten como código HTML.
     */
    function mostrarLista() {
        elementos.lista.replaceChildren();

        productosLista.forEach(producto => {
            const fila = document.createElement("li");
            fila.className = "elementoProducto";

            if (producto.comprado) {
                fila.classList.add("comprado");
            }

            const etiqueta = document.createElement("label");
            etiqueta.className = "etiquetaProducto";

            const casilla = document.createElement("input");
            casilla.type = "checkbox";
            casilla.checked = producto.comprado;
            casilla.setAttribute(
                "aria-label",
                `Marcar ${producto.nombre} como comprado`
            );

            casilla.addEventListener("change", () => {
                producto.comprado = casilla.checked;
                guardarLista();
                dibujarPagina();
            });

            const texto = document.createElement("span");

            const nombre = document.createElement("span");
            nombre.className = "nombreProducto";
            nombre.textContent = producto.nombre;

            const detalle = document.createElement("small");
            detalle.className = "detalleProducto";
            detalle.textContent =
                `${producto.cantidad} ${producto.unidad}`;

            texto.append(nombre, detalle);
            etiqueta.append(casilla, texto);

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "botonEliminar";
            botonEliminar.textContent = "×";
            botonEliminar.setAttribute(
                "aria-label",
                `Eliminar ${producto.nombre} de la lista`
            );

            botonEliminar.addEventListener("click", () => {
                productosLista = productosLista.filter(item =>
                    item.id !== producto.id
                );

                guardarLista();
                dibujarPagina();
            });

            fila.append(etiqueta, botonEliminar);
            elementos.lista.appendChild(fila);
        });

        if (productosLista.length === 0) {
            const filaVacia = document.createElement("li");
            filaVacia.className = "vacia";
            filaVacia.textContent =
                "Tu lista está vacía. Prueba con jitomate, arroz o limón.";
            elementos.lista.appendChild(filaVacia);
        }

        const pendientes = obtenerPendientes().length;
        const comprados = productosLista.length - pendientes;

        elementos.resumen.textContent = productosLista.length
            ? `${pendientes} pendiente(s) · ${comprados} comprado(s)`
            : "";
    }

    /*
     * Aplica la búsqueda escrita y el filtro de categoría.
     * También incluye los productos y puestos en el texto que se busca.
     */
    function obtenerTianguisVisibles() {
        const busqueda = normalizar(elementos.nombre.value);
        const categoria = elementos.filtro.value;

        return tianguis
            .filter(mercado => {
                const puestosDeCategoria = mercado.puestos.filter(puesto =>
                    categoria === "todos" || puesto.categoria === categoria
                );

                if (puestosDeCategoria.length === 0) {
                    return false;
                }

                if (!busqueda) {
                    return true;
                }

                const textos = [
                    mercado.nombre,
                    ...puestosDeCategoria.flatMap(puesto => [
                        puesto.nombre,
                        ...puesto.productos.flatMap(producto => [
                            producto.nombre,
                            ...producto.alias
                        ])
                    ])
                ];

                return textos.some(texto =>
                    normalizar(texto).includes(busqueda)
                );
            })
            .sort((a, b) => {
                const diferencia =
                    contarProductosOfrecidos(b) -
                    contarProductosOfrecidos(a);

                return diferencia || a.nombre.localeCompare(b.nombre, "es");
            });
    }

    /*
     * Dibuja las tarjetas de resultados y los marcadores del esquema.
     * Los números de cada marcador son productos ofrecidos / productos pendientes.
     */
    function mostrarTianguis() {
        const visibles = obtenerTianguisVisibles();
        const pendientes = obtenerPendientes();
        const cantidadPendiente = pendientes.length;

        elementos.resultados.replaceChildren();
        elementos.marcadores.replaceChildren();

        if (
            tianguisSeleccionado &&
            !visibles.some(mercado => mercado.id === tianguisSeleccionado)
        ) {
            tianguisSeleccionado = null;
        }

        visibles.forEach(mercado => {
            const ofrecidos = contarProductosOfrecidos(mercado);

            const tarjeta = document.createElement("button");
            tarjeta.type = "button";
            tarjeta.className = "tarjetaTianguis";

            if (mercado.id === tianguisSeleccionado) {
                tarjeta.classList.add("seleccionado");
            }

            const nombre = document.createElement("strong");
            nombre.textContent = mercado.nombre;

            const cobertura = document.createElement("span");
            cobertura.className = "cobertura";
            cobertura.textContent = cantidadPendiente
                ? `${ofrecidos} de ${cantidadPendiente} productos pendientes con oferta reportada`
                : "Abre para consultar los productos de ejemplo";

            const horario = document.createElement("small");
            horario.className = "horario";
            horario.textContent = mercado.horario;

            tarjeta.append(nombre, cobertura, horario);
            tarjeta.addEventListener("click", () => seleccionarTianguis(mercado.id));
            elementos.resultados.appendChild(tarjeta);

            const marcador = document.createElement("button");
            marcador.type = "button";
            marcador.className = "marcador";

            if (ofrecidos > 0) {
                marcador.classList.add("conOferta");
            }

            if (mercado.id === tianguisSeleccionado) {
                marcador.classList.add("seleccionado");
            }

            marcador.style.setProperty("--x", `${mercado.x}%`);
            marcador.style.setProperty("--y", `${mercado.y}%`);
            marcador.textContent = cantidadPendiente
                ? `${ofrecidos}/${cantidadPendiente}`
                : "•";
            marcador.setAttribute(
                "aria-label",
                `${mercado.nombre}: ${ofrecidos} de ${cantidadPendiente} productos pendientes con oferta`
            );
            marcador.addEventListener("click", () => seleccionarTianguis(mercado.id));
            elementos.marcadores.appendChild(marcador);
        });

        elementos.mensajeMapa.textContent = cantidadPendiente
            ? `${visibles.length} tianguis de demostración. Los marcadores muestran productos ofrecidos / pendientes.`
            : "Agrega productos para comparar los tianguis.";

        mostrarDetalle();
    }

    /*
     * Selecciona un tianguis y actualiza la información de su panel.
     */
    function seleccionarTianguis(id) {
        tianguisSeleccionado = id;
        mostrarTianguis();
    }

    /*
     * Muestra el horario y el estado de cada producto pendiente en el tianguis.
     * Si no hay un registro del producto, indica "Sin información".
     */
    function mostrarDetalle() {
        const mercado = tianguis.find(item =>
            item.id === tianguisSeleccionado
        );

        elementos.detalle.replaceChildren();
        elementos.detalle.hidden = !mercado;

        if (!mercado) {
            return;
        }

        const botonCerrar = document.createElement("button");
        botonCerrar.type = "button";
        botonCerrar.className = "botonCerrar";
        botonCerrar.textContent = "×";
        botonCerrar.setAttribute("aria-label", "Cerrar detalle");
        botonCerrar.addEventListener("click", () => {
            tianguisSeleccionado = null;
            mostrarTianguis();
        });

        const titulo = document.createElement("h3");
        titulo.textContent = mercado.nombre;

        const horario = document.createElement("p");
        horario.textContent = mercado.horario;

        const referencia = document.createElement("p");
        referencia.textContent = mercado.referencia;

        const lista = document.createElement("ul");
        const productosPendientes = obtenerPendientes();

        if (productosPendientes.length === 0) {
            const mensaje = document.createElement("p");
            mensaje.textContent =
                "Ya marcaste todos tus productos como comprados.";
            lista.appendChild(mensaje);
        }

        productosPendientes.forEach(producto => {
            const fila = document.createElement("li");
            const nombre = document.createElement("strong");
            nombre.textContent =
                `${producto.nombre} · ${producto.cantidad} ${producto.unidad}`;
            fila.appendChild(nombre);

            const ofertas = buscarOfertas(mercado, producto);

            if (ofertas.length === 0) {
                const estado = document.createElement("p");
                estado.className = "estadoOtro";
                estado.textContent = "Sin información para este producto.";
                fila.appendChild(estado);
            } else {
                ofertas.forEach(oferta => {
                    const detalleOferta = document.createElement("p");
                    const estadoDisponible =
                        oferta.disponibilidad === "disponible";

                    detalleOferta.className = estadoDisponible
                        ? "estadoDisponible"
                        : "estadoOtro";

                    detalleOferta.textContent =
                        `${oferta.disponibilidad} · ${oferta.nombrePuesto} · ` +
                        `${formatoMoneda(oferta.precio)} por ${oferta.unidad}`;

                    if (estadoDisponible && producto.unidad === oferta.unidad) {
                        detalleOferta.textContent +=
                            ` · Estimado de ejemplo: ${formatoMoneda(
                                oferta.precio * producto.cantidad
                            )}`;
                    } else if (producto.unidad !== oferta.unidad) {
                        detalleOferta.textContent +=
                            " · La unidad no coincide; confirma el precio en el puesto.";
                    }

                    fila.appendChild(detalleOferta);
                });
            }

            lista.appendChild(fila);
        });

        const aviso = document.createElement("p");
        aviso.textContent =
            "Datos ficticios sin fecha de verificación real. La oferta no garantiza existencias ni disponibilidad al llegar.";

        elementos.detalle.append(
            botonCerrar,
            titulo,
            horario,
            referencia,
            lista,
            aviso
        );
    }

    /*
     * Actualiza todos los componentes que dependen de la lista.
     */
    function dibujarPagina() {
        mostrarLista();
        mostrarTianguis();
    }

    /*
     * Agrega el producto del formulario. Si ya existe el mismo producto
     * pendiente con la misma unidad, suma la cantidad.
     */
    elementos.formulario.addEventListener("submit", evento => {
        evento.preventDefault();

        const nombreEscrito = elementos.nombre.value.trim();
        const nombre = obtenerNombreCanonico(nombreEscrito);
        const cantidad = Number(elementos.cantidad.value);
        const unidad = elementos.unidad.value;

        if (
            !nombre ||
            nombre.length > 80 ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            cantidad > 9999 ||
            !UNIDADES_PERMITIDAS.includes(unidad)
        ) {
            elementos.aviso.textContent =
                "Revisa el nombre, la cantidad y la unidad del producto.";
            return;
        }

        const existente = productosLista.find(producto =>
            !producto.comprado &&
            normalizar(producto.nombre) === normalizar(nombre) &&
            producto.unidad === unidad
        );

        if (existente) {
            const nuevaCantidad = existente.cantidad + cantidad;

            if (nuevaCantidad > 9999) {
                elementos.aviso.textContent =
                    "La cantidad acumulada no puede ser mayor que 9999.";
                return;
            }

            existente.cantidad = Math.round(nuevaCantidad * 100) / 100;
        } else {
            productosLista.push({
                id: crearId(),
                nombre,
                cantidad,
                unidad,
                comprado: false
            });
        }

        guardarLista();
        dibujarPagina();

        elementos.nombre.value = "";
        elementos.nombre.focus();
    });

    /*
     * Vacía todos los renglones de la lista.
     */
    elementos.vaciar.addEventListener("click", () => {
        productosLista = [];
        guardarLista();
        dibujarPagina();
    });

    /*
     * Al escribir un producto o cambiar la categoría, actualiza resultados.
     */
    elementos.nombre.addEventListener("input", mostrarTianguis);
    elementos.filtro.addEventListener("change", mostrarTianguis);

    // Al iniciar, prepara las sugerencias y dibuja el estado guardado.
    mostrarSugerencias();
    dibujarPagina();
})();
