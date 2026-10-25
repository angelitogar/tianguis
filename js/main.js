
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const mobileSearchButton = document.getElementById("mobileSearchButton");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const mapOverlay = document.getElementById("mapOverlay");
const mapMessage = document.getElementById("mapMessage");
const markers = [...document.querySelectorAll(".business-marker")];
const filterButtons = [...document.querySelectorAll(".filter-button")];

let activeCategory = "todos";
let zoom = 1;

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

        const matchesCategory =
            activeCategory === "todos" || category === activeCategory;

        const matchesSearch = !query || name.includes(query);
        const visible = matchesCategory && matchesSearch;

        marker.classList.toggle("hidden", !visible);

        if (!visible) {
            marker.classList.remove("selected");
        }

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
        mapMessage.textContent =
            "Explora los negocios de tu comunidad";
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

    const query = searchInput.value.trim().toLocaleLowerCase("es");

    // Primero busca negocios de ejemplo.
    updateMarkers();

    // Si la búsqueda coincide con una sección, abre el menú.
    const matchingLink = [...sideMenu.querySelectorAll("a")].find(link =>
        link.textContent.toLocaleLowerCase("es").includes(query)
    );

    if (query && matchingLink && !markers.some(marker =>
        marker.dataset.name.toLocaleLowerCase("es").includes(query)
    )) {
        toggleMenu(true);
        mapMessage.textContent =
            `Puedes acceder a "${matchingLink.textContent.trim()}" desde el menú.`;
    }
});

searchInput.addEventListener("input", updateMarkers);

markers.forEach(marker => {
    marker.addEventListener("click", () => {
        markers.forEach(item => item.classList.remove("selected"));
        marker.classList.add("selected");

        mapMessage.textContent =
            `${marker.dataset.name} · Categoría: ${marker.dataset.category}`;
    });
});

document.getElementById("zoomIn").addEventListener("click", () => {
    zoom = Math.min(zoom + 0.2, 2.2);
    mapOverlay.style.transform = `scale(${zoom})`;
    mapMessage.textContent = `Zoom de prueba: ${Math.round(zoom * 100)}%`;
});

document.getElementById("zoomOut").addEventListener("click", () => {
    zoom = Math.max(zoom - 0.2, 0.6);
    mapOverlay.style.transform = `scale(${zoom})`;
    mapMessage.textContent = `Zoom de prueba: ${Math.round(zoom * 100)}%`;
});

document.getElementById("locateButton").addEventListener("click", () => {
    zoom = 1;
    mapOverlay.style.transform = "scale(1)";
    mapMessage.textContent =
        "Vista de prueba restablecida. No se ha usado tu ubicación real.";
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

// Estado inicial.
updateMarkers();
