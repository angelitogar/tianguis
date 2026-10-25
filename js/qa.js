/*
 * Controla la búsqueda y el filtro de preguntas frecuentes.
 * El contenido de las respuestas está escrito en qa.html.
 */

(() => {
    "use strict";

    const buscador = document.getElementById("buscarPregunta");
    const filtro = document.getElementById("filtroPreguntas");
    const botonLimpiar = document.getElementById("limpiarBusqueda");
    const estado = document.getElementById("estadoPreguntas");
    const mensajeVacio = document.getElementById("sinResultados");
    const preguntas = [...document.querySelectorAll(".qa-item")];

    /*
     * Normaliza el texto para que la búsqueda ignore mayúsculas y acentos.
     */
    function normalizar(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("es")
            .trim();
    }

    /*
     * Muestra solo las preguntas que coinciden con el texto y el tema.
     */
    function filtrarPreguntas() {
        const consulta = normalizar(buscador.value);
        const categoriaSeleccionada = filtro.value;
        let cantidadVisible = 0;

        preguntas.forEach(pregunta => {
            const textoPregunta = normalizar(pregunta.textContent);
            const categoriaPregunta = pregunta.dataset.categoria;

            const coincideTexto =
                consulta === "" || textoPregunta.includes(consulta);

            const coincideCategoria =
                categoriaSeleccionada === "todos" ||
                categoriaPregunta === categoriaSeleccionada;

            const visible = coincideTexto && coincideCategoria;
            pregunta.hidden = !visible;

            if (!visible) {
                pregunta.open = false;
            } else {
                cantidadVisible++;
            }
        });

        mensajeVacio.hidden = cantidadVisible > 0;

        estado.textContent = cantidadVisible === 1
            ? "Se muestra 1 pregunta."
            : `Se muestran ${cantidadVisible} preguntas.`;
    }

    buscador.addEventListener("input", filtrarPreguntas);
    filtro.addEventListener("change", filtrarPreguntas);

    /*
     * Restablece la búsqueda y el filtro para mostrar todas las preguntas.
     */
    botonLimpiar.addEventListener("click", () => {
        buscador.value = "";
        filtro.value = "todos";
        filtrarPreguntas();
        buscador.focus();
    });

    /*
     * Mantiene abierta solo una respuesta a la vez.
     */
    preguntas.forEach(pregunta => {
        pregunta.addEventListener("toggle", () => {
            if (pregunta.open && !pregunta.hidden) {
                preguntas.forEach(otraPregunta => {
                    if (otraPregunta !== pregunta) {
                        otraPregunta.open = false;
                    }
                });
            }
        });
    });

    // Muestra el número inicial de preguntas disponibles.
    filtrarPreguntas();
})();
