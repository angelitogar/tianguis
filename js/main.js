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

// Configurar enlaces del menú según el rol de sesión
function renderMenuByRole() {
    if (!dynamicNavLinks) return;

    const sessionRaw = localStorage.getItem("tianguis_session");
    const user = sessionRaw ? JSON.parse(sessionRaw) : null;

    let html = `<a href="index.html">⌂ &nbsp; Inicio / Mapa</a>`;
    html += `<a href="catalogo.html">▦ &nbsp; Catálogo</a>`;
    html += `<a href="carrito.html">🛒 &nbsp; Mi carrito</a>`;

    if (!user) {
        // Usuario visitante (Público general)
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="login.html" style="font-weight: bold; color: var(--primary);">🔑 &nbsp; Iniciar sesión / Registro</a>`;
    } else if (user.role === "vendedor") {
        // Vendedor logueado
        html += `<a href="detalles-local.html">🏪 &nbsp; Mi Local (${user.business})</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Mis Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión (${user.name})</a>`;
    } else if (user.role === "admin") {
        // Autoridad logueada
        html += `<a href="insights.html">▥ &nbsp; Monitoreo Insights (SEDECO)</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Reportes y Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión (${user.name})</a>`;
    }

    dynamicNavLinks.innerHTML = html;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("tianguis_session");
            window.location.reload();
        });
    }
}

function toggleMenu(force) {
    const shouldOpen = typeof force === "boolean"
        ? force
        : !sideMenu.classList.contains("open");

    sideMenu.classList.toggle("open", shouldOpen);
    sideMenu.setAttribute("aria-hidden", String(!shouldOpen));
    menuButton.setAttribute("aria-expanded", String(shouldOpen));
}

menuButton.addEventListener("click", () => toggleMenu());

mobileSearchButton.addEventListener("click", () => {
    searchForm.classList.toggle("mobile-open");
    if (searchForm.classList.contains("mobile-open")) {
        searchInput.focus();
    }
});

function updateMarkers() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    let visibleCount = 0;

    markers.forEach(marker => {
        const name = marker.dataset.name.toLocaleLowerCase("es");
        const category = marker.dataset.category;

        const matchesCategory = activeCategory === "todos" || category === activeCategory;
        const matchesSearch = !query || name.includes(query);
        const visible = matchesCategory && matchesSearch;

        marker.classList.toggle("hidden", !visible);
        if (!visible) marker.classList.remove("selected");
        if (visible) visibleCount++;
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

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    updateMarkers();
});

searchInput.addEventListener("input", updateMarkers);

markers.forEach(marker => {
    marker.addEventListener("click", () => {
        markers.forEach(item => item.classList.remove("selected"));
        marker.classList.add("selected");
        mapMessage.textContent = `${marker.dataset.name} · Categoría: ${marker.dataset.category}`;
    });
});

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

document.addEventListener("click", event => {
    if (
        sideMenu.classList.contains("open") &&
        !sideMenu.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        toggleMenu(false);
    }
});

// Inicializar vista del menú y marcadores al cargar
document.addEventListener("DOMContentLoaded", () => {
    renderMenuByRole();
    updateMarkers();
});