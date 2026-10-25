/* Valida y guarda el formulario público de registro. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const form = document.getElementById("businessForm");
    const map = document.getElementById("locationMap");
    const pin = document.getElementById("locationPin");
    const locationStatus = document.getElementById("locationStatus");
    const formMessage = document.getElementById("formMessage");
    const successMessage = document.getElementById("successMessage");

    let posicion = null;

    function mostrarMensaje(elemento, texto, esError = false) {
        elemento.textContent = texto;
        elemento.classList.remove("hidden");
        elemento.classList.toggle("error", esError);
    }

    function seleccionarPunto(evento) {
        const rectangulo = map.getBoundingClientRect();
        const x = Math.max(3, Math.min(97, ((evento.clientX - rectangulo.left) / rectangulo.width) * 100));
        const y = Math.max(8, Math.min(88, ((evento.clientY - rectangulo.top) / rectangulo.height) * 100));

        posicion = { x, y };
        pin.style.left = `${x}%`;
        pin.style.top = `${y}%`;
        pin.classList.add("visible");
        locationStatus.textContent = "Punto seleccionado en el mapa esquemático.";
    }

    map.addEventListener("click", seleccionarPunto);
    map.addEventListener("keydown", evento => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            const rectangulo = map.getBoundingClientRect();
            seleccionarPunto({
                clientX: rectangulo.left + rectangulo.width / 2,
                clientY: rectangulo.top + rectangulo.height / 2
            });
        }
    });

    function leerArchivoComoDataURL(archivo) {
        return new Promise((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver(String(lector.result));
            lector.onerror = () => rechazar(new Error(`No se pudo leer ${archivo.name}.`));
            lector.readAsDataURL(archivo);
        });
    }

    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        formMessage.classList.add("hidden");
        successMessage.classList.add("hidden");

        const dias = [...form.querySelectorAll('input[name="days"]:checked')]
            .map(casilla => casilla.value);
        const apertura = form.elements.openingTime.value;
        const cierre = form.elements.closingTime.value;
        const archivos = [...form.elements.photos.files];

        if (!posicion) {
            mostrarMensaje(formMessage, "Selecciona la ubicación del negocio en el mapa.", true);
            map.focus();
            return;
        }

        if (!dias.length || !apertura || !cierre || cierre <= apertura) {
            mostrarMensaje(formMessage, "Selecciona al menos un día y un horario válido.", true);
            return;
        }

        if (archivos.length > 3) {
            mostrarMensaje(formMessage, "Puedes agregar hasta 3 fotografías.", true);
            return;
        }

        if (archivos.some(archivo => archivo.size > 350 * 1024)) {
            mostrarMensaje(formMessage, "Cada fotografía debe pesar 350 KB o menos.", true);
            return;
        }

        const metodo = form.elements.contactMethod.value;
        const contacto = form.elements.contactValue.value.trim();
        const autorizaContacto = form.elements.shareContact.checked;

        if (autorizaContacto && (!metodo || !contacto)) {
            mostrarMensaje(formMessage, "Para publicar el contacto, indica el medio y el dato.", true);
            return;
        }

        if (!autorizaContacto && (metodo || contacto)) {
            // Los datos no autorizados no se guardan ni se muestran.
        }

        try {
            const fotos = await Promise.all(archivos.map(leerArchivoComoDataURL));
            const sesion = JSON.parse(localStorage.getItem("tianguis_session") || "null");
            const cuentaVendedora = sesion?.role === "vendedor"
                ? API.normalizarNombreUsuario(sesion.username)
                : "";

            const codigoVinculacion = cuentaVendedora
                ? ""
                : Math.random().toString(36).slice(2, 8).toUpperCase();

            const negocio = {
                id: API.crearId(),
                name: form.elements.businessName.value.trim(),
                category: form.elements.category.value,
                location: form.elements.location.value.trim(),
                days: dias,
                openingTime: apertura,
                closingTime: cierre,
                schedule: "",
                description: form.elements.description.value.trim(),
                parking: form.elements.parking.value,
                photos: fotos,
                contact: {
                    method: autorizaContacto ? metodo : "",
                    value: autorizaContacto ? contacto : "",
                    share: autorizaContacto
                },
                ownerUsername: cuentaVendedora,
                claimCode: codigoVinculacion,
                x: posicion.x,
                y: posicion.y,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            API.guardarNegocio(negocio);
            form.reset();
            posicion = null;
            pin.classList.remove("visible");
            locationStatus.textContent = "Aún no seleccionas el punto.";

            successMessage.innerHTML = `
                <h2>Negocio registrado</h2>
                <p>Ya aparece en el mapa de este navegador.</p>
                <p><a href="negocio.html?id=${encodeURIComponent(negocio.id)}">Ver los detalles del negocio</a></p>
                ${codigoVinculacion
                    ? `<p><strong>Guarda este código para vincular el negocio con una cuenta de comerciante:</strong></p>
                       <p><code>${API.escaparHTML(codigoVinculacion)}</code></p>
                       <p>El código solo sirve como vínculo en este prototipo local.</p>`
                    : "<p>El negocio quedó asociado a la cuenta de comerciante con sesión activa.</p>"}
            `;
            successMessage.classList.remove("hidden");
        } catch (error) {
            mostrarMensaje(
                formMessage,
                `No se pudo guardar el negocio. Revisa el espacio disponible del navegador. ${error.message}`,
                true
            );
        }
    });
})();
