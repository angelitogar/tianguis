/*
- Controla el menú, la búsqueda y los marcadores de la página principal.
- También construye los enlaces del menú según la sesión local.
 */

const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const dynamicNavLinks = document.getElementById("dynamicNavLinks");
const mobileSearchButton = document.getElementById("mobileSearchButton");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const mapOverlay = document.getElementById("mapOverlay");
const mapMessage = document.getElementById("mapMessage");
const markers = [...document.querySelectorAll(".business-marker")];
const filterButtons = [...document.querySelectorAll(".filter-button")];

let activeCategory = "todos";
let zoom = 1;

/*
- Construye los enlaces comunes y los enlaces específicos del rol.
- El registro de negocio y la denuncia ciudadana se muestran siempre.
 */
function renderMenuByRole() {
    if (!dynamicNavLinks) return;

    let user = null;

    try {
        const sessionRaw = localStorage.getItem("tianguis_session");
        user = sessionRaw ? JSON.parse(sessionRaw) : null;
    } catch {
        // Si la sesión guardada está dañada, se trata a la persona como visitante.
        localStorage.removeItem("tianguis_session");
    }

    let html = `<a href="index.html">⌂ &nbsp; Inicio / Mapa</a>`;
    html += `<a href="catalogo.html">▦ &nbsp; Catálogo</a>`;
    html += `<a href="carrito.html">🛒 &nbsp; Mi carrito</a>`;
    html += `<a href="registrar-negocio.html">＋ &nbsp; Registrar mi negocio</a>`;
    html += `<a href="denuncias.html" style="color: #c5221f; font-weight: 600;">🚨 &nbsp; Denuncia Ciudadana</a>`;

    if (!user) {
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="login.html" style="font-weight: bold; color: var(--primary);">🔑 &nbsp; Iniciar sesión / Registro</a>`;
    } else if (user.role === "vendedor") {
        html += `<a href="detalles-local.html">🏪 &nbsp; Mi Local (${user.business || ""})</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Mis Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión (${user.name || ""})</a>`;
    } else if (user.role === "admin") {
        html += `<a href="insights.html">▥ &nbsp; Monitoreo Insights (SEDECO)</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Reportes y Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión (${user.name || ""})</a>`;
    }

    dynamicNavLinks.innerHTML = html;

    const logoutButton = document.getElementById("logoutBtn");

    if (logoutButton) {
        logoutButton.addEventListener("click", event => {
            event.preventDefault();
            localStorage.removeItem("tianguis_session");
            window.location.reload();
        });
    }
}

/*
- Abre o cierra el menú lateral y actualiza su estado accesible.
 */
function toggleMenu(force) {
    const shouldOpen = typeof force === "boolean"
        ? force
        : !sideMenu.classList.contains("open");

    sideMenu.classList.toggle("open", shouldOpen);
    sideMenu.setAttribute("aria-hidden", String(!shouldOpen));
    menuButton.setAttribute("aria-expanded", String(shouldOpen));
}

menuButton.addEventListener("click", () => toggleMenu());

/*
- Muestra el buscador cuando se activa el botón para pantallas estrechas.
 */
mobileSearchButton.addEventListener("click", () => {
    searchForm.classList.toggle("mobile-open");

    if (searchForm.classList.contains("mobile-open")) {
        searchInput.focus();
    }
});

/*
- Filtra los marcadores según el texto y la categoría seleccionados.
 */
function updateMarkers() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    let visibleCount = 0;

    markers.forEach(marker => {
        const name = marker.dataset.name.toLocaleLowerCase("es");
        const category = marker.dataset.category;

        const matchesCategory =
            activeCategory === "todos" || category === activeCategory;
        const matchesSearch = !query || name.includes(query);
        const visible = matchesCategory && matchesSearch;

        marker.classList.toggle("hidden", !visible);

        if (!visible) {
            marker.classList.remove("selected");
        }

        if (visible) {
            visibleCount++;
        }
    });

    if (query) {
        mapMessage.textContent = visibleCount
            ? `${visibleCount} negocio(s) encontrado(s)`
            : "No se encontraron negocios con esa búsqueda.";
    } else if (activeCategory !== "todos") {
        mapMessage.textContent = visibleCount
            ? `${visibleCount} negocio(s) en esta categoría`
            : "Aún no hay negocios en esta categoría.";
    } else {
        mapMessage.textContent = "Explora los negocios de tu comunidad";
    }
}

/* Activa el filtro de la categoría seleccionada. */
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeCategory = button.dataset.filter;

        filterButtons.forEach(filter => {
            const selected = filter === button;
            filter.classList.toggle("active", selected);
            filter.setAttribute("aria-pressed", String(selected));
        });

        updateMarkers();
    });
});

/* Evita que el formulario recargue la página al buscar. */
searchForm.addEventListener("submit", event => {
    event.preventDefault();
    updateMarkers();
});

searchInput.addEventListener("input", updateMarkers);

/* Muestra el nombre del negocio seleccionado. */
markers.forEach(marker => {
    marker.addEventListener("click", () => {
        markers.forEach(item => item.classList.remove("selected"));
        marker.classList.add("selected");

        mapMessage.textContent =
            `${marker.dataset.name} · Categoría: ${marker.dataset.category}`;
    });
});

/* Controles de zoom de demostración para los marcadores. */
document.getElementById("zoomIn").addEventListener("click", () => {
    zoom = Math.min(zoom + 0.2, 2.2);
    mapOverlay.style.transform = `scale(${zoom})`;
});

document.getElementById("zoomOut").addEventListener("click", () => {
    zoom = Math.max(zoom - 0.2, 0.6);
    mapOverlay.style.transform = `scale(${zoom})`;
});

document.getElementById("locateButton").addEventListener("click", () => {
    zoom = 1;
    mapOverlay.style.transform = "scale(1)";
});

/* Cierra el menú si se hace clic fuera de él. */
document.addEventListener("click", event => {
    if (
        sideMenu.classList.contains("open") &&
        !sideMenu.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        toggleMenu(false);
    }
});

/* Inicializa menú y marcadores al cargar el documento. */
document.addEventListener("DOMContentLoaded", () => {
    renderMenuByRole();
    updateMarkers();
});