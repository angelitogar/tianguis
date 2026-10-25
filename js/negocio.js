/* Muestra la ficha pública de un negocio y sus valoraciones. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const panel = document.getElementById("businessDetails");
    const id = new URLSearchParams(location.search).get("id");

    function renderizar() {
        try {
            const negocio = API.buscarNegocio(id);

            if (!negocio) {
                panel.innerHTML = "<h1>No se encontró el negocio</h1><p>Vuelve al mapa para elegir otro.</p>";
                return;
            }

            const resumen = API.obtenerResumenValoraciones(negocio.id);
            const valoraciones = API.obtenerValoraciones(negocio.id);
            const horario = API.textoHorario(negocio);
            const contacto = negocio.contact?.share && negocio.contact.value
                ? `${API.escaparHTML(negocio.contact.method)}: ${API.escaparHTML(negocio.contact.value)}`
                : "";

            const fotos = (negocio.photos || []).map(foto =>
                `<img src="${API.escaparHTML(foto)}" alt="Foto de ${API.escaparHTML(negocio.name)}">`
            ).join("");

            const opiniones = valoraciones.length
                ? valoraciones.slice().reverse().map(valoracion => `
                    <article class="rating-card">
                        <strong>★ ${valoracion.stars}/5</strong>
                        ${valoracion.author ? `<span> · ${API.escaparHTML(valoracion.author)}</span>` : ""}
                        ${valoracion.comment ? `<p>${API.escaparHTML(valoracion.comment)}</p>` : ""}
                    </article>
                `).join("")
                : "<p>Aún no hay valoraciones.</p>";

            panel.innerHTML = `
                <p class="eyebrow">${API.escaparHTML(API.etiquetaCategoria(negocio.category))}</p>
                <h1>${API.escaparHTML(negocio.name)}</h1>
                <p class="popup-rating">${resumen.total
                    ? `★ ${resumen.promedio.toFixed(1)} · ${resumen.total} valoración(es)`
                    : "Sin valoraciones"}</p>
                ${negocio.description ? `<p>${API.escaparHTML(negocio.description)}</p>` : ""}
                <dl class="business-details-list">
                    ${negocio.location ? `<dt>Ubicación</dt><dd>${API.escaparHTML(negocio.location)}</dd>` : ""}
                    ${horario ? `<dt>Horario</dt><dd>${API.escaparHTML(horario)}</dd>` : ""}
                    ${negocio.parking ? `<dt>Estacionamiento</dt><dd>${API.escaparHTML(negocio.parking)}</dd>` : ""}
                    ${contacto ? `<dt>Contacto</dt><dd>${contacto}</dd>` : ""}
                </dl>
                ${fotos ? `<div class="photo-gallery">${fotos}</div>` : ""}
                <div class="detail-actions">
                    <a class="primary-action" href="valoraciones.html?id=${encodeURIComponent(negocio.id)}">Valorar este negocio</a>
                    <a class="secondary-action" href="index.html">Volver al mapa</a>
                </div>
                <h2>Valoraciones</h2>
                <div>${opiniones}</div>
            `;
        } catch (error) {
            panel.innerHTML = `<h1>No se pudo cargar el negocio</h1><p>${API.escaparHTML(error.message)}</p>`;
        }
    }

    API.ready.then(renderizar).catch(error => {
        panel.textContent = `No se pudo cargar la base de datos: ${error.message}`;
    });
})();
