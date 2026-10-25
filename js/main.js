/* Menú, búsqueda, filtros y fichas emergentes del mapa. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const mapa = document.getElementById("map");
    const capa = document.getElementById("mapOverlay");
    const ventana = document.getElementById("businessPopup");
    const mensaje = document.getElementById("mapMessage");
    const busqueda = document.getElementById("searchInput");
    const botonesFiltro = [...document.querySelectorAll(".filter-button")];

    let categoriaActiva = "todos";
    let negocioSeleccionado = null;
    let zoom = 1;

    function grupoCategoria(categoria) {
        if (["comida-preparada", "carne", "pollo", "pescado", "frutas-verduras", "cremeria"].includes(categoria)) {
            return "comida";
        }
        if (categoria === "ropa") return "ropa";
        if (categoria === "servicios") return "servicios";
        if (categoria === "hogar") return "hogar";
        return "otros";
    }

    function coincide(negocio, consulta) {
        const texto = [
            negocio.name,
            negocio.location,
            negocio.description,
            API.etiquetaCategoria(negocio.category)
        ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        return !consulta || texto.includes(consulta);
    }

    function obtenerNegociosVisibles() {
        const consulta = busqueda.value.trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        return API.obtenerTodosLosNegocios().filter(negocio => {
            const tienePunto = Number.isFinite(negocio.x) && Number.isFinite(negocio.y);
            const coincideCategoria = categoriaActiva === "todos"
                || grupoCategoria(negocio.category) === categoriaActiva;

            return tienePunto && coincideCategoria && coincide(negocio, consulta);
        });
    }

    function renderizarMarcadores() {
        const visibles = obtenerNegociosVisibles();
        const nombresDemo = new Set(
            API.obtenerTodosLosNegocios()
                .filter(negocio => negocio.isDemo)
                .map(negocio => negocio.name.trim().toLocaleLowerCase("es"))
        );

        // Evita dibujar un negocio registrado encima de un marcador de demostración del mismo nombre.
        const listaFinal = visibles.filter(negocio =>
            negocio.isDemo || !nombresDemo.has(negocio.name.trim().toLocaleLowerCase("es"))
        );

        capa.innerHTML = listaFinal.map(negocio => {
            const resumen = API.obtenerResumenValoraciones(negocio.id);
            const icono = grupoCategoria(negocio.category) === "ropa"
                ? "👕"
                : grupoCategoria(negocio.category) === "comida"
                    ? "🍲"
                    : "📍";

            return `
                <button class="business-marker ${grupoCategoria(negocio.category)} ${negocioSeleccionado === negocio.id ? "selected" : ""} ${negocio.isDemo ? "" : "registered-marker"}"
                        data-business-id="${API.escaparHTML(negocio.id)}"
                        style="--x:${negocio.x}%;--y:${negocio.y}%"
                        aria-label="${API.escaparHTML(negocio.name)}, ${resumen.total} valoraciones">
                    ${icono}
                </button>
            `;
        }).join("");

        mensaje.textContent = listaFinal.length
            ? `${listaFinal.length} negocio(s) visible(s). Selecciona un marcador para ver su ficha.`
            : "No hay negocios que coincidan con la búsqueda y el filtro.";

        if (!listaFinal.some(negocio => negocio.id === negocioSeleccionado)) {
            cerrarVentana();
        }
    }

    function colocarVentana(idNegocio) {
        const marcador = capa.querySelector(`[data-business-id="${CSS.escape(idNegocio)}"]`);
        if (!marcador) return;

        const mapaRect = mapa.getBoundingClientRect();
        const marcadorRect = marcador.getBoundingClientRect();

        ventana.style.left = `${marcadorRect.left - mapaRect.left + marcadorRect.width / 2}px`;
        ventana.style.top = `${Math.max(12, marcadorRect.top - mapaRect.top - 12)}px`;
    }

    function abrirVentana(idNegocio) {
        const negocio = API.buscarNegocio(idNegocio);
        if (!negocio) return;

        negocioSeleccionado = negocio.id;
        const resumen = API.obtenerResumenValoraciones(negocio.id);
        const horario = API.textoHorario(negocio);
        const foto = negocio.photos?.[0] || "";
        const contacto = negocio.contact?.share && negocio.contact.value
            ? `<p><strong>Contacto:</strong> ${API.escaparHTML(negocio.contact.method)} · ${API.escaparHTML(negocio.contact.value)}</p>`
            : "";

        ventana.innerHTML = `
            <button class="popup-close" id="closePopup" aria-label="Cerrar ficha">×</button>
            ${foto ? `<img class="business-photo" src="${API.escaparHTML(foto)}" alt="Foto de ${API.escaparHTML(negocio.name)}">` : ""}
            <h2>${API.escaparHTML(negocio.name)}</h2>
            <p>${API.escaparHTML(API.etiquetaCategoria(negocio.category))}</p>
            <p class="popup-rating">${resumen.total
                ? `★ ${resumen.promedio.toFixed(1)} · ${resumen.total} valoración(es)`
                : "Sin valoraciones"}</p>
            <p><strong>Ubicación:</strong> ${API.escaparHTML(negocio.location || "Sin información")}</p>
            ${horario ? `<p><strong>Horario:</strong> ${API.escaparHTML(horario)}</p>` : ""}
            ${negocio.description ? `<p>${API.escaparHTML(negocio.description)}</p>` : ""}
            ${contacto}
            <div class="detail-actions">
                <a class="primary-action" href="negocio.html?id=${encodeURIComponent(negocio.id)}">Ver detalles</a>
                <a class="secondary-action" href="valoraciones.html?id=${encodeURIComponent(negocio.id)}">Valorar</a>
            </div>
        `;
        ventana.hidden = false;
        renderizarMarcadores();
        colocarVentana(negocio.id);

        document.getElementById("closePopup").addEventListener("click", cerrarVentana);
    }

    function cerrarVentana() {
        negocioSeleccionado = null;
        ventana.hidden = true;
        ventana.innerHTML = "";
        renderizarMarcadores();
    }

    capa.addEventListener("click", evento => {
        const marcador = evento.target.closest("[data-business-id]");
        if (marcador) abrirVentana(marcador.dataset.businessId);
    });

    ventana.addEventListener("click", evento => evento.stopPropagation());

    botonesFiltro.forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActiva = boton.dataset.filter;

            botonesFiltro.forEach(item => {
                const activo = item === boton;
                item.classList.toggle("active", activo);
                item.setAttribute("aria-pressed", String(activo));
            });

            renderizarMarcadores();
        });
    });

    busqueda.addEventListener("input", renderizarMarcadores);
    document.getElementById("searchForm").addEventListener("submit", evento => {
        evento.preventDefault();
        renderizarMarcadores();
    });

    document.getElementById("zoomIn").addEventListener("click", () => {
        zoom = Math.min(zoom + 0.2, 2.2);
        capa.style.transform = `scale(${zoom})`;
        if (negocioSeleccionado) colocarVentana(negocioSeleccionado);
    });

    document.getElementById("zoomOut").addEventListener("click", () => {
        zoom = Math.max(zoom - 0.2, 0.6);
        capa.style.transform = `scale(${zoom})`;
        if (negocioSeleccionado) colocarVentana(negocioSeleccionado);
    });

    document.getElementById("locateButton").addEventListener("click", () => {
        zoom = 1;
        capa.style.transform = "scale(1)";
        cerrarVentana();
    });

    const menu = document.getElementById("sideMenu");
    const menuButton = document.getElementById("menuButton");

    menuButton.addEventListener("click", () => {
        const abierto = !menu.classList.contains("open");
        menu.classList.toggle("open", abierto);
        menu.setAttribute("aria-hidden", String(!abierto));
        menuButton.setAttribute("aria-expanded", String(abierto));
    });

    document.getElementById("mobileSearchButton").addEventListener("click", () => {
        const form = document.getElementById("searchForm");
        form.classList.toggle("mobile-open");
        if (form.classList.contains("mobile-open")) busqueda.focus();
    });

    document.addEventListener("click", evento => {
        if (menu.classList.contains("open")
            && !menu.contains(evento.target)
            && !menuButton.contains(evento.target)) {
            menu.classList.remove("open");
            menu.setAttribute("aria-hidden", "true");
            menuButton.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") cerrarVentana();
    });

    window.addEventListener("storage", renderizarMarcadores);

    renderizarMarcadores();
})();
