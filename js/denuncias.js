const API = window.TianguisNegocios;
let uploadedBase64 = null;

function getStoredDenuncias() {
    return API.obtenerTabla("denuncias");
}

function saveDenuncias(denuncias) {
    API.guardarTabla("denuncias", denuncias);
}

function getCurrentUser() {
    const raw = localStorage.getItem("tianguis_session");
    return raw ? JSON.parse(raw) : null;
}

function renderMenuByRole() {
    const dynamicNavLinks = document.getElementById("dynamicNavLinks");
    if (!dynamicNavLinks) return;

    const user = getCurrentUser();

    let html = `<a href="index.html">⌂ &nbsp; Inicio / Mapa</a>`;
    html += `<a href="catalogo.html">▦ &nbsp; Catálogo</a>`;
    html += `<a href="carrito.html">🛒 &nbsp; Mi carrito</a>`;
    html += `<a href="denuncias.html" style="font-weight: bold; color: #c5221f;">🚨 &nbsp; Denuncia Ciudadana</a>`;

    if (!user) {
        html += `<a href="qa.html">? &nbsp; Preguntas frecuentes</a>`;
        html += `<a href="login.html" style="color: var(--primary);">🔑 &nbsp; Iniciar sesión / Registro</a>`;
    } else if (user.role === "vendedor") {
        html += `<a href="detalles-local.html">🏪 &nbsp; Mi Local (${user.business || 'Puesto'})</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Mis Valoraciones</a>`;
        html += `<a href="#" id="logoutBtn" style="color: #c5221f;">🚪 &nbsp; Cerrar Sesión</a>`;
    } else if (user.role === "admin") {
        html += `<a href="insights.html">▥ &nbsp; Monitoreo Insights</a>`;
        html += `<a href="valoraciones.html">★ &nbsp; Reportes y Valoraciones</a>`;
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

function renderDenuncias() {
    const grid = document.getElementById("denunciasGrid");
    const denuncias = getStoredDenuncias();

    if (denuncias.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 36px; margin-bottom: 8px;">✅</div>
                <h3>No hay denuncias registradas</h3>
                <p>Usa el formulario para reportar alguna anomalía.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = denuncias.map(d => {
        const fechaFormat = new Date(d.incidentAt || d.createdAt).toLocaleString("es-MX", {
            dateStyle: "short",
            timeStyle: "short"
        });

        return `
            <article class="denuncia-card-item">
                <span class="item-badge-tipo">${API.escaparHTML(d.type)}</span>
                <div class="item-tianguis">📍 ${API.escaparHTML(d.marketName)}</div>
                ${d.businessName ? `<div class="item-puesto">🏪 ${API.escaparHTML(d.businessName)}</div>` : ''}
                <div class="item-desc">${API.escaparHTML(d.description)}</div>
                ${d.evidence ? `<div class="item-evidencia"><img src="${API.escaparHTML(d.evidence)}" alt="Evidencia"></div>` : ''}
                <div class="item-meta">
                    <span>👤 ${API.escaparHTML(d.reporter || 'Anónimo')}</span>
                    <span>📅 ${fechaFormat}</span>
                </div>
            </article>
        `;
    }).join("");
}

// Descarga en formato JSON
function exportJSONFile() {
    const denuncias = getStoredDenuncias();
    const jsonStr = JSON.stringify(denuncias, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `denuncias_tianguis_cdmx_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await API.ready;
    } catch (error) {
        document.getElementById("denunciasGrid").textContent =
            `No se pudieron cargar las denuncias: ${error.message}`;
        return;
    }

    const menuButton = document.getElementById("menuButton");
    const sideMenu = document.getElementById("sideMenu");
    const denunciaForm = document.getElementById("denunciaForm");
    const evidenciaFoto = document.getElementById("evidenciaFoto");
    const previewContainer = document.getElementById("previewContainer");
    const imgPreview = document.getElementById("imgPreview");
    const btnRemoveImg = document.getElementById("btnRemoveImg");
    const btnExportJSON = document.getElementById("btnExportJSON");
    const marketSelect = document.getElementById("tianguisObj");

    marketSelect.replaceChildren(new Option("Selecciona la ubicación...", "", true, true));
    API.obtenerTabla("markets").forEach(mercado => {
        marketSelect.appendChild(new Option(mercado.name, mercado.id));
    });

    const businessInput = document.getElementById("nombrePuesto");
    const businessSuggestions = document.getElementById("businessSuggestions");
    const businesses = API.obtenerTabla("businesses");
    const updateBusinessSuggestions = () => {
        businessSuggestions.replaceChildren();
        businesses
            .filter(negocio => negocio.marketId === marketSelect.value)
            .forEach(negocio => {
                const option = document.createElement("option");
                option.value = negocio.name;
                businessSuggestions.appendChild(option);
            });
    };
    marketSelect.addEventListener("change", updateBusinessSuggestions);

    renderMenuByRole();
    renderDenuncias();

    menuButton.addEventListener("click", () => {
        const open = sideMenu.classList.toggle("open");
        sideMenu.setAttribute("aria-hidden", String(!open));
    });

    // Vista previa de imagen subida
    evidenciaFoto.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                uploadedBase64 = evt.target.result;
                imgPreview.src = uploadedBase64;
                previewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    btnRemoveImg.addEventListener("click", () => {
        uploadedBase64 = null;
        evidenciaFoto.value = "";
        previewContainer.classList.add("hidden");
    });

    // Guardar Denuncia
    denunciaForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const tipo = document.getElementById("tipoDenuncia").value;
        const marketId = document.getElementById("tianguisObj").value;
        const mercado = API.obtenerTabla("markets").find(item => item.id === marketId);
        const puesto = document.getElementById("nombrePuesto").value.trim();
        const fechaIncidente = document.getElementById("fechaIncidente").value;
        const descripcion = document.getElementById("descripcion").value.trim();
        const denunciante = document.getElementById("nombreDenunciante").value.trim() || "Anónimo";
        const contacto = document.getElementById("contactoDenunciante").value.trim() || "N/A";

        const newDenuncia = {
            id: "den_" + Date.now(),
            type: tipo,
            marketId,
            marketName: mercado?.name || "",
            businessId: businesses.find(negocio =>
                negocio.marketId === marketId &&
                negocio.name.trim().toLocaleLowerCase("es") === puesto.toLocaleLowerCase("es")
            )?.id || "",
            businessName: puesto || "No especificado",
            incidentAt: fechaIncidente,
            createdAt: new Date().toISOString(),
            description: descripcion,
            reporter: denunciante,
            reporterContact: contacto,
            evidence: uploadedBase64
        };

        const currentDenuncias = getStoredDenuncias();
        currentDenuncias.unshift(newDenuncia);
        saveDenuncias(currentDenuncias);

        alert("🚨 Denuncia registrada correctamente en el sistema.");

        // Resetear formulario
        denunciaForm.reset();
        uploadedBase64 = null;
        previewContainer.classList.add("hidden");
        updateBusinessSuggestions();

        renderDenuncias();
    });

    // Botón para exportar JSON
    btnExportJSON.addEventListener("click", exportJSONFile);
});