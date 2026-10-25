/* Funciones compartidas para negocios y valoraciones.
 * Los datos se guardan en este navegador mediante localStorage.
 */
(() => {
    "use strict";

    const CLAVE_NEGOCIOS = "tianguis_negocios_registrados";
    const CLAVE_VALORACIONES = "tianguis_valoraciones_v1";
    const CLAVE_VISITANTE = "tianguis_visitante_v1";

    const DEMOSTRACION = [
        {
            id: "demo-antojitos-lupita",
            name: "Antojitos Lupita",
            category: "comida-preparada",
            location: "Ubicación de demostración",
            schedule: "",
            description: "",
            parking: "",
            photos: [],
            contact: { method: "", value: "", share: false },
            x: 28,
            y: 37,
            isDemo: true
        },
        {
            id: "demo-ropa-novedades",
            name: "Ropa y novedades",
            category: "ropa",
            location: "Ubicación de demostración",
            schedule: "",
            description: "",
            parking: "",
            photos: [],
            contact: { method: "", value: "", share: false },
            x: 58,
            y: 52,
            isDemo: true
        },
        {
            id: "demo-hogar",
            name: "Artículos para el hogar",
            category: "otro",
            location: "Ubicación de demostración",
            schedule: "",
            description: "",
            parking: "",
            photos: [],
            contact: { method: "", value: "", share: false },
            x: 72,
            y: 34,
            isDemo: true
        },
        {
            id: "demo-servicios",
            name: "Reparaciones y servicios",
            category: "otro",
            location: "Ubicación de demostración",
            schedule: "",
            description: "",
            parking: "",
            photos: [],
            contact: { method: "", value: "", share: false },
            x: 42,
            y: 69,
            isDemo: true
        }
    ];

    function crearId() {
        return globalThis.crypto?.randomUUID?.()
            || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizarNombreUsuario(nombre) {
        return String(nombre || "").trim().toLocaleLowerCase("es");
    }

    function normalizarNegocio(registro) {
        const negocio = registro && typeof registro === "object" ? registro : {};
        const contactoOriginal = negocio.contact && typeof negocio.contact === "object"
            ? negocio.contact
            : {};

        const xOriginal = negocio.x ?? negocio.mapX ?? negocio.posicionX;
        const yOriginal = negocio.y ?? negocio.mapY ?? negocio.posicionY;

        return {
            ...negocio,
            id: String(negocio.id || negocio.idNegocio || crearId()),
            name: String(
                negocio.name || negocio.nombre || negocio.businessName || "Negocio sin nombre"
            ).trim(),
            category: String(
                negocio.category || negocio.categoria || "otro"
            ).trim(),
            location: String(
                negocio.location || negocio.ubicacion || negocio.referencia || ""
            ).trim(),
            schedule: negocio.schedule || negocio.horario || negocio.horarios || "",
            days: Array.isArray(negocio.days)
                ? negocio.days
                : Array.isArray(negocio.dias)
                    ? negocio.dias
                    : [],
            openingTime: String(negocio.openingTime || negocio.horaApertura || ""),
            closingTime: String(negocio.closingTime || negocio.horaCierre || ""),
            description: String(negocio.description || negocio.descripcion || "").trim(),
            parking: String(negocio.parking || negocio.estacionamiento || "").trim(),
            photos: Array.isArray(negocio.photos)
                ? negocio.photos.filter(foto => typeof foto === "string")
                : Array.isArray(negocio.fotos)
                    ? negocio.fotos.filter(foto => typeof foto === "string")
                    : [],
            contact: {
                method: String(
                    contactoOriginal.method
                    || negocio.contactMethod
                    || negocio.medioContacto
                    || ""
                ),
                value: String(
                    contactoOriginal.value
                    || negocio.contactValue
                    || negocio.contacto
                    || ""
                ),
                share: Boolean(
                    contactoOriginal.share
                    ?? negocio.shareContact
                    ?? negocio.compartirContacto
                    ?? false
                )
            },
            ownerUsername: normalizarNombreUsuario(
                negocio.ownerUsername || negocio.owner || negocio.responsable || ""
            ),
            claimCode: String(negocio.claimCode || negocio.codigoVinculacion || ""),
            x: Number.isFinite(Number(xOriginal)) ? Number(xOriginal) : null,
            y: Number.isFinite(Number(yOriginal)) ? Number(yOriginal) : null,
            createdAt: negocio.createdAt || negocio.fechaRegistro || "",
            updatedAt: negocio.updatedAt || ""
        };
    }

    function leerNegocios() {
        const contenido = localStorage.getItem(CLAVE_NEGOCIOS);
        if (!contenido) return [];

        const original = JSON.parse(contenido);
        const registros = Array.isArray(original)
            ? original
            : Array.isArray(original?.negocios)
                ? original.negocios
                : [];

        const negocios = registros.map(normalizarNegocio);

        // Convierte el arreglo anterior al formato versionado sin cambiar la clave existente.
        if (Array.isArray(original) || original?.version !== 1) {
            try {
                localStorage.setItem(
                    CLAVE_NEGOCIOS,
                    JSON.stringify({ version: 1, negocios })
                );
            } catch {
                // La página podrá mostrar los datos aunque el navegador no permita migrarlos.
            }
        }

        return negocios;
    }

    function guardarNegocios(negocios) {
        if (!Array.isArray(negocios)) {
            throw new Error("La lista de negocios no tiene un formato válido.");
        }

        localStorage.setItem(
            CLAVE_NEGOCIOS,
            JSON.stringify({
                version: 1,
                negocios: negocios.map(normalizarNegocio)
            })
        );
    }

    function obtenerNegocios() {
        return leerNegocios();
    }

    function obtenerTodosLosNegocios() {
        return [...DEMOSTRACION, ...leerNegocios()];
    }

    function buscarNegocio(id) {
        return obtenerTodosLosNegocios().find(
            negocio => negocio.id === String(id)
        ) || null;
    }

    function guardarNegocio(negocioActualizado) {
        const negocios = leerNegocios();
        const negocio = normalizarNegocio(negocioActualizado);
        const indice = negocios.findIndex(item => item.id === negocio.id);

        if (indice === -1) {
            negocios.push(negocio);
        } else {
            negocios[indice] = {
                ...negocios[indice],
                ...negocio,
                id: negocios[indice].id,
                createdAt: negocios[indice].createdAt || negocio.createdAt
            };
        }

        guardarNegocios(negocios);
        return negocio;
    }

    function leerValoraciones() {
        const contenido = localStorage.getItem(CLAVE_VALORACIONES);
        if (!contenido) return [];

        const datos = JSON.parse(contenido);
        return Array.isArray(datos) ? datos : [];
    }

    function obtenerIdentificadorVisitante() {
        let id = localStorage.getItem(CLAVE_VISITANTE);

        if (!id) {
            id = crearId();
            localStorage.setItem(CLAVE_VISITANTE, id);
        }

        return id;
    }

    function obtenerValoraciones(idNegocio) {
        return leerValoraciones().filter(
            valoracion => valoracion.businessId === String(idNegocio)
        );
    }

    function obtenerValoracionDelVisitante(idNegocio) {
        const visitante = obtenerIdentificadorVisitante();

        return obtenerValoraciones(idNegocio).find(
            valoracion => valoracion.visitorId === visitante
        ) || null;
    }

    function obtenerResumenValoraciones(idNegocio) {
        const valoraciones = obtenerValoraciones(idNegocio);
        const total = valoraciones.length;
        const promedio = total
            ? valoraciones.reduce((suma, valoracion) => suma + valoracion.stars, 0) / total
            : 0;

        return { total, promedio };
    }

    function guardarValoracion(idNegocio, estrellas, comentario, nombre) {
        const negocio = buscarNegocio(idNegocio);
        const numeroEstrellas = Number(estrellas);

        if (!negocio) {
            throw new Error("No se encontró el negocio que quieres valorar.");
        }

        if (!Number.isInteger(numeroEstrellas) || numeroEstrellas < 1 || numeroEstrellas > 5) {
            throw new Error("Selecciona una valoración de 1 a 5 estrellas.");
        }

        const visitanteId = obtenerIdentificadorVisitante();
        const valoraciones = leerValoraciones();
        const existente = valoraciones.findIndex(
            item => item.businessId === String(idNegocio)
                && item.visitorId === visitanteId
        );

        const valoracion = {
            id: existente >= 0 ? valoraciones[existente].id : crearId(),
            businessId: String(idNegocio),
            visitorId: visitanteId,
            author: String(nombre || "").trim().slice(0, 50),
            stars: numeroEstrellas,
            comment: String(comentario || "").trim().slice(0, 500),
            createdAt: new Date().toISOString()
        };

        if (existente >= 0) {
            valoraciones[existente] = valoracion;
        } else {
            valoraciones.push(valoracion);
        }

        localStorage.setItem(CLAVE_VALORACIONES, JSON.stringify(valoraciones));
        return valoracion;
    }

    function etiquetaCategoria(categoria) {
        const etiquetas = {
            "comida-preparada": "Comida preparada",
            ropa: "Ropa",
            carne: "Carne",
            pollo: "Pollo",
            pescado: "Pescado",
            "frutas-verduras": "Fruta y verdura",
            cremeria: "Cremería",
            libros: "Libros",
            "tiendas-catalogo": "Tiendas de catálogo",
            otro: "Otro"
        };

        return etiquetas[categoria] || "Otro";
    }

    function textoHorario(negocio) {
        if (typeof negocio.schedule === "string" && negocio.schedule.trim()) {
            return negocio.schedule.trim();
        }

        const dias = Array.isArray(negocio.days) ? negocio.days : [];
        if (!dias.length || !negocio.openingTime || !negocio.closingTime) {
            return "";
        }

        return `${dias.join(", ")} · ${negocio.openingTime} a ${negocio.closingTime}`;
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caracter]);
    }

    window.TianguisNegocios = {
        crearId,
        normalizarNombreUsuario,
        obtenerNegocios,
        obtenerTodosLosNegocios,
        buscarNegocio,
        guardarNegocio,
        obtenerValoraciones,
        obtenerValoracionDelVisitante,
        obtenerResumenValoraciones,
        guardarValoracion,
        etiquetaCategoria,
        textoHorario,
        escaparHTML
    };
})();
