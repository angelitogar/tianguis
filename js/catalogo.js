const API = window.TianguisNegocios;
let activeCategory = "todos";
let currentSearchQuery = "";
let filterOnlyMine = false;
let uploadedImageBase64 = null;

function getStoredProducts() {
    return API.obtenerTabla("products");
}

function saveProducts(products) {
    API.guardarTabla("products", products);
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

    const cart = API.obtenerTabla("cartItems");

    const existing = cart.find(i =>
        !i.comprado &&
        (
            i.productId === item.id ||
            (typeof i.nombre === "string" && i.nombre.toLowerCase() === item.name.toLowerCase())
        )
    );

    if (existing) {
        existing.cantidad += 1;
    } else {
        cart.push({
            id: `${Date.now()}-${Math.random()}`,
            productId: item.id,
            nombre: item.name,
            cantidad: 1,
            unidad: item.unit || "pieza",
            comprado: false,
            categoria: item.category || "Otros"
        });
    }

    API.guardarTabla("cartItems", cart);
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

function getBusinessForProduct(product) {
    return API.buscarNegocio(product.businessId) || {
        name: product.businessName || product.vendorName || "Negocio",
        marketId: product.marketId || ""
    };
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
            (p.description || "").toLowerCase().includes(currentSearchQuery) ||
            getBusinessForProduct(p).name.toLowerCase().includes(currentSearchQuery);
        
        const matchesUser = !filterOnlyMine || (
            user &&
            p.username === API.normalizarNombreUsuario(user.username)
        );

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
        const business = getBusinessForProduct(p);
        const market = API.obtenerTabla("markets").find(item => item.id === business.marketId);
        const hasCustomImg = p.image && p.image.startsWith("data:image");
        const priceDisplay = (p.price !== null && p.price !== undefined && p.price !== "") 
            ? `$${Number(p.price).toFixed(2)} MXN` 
            : `<span class="price-consult">Consultar en puesto</span>`;

        return `
            <article class="product-card">
                <div class="card-img-wrapper">
                    <span class="card-category-badge">${API.escaparHTML(p.category)}</span>
                    ${hasCustomImg 
                        ? `<img src="${API.escaparHTML(p.image)}" alt="${API.escaparHTML(p.name)}">`
                        : `<span class="img-placeholder">${API.escaparHTML(p.image || '📦')}</span>`}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${API.escaparHTML(p.name)}</h3>
                    <p class="card-description">${API.escaparHTML(p.description || 'Sin descripción disponible.')}</p>
                    <div class="card-vendor-info">
                        <strong>${API.escaparHTML(business.name)}</strong>
                        📍 ${API.escaparHTML(market?.name || p.tianguis || 'CDMX')}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-price">${priceDisplay}</div>
                    <button class="btn-card-action" data-product-id="${API.escaparHTML(p.id)}">🛒 Agregar al carrito</button>
                </div>
            </article>
        `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await API.ready;
    } catch (error) {
        document.getElementById("resultsCount").textContent =
            `No se pudieron cargar los datos: ${error.message}`;
        return;
    }

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
    const productsGrid = document.getElementById("productsGrid");

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

    productsGrid.addEventListener("click", event => {
        const button = event.target.closest("[data-product-id]");
        if (button) agregarAlCarrito(button.dataset.productId);
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

        const business = API.obtenerNegocios().find(
            item => item.ownerUsername === API.normalizarNombreUsuario(user.username)
        );
        if (!business) {
            alert("Registra o vincula tu local antes de publicar productos.");
            return;
        }

        const newProduct = {
            id: "prod_" + Date.now(),
            name,
            category,
            price: priceVal !== "" ? parseFloat(priceVal) : null,
            description,
            businessId: business.id,
            marketId: business.marketId,
            vendorName: user.name,
            businessName: business.name,
            image: uploadedImageBase64 || "🛍️",
            username: API.normalizarNombreUsuario(user.username),
            unit: "pieza",
            availability: "disponible",
            aliases: []
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