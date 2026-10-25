const STORAGE_KEY = "tianguis_denuncias";

// Datos iniciales de demostración
const SEED_DENUNCIAS = [
    {
        id: "den_101",
        tipo: "Precios alterados / Cobro indebido",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)",
        puesto: "Puesto de Naranjas y Cítricos",
        fechaIncidente: "2024-02-10T11:30",
        fechaRegistro: "2024-02-10T12:00:00.000Z",
        descripcion: "Cobro de $80 por kilo de naranja cuando el cartel marcaba $40. Al reclamar no quisieron respetar el precio publicado.",
        denunciante: "Anónimo",
        contacto: "N/A",
        evidencia: null
    },
    {
        id: "den_102",
        tipo: "Abuso o invasión de espacio público",
        tianguis: "Tianguis El Salado (Iztapalapa)",
        puesto: "Pasillo Central - Puesto de herramientas",
        fechaIncidente: "2024-02-11T09:15",
        fechaRegistro: "2024-02-11T10:20:00.000Z",
        descripcion: "Colocaron lonas y cajas invadiendo completamente el pasillo de emergencia impidiendo el paso peatonal.",
        denunciante: "Carlos R.",
        contacto: "carlos@email.com",
        evidencia: null
    }
];

let uploadedBase64 = null;

function getStoredDenuncias() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DENUNCIAS));
        return SEED_DENUNCIAS;
    }
    return JSON.parse(data);
}

function saveDenuncias(denuncias) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(denuncias));
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
        const fechaFormat = new Date(d.fechaIncidente || d.fechaRegistro).toLocaleString("es-MX", {
            dateStyle: "short",
            timeStyle: "short"
        });

        return `
            <article class="denuncia-card-item">
                <span class="item-badge-tipo">${d.tipo}</span>
                <div class="item-tianguis">📍 ${d.tianguis}</div>
                ${d.puesto ? `<div class="item-puesto">🏪 ${d.puesto}</div>` : ''}
                <div class="item-desc">${d.descripcion}</div>
                ${d.evidencia ? `<div class="item-evidencia"><img src="${d.evidencia}" alt="Evidencia"></div>` : ''}
                <div class="item-meta">
                    <span>👤 ${d.denunciante || 'Anónimo'}</span>
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

document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menuButton");
    const sideMenu = document.getElementById("sideMenu");
    const denunciaForm = document.getElementById("denunciaForm");
    const evidenciaFoto = document.getElementById("evidenciaFoto");
    const previewContainer = document.getElementById("previewContainer");
    const imgPreview = document.getElementById("imgPreview");
    const btnRemoveImg = document.getElementById("btnRemoveImg");
    const btnExportJSON = document.getElementById("btnExportJSON");

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
        const tianguis = document.getElementById("tianguisObj").value;
        const puesto = document.getElementById("nombrePuesto").value.trim();
        const fechaIncidente = document.getElementById("fechaIncidente").value;
        const descripcion = document.getElementById("descripcion").value.trim();
        const denunciante = document.getElementById("nombreDenunciante").value.trim() || "Anónimo";
        const contacto = document.getElementById("contactoDenunciante").value.trim() || "N/A";

        const newDenuncia = {
            id: "den_" + Date.now(),
            tipo,
            tianguis,
            puesto: puesto || "No especificado",
            fechaIncidente,
            fechaRegistro: new Date().toISOString(),
            descripcion,
            denunciante,
            contacto,
            evidencia: uploadedBase64
        };

        const currentDenuncias = getStoredDenuncias();
        currentDenuncias.unshift(newDenuncia);
        saveDenuncias(currentDenuncias);

        alert("🚨 Denuncia registrada correctamente en el sistema.");

        // Resetear formulario
        denunciaForm.reset();
        uploadedBase64 = null;
        previewContainer.classList.add("hidden");

        renderDenuncias();
    });

    // Botón para exportar JSON
    btnExportJSON.addEventListener("click", exportJSONFile);
});