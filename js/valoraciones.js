/* Registra una valoración asociada al identificador estable del negocio. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const select = document.getElementById("businessSelect");
    const formulario = document.getElementById("ratingForm");
    const lista = document.getElementById("reviews");
    const mensaje = document.getElementById("ratingMessage");
    const idInicial = new URLSearchParams(location.search).get("id");

    function cargarNegocios() {
        const negocios = API.obtenerTodosLosNegocios();

        select.innerHTML = negocios.map(negocio =>
            `<option value="${API.escaparHTML(negocio.id)}">${API.escaparHTML(negocio.name)}</option>`
        ).join("");

        if (idInicial && negocios.some(negocio => negocio.id === idInicial)) {
            select.value = idInicial;
        }
    }

    function renderizarValoraciones() {
        const idNegocio = select.value;
        const resumen = API.obtenerResumenValoraciones(idNegocio);
        const valoraciones = API.obtenerValoraciones(idNegocio);
        const propia = API.obtenerValoracionDelVisitante(idNegocio);

        lista.innerHTML = `
            <h2>Opiniones del negocio</h2>
            <p>${resumen.total
                ? `Promedio: ★ ${resumen.promedio.toFixed(1)} de 5 · ${resumen.total} valoración(es)`
                : "Este negocio todavía no tiene valoraciones."}</p>
            ${valoraciones.length
                ? valoraciones.slice().reverse().map(valoracion => `
                    <article class="rating-card">
                        <strong>★ ${valoracion.stars}/5</strong>
                        ${valoracion.author ? `<span> · ${API.escaparHTML(valoracion.author)}</span>` : ""}
                        ${valoracion.comment ? `<p>${API.escaparHTML(valoracion.comment)}</p>` : ""}
                    </article>
                `).join("")
                : ""}
        `;

        formulario.reset();

        if (propia) {
            const estrella = formulario.querySelector(`input[name="stars"][value="${propia.stars}"]`);
            if (estrella) estrella.checked = true;
            document.getElementById("author").value = propia.author || "";
            document.getElementById("comment").value = propia.comment || "";
        }
    }

    select.addEventListener("change", renderizarValoraciones);

    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        mensaje.classList.add("hidden");

        const estrellas = formulario.querySelector('input[name="stars"]:checked')?.value;
        if (!estrellas) {
            mensaje.textContent = "Selecciona de 1 a 5 estrellas.";
            mensaje.classList.add("error");
            mensaje.classList.remove("hidden");
            return;
        }

        try {
            API.guardarValoracion(
                select.value,
                estrellas,
                document.getElementById("comment").value,
                document.getElementById("author").value
            );

            mensaje.textContent = "La valoración se guardó en este navegador.";
            mensaje.classList.remove("error");
            mensaje.classList.remove("hidden");
            renderizarValoraciones();
        } catch (error) {
            mensaje.textContent = error.message;
            mensaje.classList.add("error");
            mensaje.classList.remove("hidden");
        }
    });

    cargarNegocios();
    renderizarValoraciones();
})();
