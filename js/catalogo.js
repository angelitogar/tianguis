const SEED_PRODUCTS = [
    {
        id: "p1",
        name: "Playera Bordada Artesanal",
        category: "Ropa",
        price: 180,
        description: "Algodón 100% mexicano bordado a mano. Variedad de tallas.",
        vendorName: "María Guadalupe Pérez",
        businessName: "Novedades y Ropa Lupita",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)",
        image: "👕",
        username: "lupita_antojitos"
    },
    {
        id: "p2",
        name: "Orden de Tacos de Cecina (3 pzs)",
        category: "Comida preparada",
        price: 65,
        description: "Incluye nopales, papas cambray, cebollitas y salsas al gusto.",
        vendorName: "María Guadalupe Pérez",
        businessName: "Antojitos Lupita",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)",
        image: "🍲",
        username: "lupita_antojitos"
    },
    {
        id: "p3",
        name: "Pechuga de Pollo Fresca (Kg)",
        category: "Carne / Pollo / Pescado crudo",
        price: 110,
        description: "Pollo fresco del día, aplanado o en filetes sin costo extra.",
        vendorName: "Carlos Méndez",
        businessName: "Pollería El Gallito",
        tianguis: "Mercado de La Merced (Venustiano Carranza)",
        image: "🍗",
        username: "carlos_polleria"
    },
    {
        id: "p4",
        name: "Aguacate Hass Criollo (Kg)",
        category: "Fruta / verdura",
        price: 55,
        description: "Aguacate suave punto exacto para guacamole.",
        vendorName: "Pedro Ramírez",
        businessName: "Frutas y Verduras San Juan",
        tianguis: "Tianguis Mixcoac (Benito Juárez)",
        image: "🥑",
        username: "don_pedro_frutas"
    },
    {
        id: "p5",
        name: "Carrito Coleccionable Escala 1:64",
        category: "Juguetes",
        price: 40,
        description: "Modelos variados Hot Wheels y Matchbox sellados en blister.",
        vendorName: "Jorge Luis",
        businessName: "Juguetes y Coleccionables",
        tianguis: "Tianguis El Salado (Iztapalapa)",
        image: "🏎️",
        username: "jorge_juguetes"
    },
    {
        id: "p6",
        name: "Queso Oaxaca Artesanal (500g)",
        category: "Cremería",
        price: 75,
        description: "Queso de hebra traído directamente de Tehuacán.",
        vendorName: "Roberto Gómez",
        businessName: "Cremería La Crema de la Crema",
        tianguis: "Tianguis Condesa (Cuauhtémoc)",
        image: "🧀",
        username: "cremeria_roberto"
    },
    {
        id: "p7",
        name: "Pedro Páramo - Juan Rulfo (Edición Usada)",
        category: "Libros",
        price: 50,
        description: "Libro en excelente estado. Clásico de la literatura mexicana.",
        vendorName: "Ana Belén",
        businessName: "Libros Usados y Joyas Literarias",
        tianguis: "Tianguis Condesa (Cuauhtémoc)",
        image: "📚",
        username: "ana_libros"
    },
    {
        id: "p8",
        name: "Perfume Avon Sweet Honesty 50ml",
        category: "Tiendas de catálogo",
        price: 120,
        description: "Producto nuevo y sellado de catálogo Avon.",
        vendorName: "Socorro Hernández",
        businessName: "Ventas por Catálogo Soco",
        tianguis: "Tianguis La Purísima (Iztapalapa)",
        image: "🧴",
        username: "soco_catalogos"
    },
    {
        id: "p9",
        name: "Cargador Carga Rápida USB-C 20W",
        category: "Electrónica",
        price: null,
        description: "Compatible con Android e iPhone. Pregunta por disponibilidad en puesto.",
        vendorName: "Tech Barrio",
        businessName: "Novedades Electrónicas",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)",
        image: "🔌",
        username: "tech_barrio"
    },
    {
        id: "p10",
        name: "Cámara Fotográfica Réflex Vintage 1980",
        category: "Antigüedad",
        price: 650,
        description: "Funcional para coleccionistas o decoración retro.",
        vendorName: "Don Fernando",
        businessName: "Antigüedades El Tiempo",
        tianguis: "Tianguis Mixcoac (Benito Juárez)",
        image: "📷",
        username: "fer_antiguedades"
    },
    {
        id: "p11",
        name: "Bolsas Ecológicas Reutilizables",
        category: "Otros",
        price: 25,
        description: "Resistentes para hacer las compras del tianguis.",
        vendorName: "María Guadalupe Pérez",
        businessName: "Antojitos Lupita",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)",
        image: "🛍️",
        username: "lupita_antojitos"
    }
];

let activeCategory = "todos";
let currentSearchQuery = "";
let filterOnlyMine = false;
let uploadedImageBase64 = null;

function getStoredProducts() {
    const data = localStorage.getItem("tianguis_products");
    if (!data) {
        localStorage.setItem("tianguis_products", JSON.stringify(SEED_PRODUCTS));
        return SEED_PRODUCTS;
    }
    return JSON.parse(data);
}

function saveProducts(products) {
    localStorage.setItem("tianguis_products", JSON.stringify(products));
}

function getCurrentUser() {
    const raw = localStorage.getItem("tianguis_session");
    return raw ? JSON.parse(raw) : null;
}

// Agrega el producto a la lista de compras del carrito y redirige
function agregarAlCarrito(productId) {
    const products = getStoredProducts();
    const item = products.find(p => p.id === productId);
    if (!item) return;

    const CART_KEY = "tianguis.listaCompras.v1";
    let cart = [];

    try {
        const raw = localStorage.getItem(CART_KEY);
        if (raw) cart = JSON.parse(raw);
    } catch (e) {
        cart = [];
    }

    const existing = cart.find(i => !i.comprado && i.nombre.toLowerCase() === item.name.toLowerCase());

    if (existing) {
        existing.cantidad += 1;
    } else {
        cart.push({
            id: `${Date.now()}-${Math.random()}`,
            nombre: item.name,
            cantidad: 1,
            unidad: "pieza",
            comprado: false,
            categoria: item.category || "Otros"
        });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.location.href = "carrito.html";
}

function renderMenuByRole() {
    const dynamicNavLinks = document.getElementById("dynamicNavLinks");
    if (!dynamicNavLinks) return;

    const user = getCurrentUser();

    let html = `<a href="index.html">⌂ &nbsp; Inicio / Mapa</a>`;
    html += `<a href="catalogo.html" style="font-weight: bold; color: var(--primary);">▦ &nbsp; Catálogo</a>`;
    html += `<a href="carrito.html">🛒 &nbsp; Mi carrito</a>`;

    if (!user) {
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="login.html" style="color: var(--primary);">🔑 &nbsp; Iniciar sesión / Registro</a>`;
    } else if (user.role === "vendedor") {
        html += `<a href="detalles-local.html">🏪 &nbsp; Mi Local (${user.business || 'Puesto'})</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Mis Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión</a>`;
    } else if (user.role === "admin") {
        html += `<a href="insights.html">▥ &nbsp; Monitoreo Insights</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Reportes y Valoraciones</a>`;
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión</a>`;
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

function renderProducts() {
    const products = getStoredProducts();
    const user = getCurrentUser();
    const productsGrid = document.getElementById("productsGrid");
    const resultsCount = document.getElementById("resultsCount");

    let filtered = products.filter(p => {
        const matchesCategory = (activeCategory === "todos" || p.category === activeCategory);
        const matchesSearch = !currentSearchQuery || 
            p.name.toLowerCase().includes(currentSearchQuery) || 
            p.description.toLowerCase().includes(currentSearchQuery) ||
            p.businessName.toLowerCase().includes(currentSearchQuery);
        
        const matchesUser = !filterOnlyMine || (user && p.username === user.username);

        return matchesCategory && matchesSearch && matchesUser;
    });

    resultsCount.textContent = `${filtered.length} producto(s) encontrado(s)`;

    if (filtered.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                <h3>No se encontraron productos</h3>
                <p>Intenta cambiando la categoría o el término de búsqueda.</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = filtered.map(p => {
        const hasCustomImg = p.image && p.image.startsWith("data:image");
        const priceDisplay = (p.price !== null && p.price !== undefined && p.price !== "") 
            ? `$${Number(p.price).toFixed(2)} MXN` 
            : `<span class="price-consult">Consultar en puesto</span>`;

        return `
            <article class="product-card">
                <div class="card-img-wrapper">
                    <span class="card-category-badge">${p.category}</span>
                    ${hasCustomImg 
                        ? `<img src="${p.image}" alt="${p.name}">` 
                        : `<span class="img-placeholder">${p.image || '📦'}</span>`}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${p.name}</h3>
                    <p class="card-description">${p.description || 'Sin descripción disponible.'}</p>
                    <div class="card-vendor-info">
                        <strong>${p.businessName || p.vendorName}</strong>
                        📍 ${p.tianguis || 'CDMX'}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-price">${priceDisplay}</div>
                    <button class="btn-card-action" onclick="agregarAlCarrito('${p.id}')">🛒 Agregar al carrito</button>
                </div>
            </article>
        `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    const vendorPanel = document.getElementById("vendorPanel");
    const vendorStatusBadge = document.getElementById("vendorStatusBadge");
    const btnOnlyMyProducts = document.getElementById("btnOnlyMyProducts");
    const addProductForm = document.getElementById("addProductForm");
    const prodImage = document.getElementById("prodImage");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const removeImgBtn = document.getElementById("removeImgBtn");
    const categoryPills = document.getElementById("categoryPills");

    const menuButton = document.getElementById("menuButton");
    const sideMenu = document.getElementById("sideMenu");
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const mobileSearchButton = document.getElementById("mobileSearchButton");

    renderMenuByRole();

    menuButton.addEventListener("click", () => {
        const open = sideMenu.classList.toggle("open");
        sideMenu.setAttribute("aria-hidden", String(!open));
    });

    mobileSearchButton.addEventListener("click", () => {
        searchForm.classList.toggle("mobile-open");
    });

    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        currentSearchQuery = searchInput.value.trim().toLowerCase();
        renderProducts();
    });

    searchInput.addEventListener("input", (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderProducts();
    });

    if (user && user.role === "vendedor") {
        vendorPanel.classList.remove("hidden");
        vendorStatusBadge.classList.remove("hidden");
        btnOnlyMyProducts.classList.remove("hidden");
    }

    categoryPills.addEventListener("click", (e) => {
        if (e.target.classList.contains("pill")) {
            document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
            e.target.classList.add("active");
            activeCategory = e.target.dataset.category;
            renderProducts();
        }
    });

    btnOnlyMyProducts.addEventListener("click", () => {
        filterOnlyMine = !filterOnlyMine;
        btnOnlyMyProducts.classList.toggle("active", filterOnlyMine);
        renderProducts();
    });

    prodImage.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedImageBase64 = event.target.result;
                imagePreview.src = uploadedImageBase64;
                imagePreviewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener("click", () => {
        uploadedImageBase64 = null;
        prodImage.value = "";
        imagePreviewContainer.classList.add("hidden");
    });

    addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!user || user.role !== "vendedor") {
            alert("Debes iniciar sesión como vendedor para registrar un producto.");
            return;
        }

        const name = document.getElementById("prodName").value.trim();
        const category = document.getElementById("prodCategory").value;
        const priceVal = document.getElementById("prodPrice").value.trim();
        const description = document.getElementById("prodDescription").value.trim();

        const newProduct = {
            id: "prod_" + Date.now(),
            name,
            category,
            price: priceVal !== "" ? parseFloat(priceVal) : null,
            description,
            vendorName: user.name,
            businessName: user.business || user.name,
            tianguis: user.tianguis || "Tianguis CDMX",
            image: uploadedImageBase64 || "🛍️",
            username: user.username
        };

        const currentProducts = getStoredProducts();
        currentProducts.unshift(newProduct);
        saveProducts(currentProducts);

        alert("¡Producto publicado correctamente!");
        addProductForm.reset();
        uploadedImageBase64 = null;
        imagePreviewContainer.classList.add("hidden");

        renderProducts();
    });

    renderProducts();
});