/*
 * Controla el formulario de registro de negocios.
 *
 * No solicita una cuenta. En esta versión, los datos se guardan en
 * localStorage y solo están disponibles en el mismo navegador.
 */

(() => {
    "use strict";

    const CLAVE_NEGOCIOS = "tianguis_negocios_registrados";
    const MAXIMO_FOTOS = 3;
    const MAXIMO_PESO_FOTO = 8 * 1024 * 1024;

    const formulario = document.getElementById("formularioNegocio");
    const campoDescripcion = document.getElementById("descripcionNegocio");
    const contadorDescripcion = document.getElementById("contadorDescripcion");
    const campoFotos = document.getElementById("fotosNegocio");
    const vistaFotos = document.getElementById("vistaFotos");
    const mensajeRegistro = document.getElementById("mensajeRegistro");
    const errorHorario = document.getElementById("errorHorario");
    const botonEnviar = document.getElementById("botonEnviar");

    const medioContacto = document.getElementById("medioContacto");
    const datoContacto = document.getElementById("datoContacto");
    const etiquetaContacto = document.getElementById("etiquetaContacto");
    const autorizaContacto = document.getElementById("autorizaContacto");

    let direccionesTemporalesFotos = [];

    /*
     * Lee los registros existentes en este navegador.
     * Si el contenido está dañado, informa del problema y devuelve una lista vacía.
     */
    function leerNegocios() {
        try {
            const contenido = localStorage.getItem(CLAVE_NEGOCIOS);
            const negocios = contenido ? JSON.parse(contenido) : [];

            return Array.isArray(negocios) ? negocios : [];
        } catch {
            mostrarMensaje(
                "No se pudieron leer los registros guardados en este navegador.",
                true
            );
            return [];
        }
    }

    /*
     * Muestra un aviso debajo del formulario.
     */
    function mostrarMensaje(texto, esError = false) {
        mensajeRegistro.textContent = texto;
        mensajeRegistro.classList.toggle("error", esError);
    }

    /*
     * Actualiza el contador de la descripción opcional.
     */
    campoDescripcion.addEventListener("input", () => {
        contadorDescripcion.textContent =
            `${campoDescripcion.value.length} de 240 caracteres`;
    });

    /*
     * Cambia el campo de contacto según el medio seleccionado.
     * Si no se selecciona un medio, el contacto queda desactivado y opcional.
     */
    function actualizarCampoContacto() {
        const medio = medioContacto.value;

        datoContacto.disabled = !medio;
        datoContacto.required = Boolean(medio);
        datoContacto.value = "";

        if (medio === "whatsapp") {
            etiquetaContacto.textContent = "Número de WhatsApp";
            datoContacto.type = "tel";
            datoContacto.placeholder = "+52 55 1234 5678";
        } else if (medio === "llamada") {
            etiquetaContacto.textContent = "Número de teléfono";
            datoContacto.type = "tel";
            datoContacto.placeholder = "Ej. 55 1234 5678";
        } else if (medio === "correo") {
            etiquetaContacto.textContent = "Correo electrónico";
            datoContacto.type = "email";
            datoContacto.placeholder = "Ej. negocio@correo.com";
        } else {
            etiquetaContacto.textContent = "Elige primero un medio de contacto";
            datoContacto.type = "text";
            datoContacto.placeholder = "Campo opcional";
            autorizaContacto.checked = false;
        }
    }

    medioContacto.addEventListener("change", actualizarCampoContacto);

    /*
     * Comprueba que las fotos sean imágenes, no superen el tamaño permitido
     * y que no haya más de tres.
     */
    function validarFotos(archivos) {
        if (archivos.length > MAXIMO_FOTOS) {
            throw new Error("Puedes seleccionar hasta 3 fotos.");
        }

        for (const archivo of archivos) {
            if (!archivo.type.startsWith("image/")) {
                throw new Error("Selecciona archivos de imagen.");
            }

            if (archivo.size > MAXIMO_PESO_FOTO) {
                throw new Error("Cada foto debe pesar menos de 8 MB.");
            }
        }
    }

    /*
     * Libera las direcciones temporales usadas por las vistas previas.
     */
    function limpiarVistasFotos() {
        direccionesTemporalesFotos.forEach(direccion => {
            URL.revokeObjectURL(direccion);
        });

        direccionesTemporalesFotos = [];
        vistaFotos.replaceChildren();
    }

    /*
     * Muestra una vista previa por cada foto seleccionada.
     */
    campoFotos.addEventListener("change", () => {
        limpiarVistasFotos();
        mostrarMensaje("");

        const archivos = [...campoFotos.files];

        try {
            validarFotos(archivos);
        } catch (error) {
            campoFotos.value = "";
            mostrarMensaje(error.message, true);
            return;
        }

        archivos.forEach(archivo => {
            const imagen = document.createElement("img");
            const direccion = URL.createObjectURL(archivo);

            direccionesTemporalesFotos.push(direccion);
            imagen.className = "fotoSeleccionada";
            imagen.alt = `Vista previa: ${archivo.name}`;
            imagen.src = direccion;

            vistaFotos.appendChild(imagen);
        });
    });

    /*
     * Reduce el tamaño de una imagen para poder guardarla como parte
     * de los datos de demostración en el navegador.
     */
    function comprimirFoto(archivo) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();

            lector.onerror = () => {
                reject(new Error("No se pudo leer una de las fotos."));
            };

            lector.onload = () => {
                const imagen = new Image();

                imagen.onerror = () => {
                    reject(new Error("Una de las fotos no se pudo procesar."));
                };

                imagen.onload = () => {
                    const limite = 1200;
                    const escala = Math.min(
                        1,
                        limite / Math.max(imagen.width, imagen.height)
                    );

                    const lienzo = document.createElement("canvas");
                    lienzo.width = Math.max(
                        1,
                        Math.round(imagen.width * escala)
                    );
                    lienzo.height = Math.max(
                        1,
                        Math.round(imagen.height * escala)
                    );

                    const contexto = lienzo.getContext("2d");

                    if (!contexto) {
                        reject(new Error("El navegador no pudo procesar la foto."));
                        return;
                    }

                    contexto.drawImage(
                        imagen,
                        0,
                        0,
                        lienzo.width,
                        lienzo.height
                    );

                    lienzo.toBlob(blob => {
                        if (!blob) {
                            reject(new Error("No se pudo comprimir una foto."));
                            return;
                        }

                        const lectorBlob = new FileReader();

                        lectorBlob.onerror = () => {
                            reject(new Error("No se pudo preparar una foto."));
                        };

                        lectorBlob.onload = () => {
                            resolve({
                                nombre: archivo.name,
                                contenido: lectorBlob.result
                            });
                        };

                        lectorBlob.readAsDataURL(blob);
                    }, "image/jpeg", 0.75);
                };

                imagen.src = lector.result;
            };

            lector.readAsDataURL(archivo);
        });
    }

    /*
     * Valida que se haya elegido al menos un día y que el horario
     * de cierre sea posterior al de apertura.
     */
    function validarHorario() {
        const dias = [
            ...formulario.querySelectorAll('input[name="dias"]:checked')
        ];

        const apertura = document.getElementById("horaApertura").value;
        const cierre = document.getElementById("horaCierre").value;

        if (dias.length === 0) {
            errorHorario.textContent =
                "Selecciona al menos un día de atención.";
            return false;
        }

        if (!apertura || !cierre) {
            errorHorario.textContent =
                "Escribe la hora de apertura y la hora de cierre.";
            return false;
        }

        if (cierre <= apertura) {
            errorHorario.textContent =
                "La hora de cierre debe ser posterior a la hora de apertura.";
            return false;
        }

        errorHorario.textContent = "";
        return true;
    }

    /*
     * Procesa el envío y guarda el negocio en localStorage.
     * El contacto solo se guarda si se eligió un medio y se autorizó publicarlo.
     */
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        mostrarMensaje("");

        if (!formulario.reportValidity()) {
            return;
        }

        if (!validarHorario()) {
            return;
        }

        const medio = medioContacto.value;
        const dato = datoContacto.value.trim();

        if (medio && !autorizaContacto.checked) {
            mostrarMensaje(
                "Para compartir el contacto, marca la casilla de autorización.",
                true
            );
            autorizaContacto.focus();
            return;
        }

        if (
            ["whatsapp", "llamada"].includes(medio) &&
            !/^\d{8,15}$/.test(dato.replace(/\D/g, ""))
        ) {
            mostrarMensaje(
                "Escribe un teléfono válido de entre 8 y 15 dígitos. Para WhatsApp, incluye la clave internacional.",
                true
            );
            datoContacto.focus();
            return;
        }

        const archivos = [...campoFotos.files];

        try {
            validarFotos(archivos);
        } catch (error) {
            mostrarMensaje(error.message, true);
            return;
        }

        const dias = [
            ...formulario.querySelectorAll('input[name="dias"]:checked')
        ].map(casilla => casilla.value);

        botonEnviar.disabled = true;
        botonEnviar.textContent = "Guardando…";

        try {
            const fotos = await Promise.all(
                archivos.map(comprimirFoto)
            );

            const registro = {
                id: `${Date.now()}-${Math.random()}`,
                nombre: document.getElementById("nombreNegocio").value.trim(),
                tipo: document.getElementById("tipoNegocio").value,
                categoria: document.getElementById("categoriaNegocio").value,
                nombreTianguis: document
                    .getElementById("nombreTianguis")
                    .value.trim(),
                descripcion: campoDescripcion.value.trim(),
                contacto: medio
                    ? {
                        medio,
                        dato,
                        autorizadoParaPublicar: autorizaContacto.checked
                    }
                    : null,
                saturacion: document
                    .getElementById("saturacionNegocio")
                    .value,
                estacionamiento: document
                    .getElementById("estacionamiento")
                    .value,
                ubicacion: document
                    .getElementById("ubicacionNegocio")
                    .value.trim(),
                horario: {
                    dias,
                    apertura: document.getElementById("horaApertura").value,
                    cierre: document.getElementById("horaCierre").value
                },
                fotos,
                fechaRegistro: new Date().toISOString()
            };

            const registros = leerNegocios();
            registros.push(registro);

            localStorage.setItem(
                CLAVE_NEGOCIOS,
                JSON.stringify(registros)
            );

            mostrarMensaje(
                "Registro guardado en este navegador. Para que otras personas lo vean, el proyecto necesita conectarse a un servidor."
            );

            formulario.reset();
            limpiarVistasFotos();
            actualizarCampoContacto();

            contadorDescripcion.textContent = "0 de 240 caracteres";
            errorHorario.textContent = "";
        } catch (error) {
            mostrarMensaje(
                error.message ||
                    "No se pudo guardar. Prueba quitando algunas fotos y vuelve a intentarlo.",
                true
            );
        } finally {
            botonEnviar.disabled = false;
            botonEnviar.textContent = "Registrar negocio";
        }
    });

    // Deja el campo de contacto en su estado inicial al abrir la página.
    actualizarCampoContacto();
})();
