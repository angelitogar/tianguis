/* Panel de edición: solo muestra negocios vinculados a la cuenta comerciante. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const SESION_KEY = "tianguis_session";
    const diasValidos = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

    const accessMessage = document.getElementById("accessMessage");
    const accessTitle = document.getElementById("accessTitle");
    const accessDescription = document.getElementById("accessDescription");
    const accessLink = document.getElementById("accessLink");
    const localContent = document.getElementById("localContent");
    const claimPanel = document.getElementById("claimPanel");
    const claimForm = document.getElementById("claimForm");
    const claimMessage = document.getElementById("claimMessage");
    const businessEditor = document.getElementById("businessEditor");
    const localForm = document.getElementById("localForm");
    const formMessage = document.getElementById("formMessage");
    const pageMessage = document.getElementById("pageMessage");
    const editMap = document.getElementById("editLocationMap");
    const editPin = document.getElementById("editLocationPin");
    const editMapStatus = document.getElementById("editLocationStatus");

    let usuario = null;
    let negocioActual = null;
    let posicion = null;

    function mensaje(elemento, texto, error = false) {
        elemento.textContent = texto;
        elemento.classList.toggle("error", error);
        elemento.classList.remove("hidden");
    }

    function mostrarAcceso(titulo, descripcion, textoEnlace, destino) {
        accessTitle.textContent = titulo;
        accessDescription.textContent = descripcion;
        accessLink.textContent = textoEnlace;
        accessLink.href = destino;
        accessMessage.classList.remove("hidden");
        localContent.classList.add("hidden");
    }

    function leerSesion() {
        const raw = localStorage.getItem(SESION_KEY);
        if (!raw) return null;

        const sesion = JSON.parse(raw);
        if (!sesion || typeof sesion.username !== "string" || typeof sesion.role !== "string") {
            throw new Error("La sesión guardada no es válida.");
        }

        return sesion;
    }

    function seleccionarPunto(evento) {
        const rectangulo = editMap.getBoundingClientRect();
        const x = Math.max(3, Math.min(97, ((evento.clientX - rectangulo.left) / rectangulo.width) * 100));
        const y = Math.max(8, Math.min(88, ((evento.clientY - rectangulo.top) / rectangulo.height) * 100));

        posicion = { x, y };
        editPin.style.left = `${x}%`;
        editPin.style.top = `${y}%`;
        editPin.classList.add("visible");
        editMapStatus.textContent = "Punto del negocio seleccionado.";
    }

    editMap.addEventListener("click", seleccionarPunto);
    editMap.addEventListener("keydown", evento => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            const rectangulo = editMap.getBoundingClientRect();
            seleccionarPunto({
                clientX: rectangulo.left + rectangulo.width / 2,
                clientY: rectangulo.top + rectangulo.height / 2
            });
        }
    });

    function mostrarNegocio() {
        if (!negocioActual) return;

        document.getElementById("summaryTitle").textContent = negocioActual.name;
        document.getElementById("summaryDescription").textContent = negocioActual.description || "";
        document.getElementById("businessName").value = negocioActual.name;
        document.getElementById("category").value = negocioActual.category;
        document.getElementById("location").value = negocioActual.location;
        document.getElementById("description").value = negocioActual.description || "";
        document.getElementById("parking").value = negocioActual.parking || "";
        document.getElementById("openingTime").value = negocioActual.openingTime || "";
        document.getElementById("closingTime").value = negocioActual.closingTime || "";
        document.getElementById("contactMethod").value = negocioActual.contact?.method || "";
        document.getElementById("contactValue").value = negocioActual.contact?.value || "";
        document.getElementById("shareContact").checked = Boolean(negocioActual.contact?.share);

        localForm.querySelectorAll('input[name="days"]').forEach(casilla => {
            casilla.checked = Array.isArray(negocioActual.days)
                && negocioActual.days.includes(casilla.value);
        });

        posicion = Number.isFinite(negocioActual.x) && Number.isFinite(negocioActual.y)
            ? { x: negocioActual.x, y: negocioActual.y }
            : null;

        if (posicion) {
            editPin.style.left = `${posicion.x}%`;
            editPin.style.top = `${posicion.y}%`;
            editPin.classList.add("visible");
            editMapStatus.textContent = "Punto actual del negocio. Haz clic para cambiarlo.";
        } else {
            editPin.classList.remove("visible");
            editMapStatus.textContent = "Selecciona un punto para mostrar el negocio en el mapa.";
        }

        const detalles = document.getElementById("localDetails");
        detalles.replaceChildren();

        const datos = [
            ["Categoría", API.etiquetaCategoria(negocioActual.category)],
            ["Ubicación", negocioActual.location],
            ["Horario", API.textoHorario(negocioActual)],
            ["Estacionamiento", negocioActual.parking],
            ["Contacto", negocioActual.contact?.share
                ? `${negocioActual.contact.method}: ${negocioActual.contact.value}`
                : ""]
        ];

        datos.filter(([, valor]) => valor).forEach(([etiqueta, valor]) => {
            const termino = document.createElement("dt");
            const descripcion = document.createElement("dd");
            termino.textContent = etiqueta;
            descripcion.textContent = valor;
            detalles.append(termino, descripcion);
        });

        const galeria = document.getElementById("photoGallery");
        galeria.innerHTML = (negocioActual.photos || []).map(foto =>
            `<img src="${API.escaparHTML(foto)}" alt="Foto de ${API.escaparHTML(negocioActual.name)}">`
        ).join("");

        document.getElementById("publicDetailsLink").href =
            `negocio.html?id=${encodeURIComponent(negocioActual.id)}`;
        document.getElementById("ratingsLink").href =
            `valoraciones.html?id=${encodeURIComponent(negocioActual.id)}`;

        businessEditor.classList.remove("hidden");
    }

    function buscarNegocioPropio() {
        const usuarioNormalizado = API.normalizarNombreUsuario(usuario.username);
        return API.obtenerNegocios().find(
            negocio => API.normalizarNombreUsuario(negocio.ownerUsername) === usuarioNormalizado
        ) || null;
    }

    function inicializar() {
        try {
            usuario = leerSesion();
        } catch (error) {
            mostrarAcceso("No se pudo validar tu sesión", error.message, "Volver al mapa", "index.html");
            return;
        }

        if (!usuario) {
            mostrarAcceso("Inicia sesión", "Necesitas una cuenta de comerciante para editar un negocio.", "Iniciar sesión", "login.html");
            return;
        }

        if (usuario.role !== "vendedor" || !usuario.username.trim()) {
            mostrarAcceso("Sección para comerciantes", "Solo una cuenta con rol de comerciante puede editar negocios.", "Volver al mapa", "index.html");
            return;
        }

        localContent.classList.remove("hidden");
        negocioActual = buscarNegocioPropio();

        if (negocioActual) {
            mostrarNegocio();
        } else {
            claimPanel.classList.remove("hidden");
        }
    }

    claimForm.addEventListener("submit", evento => {
        evento.preventDefault();
        claimMessage.classList.add("hidden");

        const codigo = document.getElementById("claimCodeInput").value.trim().toUpperCase();
        const negocio = API.obtenerNegocios().find(
            item => !item.ownerUsername && item.claimCode
                && item.claimCode.toUpperCase() === codigo
        );

        if (!negocio) {
            mensaje(claimMessage, "No se encontró un negocio disponible con ese código.", true);
            return;
        }

        negocio.ownerUsername = API.normalizarNombreUsuario(usuario.username);
        negocio.claimCode = "";
        negocio.updatedAt = new Date().toISOString();
        API.guardarNegocio(negocio);

        negocioActual = negocio;
        claimPanel.classList.add("hidden");
        mostrarNegocio();
        mensaje(pageMessage, "El negocio quedó vinculado a esta cuenta.");
    });

    function leerFoto(archivo) {
        return new Promise((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver(String(lector.result));
            lector.onerror = () => rechazar(new Error(`No se pudo leer ${archivo.name}.`));
            lector.readAsDataURL(archivo);
        });
    }

    localForm.addEventListener("submit", async evento => {
        evento.preventDefault();
        formMessage.classList.add("hidden");

        const dias = [...localForm.querySelectorAll('input[name="days"]:checked')]
            .map(casilla => casilla.value);
        const apertura = document.getElementById("openingTime").value;
        const cierre = document.getElementById("closingTime").value;
        const archivos = [...document.getElementById("photos").files];

        if (!dias.length || !apertura || !cierre || cierre <= apertura) {
            mensaje(formMessage, "Completa los días y un horario válido.", true);
            return;
        }

        if (dias.some(dia => !diasValidos.includes(dia))) {
            mensaje(formMessage, "Hay un día seleccionado que no es válido.", true);
            return;
        }

        if (!posicion) {
            mensaje(formMessage, "Selecciona un punto del negocio en el mapa.", true);
            return;
        }

        if (archivos.length > 3 || archivos.some(archivo => archivo.size > 350 * 1024)) {
            mensaje(formMessage, "Selecciona hasta 3 fotos de 350 KB o menos cada una.", true);
            return;
        }

        const metodo = document.getElementById("contactMethod").value;
        const contacto = document.getElementById("contactValue").value.trim();
        const compartir = document.getElementById("shareContact").checked;

        if (compartir && (!metodo || !contacto)) {
            mensaje(formMessage, "Completa el contacto y el medio antes de autorizar que se publique.", true);
            return;
        }

        try {
            const fotosNuevas = archivos.length
                ? await Promise.all(archivos.map(leerFoto))
                : negocioActual.photos;

            negocioActual = {
                ...negocioActual,
                name: document.getElementById("businessName").value.trim(),
                category: document.getElementById("category").value,
                location: document.getElementById("location").value.trim(),
                days,
                openingTime: apertura,
                closingTime: cierre,
                schedule: "",
                description: document.getElementById("description").value.trim(),
                parking: document.getElementById("parking").value,
                photos: fotosNuevas,
                contact: {
                    method: compartir ? metodo : "",
                    value: compartir ? contacto : "",
                    share: compartir
                },
                x: posicion.x,
                y: posicion.y,
                updatedAt: new Date().toISOString()
            };

            API.guardarNegocio(negocioActual);
            mostrarNegocio();
            mensaje(formMessage, "Los cambios se guardaron en este navegador.");
            mensaje(pageMessage, "Información actualizada. Las valoraciones se conservaron.");
        } catch (error) {
            mensaje(formMessage, `No se pudieron guardar los cambios: ${error.message}`, true);
        }
    });

    inicializar();
})();
