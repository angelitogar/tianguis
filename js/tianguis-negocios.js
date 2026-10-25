/* Base de datos local compartida por las páginas de Tianguis. */
(() => {
    "use strict";

    const DATABASE_KEY = "tianguis_database_v1";
    const LEGACY_KEYS = {
        businesses: "tianguis_negocios_registrados",
        products: "tianguis_products",
        users: "tianguis_usuarios_v1",
        denuncias: "tianguis_denuncias",
        ratings: "tianguis_valoraciones_v1",
        cartItems: "tianguis.listaCompras.v1"
    };
    const TABLES = [
        "markets",
        "users",
        "businesses",
        "products",
        "denuncias",
        "ratings",
        "cartItems"
    ];
    let database = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function crearId() {
        return globalThis.crypto?.randomUUID?.()
            || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizarNombreUsuario(nombre) {
        return String(nombre || "").trim().toLocaleLowerCase("es");
    }

    function normalizarNegocio(registro) {
        const negocio = registro && typeof registro === "object" ? registro : {};
        const contacto = negocio.contact && typeof negocio.contact === "object"
            ? negocio.contact
            : {};
        const x = negocio.x ?? negocio.mapX ?? negocio.posicionX;
        const y = negocio.y ?? negocio.mapY ?? negocio.posicionY;

        return {
            ...negocio,
            id: String(negocio.id || negocio.idNegocio || crearId()),
            name: String(
                negocio.name || negocio.nombre || negocio.businessName || "Negocio sin nombre"
            ).trim(),
            category: String(negocio.category || negocio.categoria || "otro").trim(),
            location: String(
                negocio.location || negocio.ubicacion || negocio.referencia || ""
            ).trim(),
            marketId: String(negocio.marketId || ""),
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
                method: String(contacto.method || negocio.contactMethod || negocio.medioContacto || ""),
                value: String(contacto.value || negocio.contactValue || negocio.contacto || ""),
                share: Boolean(contacto.share ?? negocio.shareContact ?? negocio.compartirContacto ?? false)
            },
            ownerUsername: normalizarNombreUsuario(
                negocio.ownerUsername || negocio.owner || negocio.responsable || ""
            ),
            claimCode: String(negocio.claimCode || negocio.codigoVinculacion || ""),
            x: x !== null && x !== undefined && Number.isFinite(Number(x)) ? Number(x) : null,
            y: y !== null && y !== undefined && Number.isFinite(Number(y)) ? Number(y) : null,
            createdAt: negocio.createdAt || negocio.fechaRegistro || "",
            updatedAt: negocio.updatedAt || ""
        };
    }

    function leerLegacy(tabla) {
        const clave = LEGACY_KEYS[tabla];
        const contenido = clave ? localStorage.getItem(clave) : null;
        if (!contenido) return [];

        const parseado = JSON.parse(contenido);
        if (tabla === "businesses") {
            return Array.isArray(parseado)
                ? parseado
                : Array.isArray(parseado?.negocios)
                    ? parseado.negocios
                    : [];
        }

        if (tabla === "users") {
            return Array.isArray(parseado) ? parseado : [];
        }

        return Array.isArray(parseado) ? parseado : [];
    }

    function identidad(tabla, registro) {
        return tabla === "users"
            ? normalizarNombreUsuario(registro.username)
            : String(registro.id || "");
    }

    function fusionar(tabla, base, adicionales) {
        const registros = new Map(base.map(registro => [identidad(tabla, registro), registro]));

        adicionales.forEach(registro => {
            const id = identidad(tabla, registro);
            if (!id) return;
            const previo = registros.get(id);
            registros.set(id, previo ? { ...previo, ...registro } : registro);
        });

        return [...registros.values()];
    }

    function repararReferencias(tables) {
        const mercados = new Map(tables.markets.map(mercado => [
            mercado.name.trim().toLocaleLowerCase("es"),
            mercado.id
        ]));
        const mercadoPorId = new Map(tables.markets.map(mercado => [mercado.id, mercado]));
        const negocios = tables.businesses.map(normalizarNegocio);

        tables.businesses = negocios.map(negocio => ({
            ...negocio,
            marketId: negocio.marketId || mercados.get(
                String(negocio.marketName || negocio.tianguis || negocio.location)
                    .trim()
                    .toLocaleLowerCase("es")
            ) || ""
        }));
        const negocioPorId = new Map(tables.businesses.map(negocio => [negocio.id, negocio]));
        const negocioPorNombre = new Map(tables.businesses.map(negocio => [
            negocio.name.trim().toLocaleLowerCase("es"),
            negocio
        ]));
        tables.users = tables.users.map(usuario => {
            const negocioPropio = tables.businesses.find(negocio =>
                negocio.ownerUsername === normalizarNombreUsuario(usuario.username)
            );
            const marketId = negocioPropio?.marketId || usuario.marketId || mercados.get(
                String(usuario.tianguis || "").trim().toLocaleLowerCase("es")
            ) || "";

            return {
                ...usuario,
                business: negocioPropio?.name || usuario.business || "",
                marketId,
                tianguis: mercadoPorId.get(marketId)?.name || usuario.tianguis || ""
            };
        });

        tables.products = tables.products.map(producto => {
            const negocio = negocioPorId.get(producto.businessId)
                || negocioPorNombre.get(String(producto.businessName || "").trim().toLocaleLowerCase("es"))
                || negocios.find(item =>
                    normalizarNombreUsuario(item.ownerUsername) ===
                    normalizarNombreUsuario(producto.username)
                );
            const mercado = negocio?.marketId
                ? negocio.marketId
                : mercados.get(String(producto.tianguis || "").trim().toLocaleLowerCase("es"));
            const marketId = negocio?.marketId || producto.marketId || mercado || "";
            const username = normalizarNombreUsuario(
                negocio?.ownerUsername || producto.username || ""
            );
            const usuario = tables.users.find(item =>
                normalizarNombreUsuario(item.username) ===
                username
            );

            return {
                ...producto,
                businessId: negocio?.id || String(producto.businessId || ""),
                marketId,
                businessName: negocio?.name || producto.businessName || "",
                vendorName: usuario?.name || producto.vendorName || "",
                tianguis: mercadoPorId.get(marketId)?.name || producto.tianguis || "",
                username,
                unit: producto.unit || "pieza",
                availability: producto.availability || "disponible",
                aliases: Array.isArray(producto.aliases) ? producto.aliases : []
            };
        });

        tables.denuncias = tables.denuncias.map(denuncia => ({
            ...denuncia,
            marketId: denuncia.marketId || mercados.get(
                String(denuncia.marketName || denuncia.tianguis || "").trim().toLocaleLowerCase("es")
            ) || "",
            businessId: String(denuncia.businessId || ""),
            type: denuncia.type || denuncia.tipo || "",
            marketName: mercadoPorId.get(denuncia.marketId)?.name
                || denuncia.marketName
                || denuncia.tianguis
                || "",
            businessName: negocioPorId.get(denuncia.businessId)?.name
                || denuncia.businessName
                || denuncia.puesto
                || "",
            incidentAt: denuncia.incidentAt || denuncia.fechaIncidente || "",
            createdAt: denuncia.createdAt || denuncia.fechaRegistro || "",
            description: denuncia.description || denuncia.descripcion || "",
            reporter: denuncia.reporter || denuncia.denunciante || "Anónimo",
            reporterContact: denuncia.reporterContact || denuncia.contacto || "",
            evidence: denuncia.evidence ?? denuncia.evidencia ?? null
        }));

        tables.ratings = tables.ratings.map(valoracion => ({
            ...valoracion,
            businessId: String(valoracion.businessId || "")
        }));
    }

    function persistir() {
        localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    }

    function guardarBaseInicial() {
        const clavesLegacy = [...new Set(Object.values(LEGACY_KEYS))];
        const valoresLegacy = new Map(clavesLegacy
            .map(clave => [clave, localStorage.getItem(clave)])
            .filter(([, valor]) => valor !== null));

        try {
            clavesLegacy.forEach(clave => localStorage.removeItem(clave));
            persistir();
        } catch (error) {
            valoresLegacy.forEach((valor, clave) => localStorage.setItem(clave, valor));
            throw error;
        }
    }

    function iniciar(seed) {
        if (!seed || seed.version !== 1) {
            throw new Error("El archivo de datos debe tener version 1.");
        }
        const tablasRequeridas = TABLES.filter(tabla => tabla !== "cartItems");
        const tablaInvalida = tablasRequeridas.find(tabla => !Array.isArray(seed[tabla]));
        if (tablaInvalida) {
            throw new Error(`El archivo de datos no contiene la tabla "${tablaInvalida}".`);
        }

        let existente = null;
        const guardado = localStorage.getItem(DATABASE_KEY);
        if (guardado) {
            existente = JSON.parse(guardado);
            if (
                existente.version !== 1 ||
                !existente.tables ||
                TABLES.some(tabla => !Array.isArray(existente.tables[tabla]))
            ) {
                throw new Error("La base de datos local tiene un formato inválido.");
            }
        }

        const tables = {};
        TABLES.forEach(tabla => {
            const legacy = existente ? [] : leerLegacy(tabla);
            tables[tabla] = fusionar(
                tabla,
                clone(seed[tabla] || []),
                existente?.tables?.[tabla] || []
            );
            tables[tabla] = fusionar(tabla, tables[tabla], legacy);
        });

        database = { version: 1, tables };
        repararReferencias(database.tables);
        guardarBaseInicial();
    }

    function leerTabla(nombre) {
        if (!database || !TABLES.includes(nombre)) {
            throw new Error(`La tabla "${nombre}" no existe o la base de datos aún no está lista.`);
        }

        return clone(database.tables[nombre]);
    }

    function guardarTabla(nombre, registros) {
        if (!database || !TABLES.includes(nombre) || !Array.isArray(registros)) {
            throw new Error(`No se pudo guardar la tabla "${nombre}".`);
        }

        database.tables[nombre] = clone(registros);
        repararReferencias(database.tables);
        persistir();
        return leerTabla(nombre);
    }

    function obtenerMercadosConProductos() {
        const mercados = leerTabla("markets");
        const negocios = leerTabla("businesses");
        const productos = leerTabla("products");

        return mercados.map(mercado => ({
            id: mercado.id,
            nombre: mercado.name,
            horario: mercado.schedule,
            referencia: mercado.reference,
            x: mercado.x,
            y: mercado.y,
            puestos: negocios
                .filter(negocio => negocio.marketId === mercado.id)
                .map(negocio => ({
                    nombre: negocio.name,
                    categoria: negocio.category,
                    productos: productos
                        .filter(producto => producto.businessId === negocio.id)
                        .map(producto => ({
                            id: producto.id,
                            nombre: producto.name,
                            alias: producto.aliases || [],
                            unidad: producto.unit || "pieza",
                            precio: producto.price === null || producto.price === ""
                                ? null
                                : Number.isFinite(Number(producto.price))
                                    ? Number(producto.price)
                                    : null,
                            disponibilidad: producto.availability || "disponible"
                        }))
                }))
        }));
    }

    function obtenerTianguisConProductos() {
        return obtenerMercadosConProductos();
    }

    function buscarNegocio(id) {
        return leerTabla("businesses").find(
            negocio => negocio.id === String(id)
        ) || null;
    }

    const ready = fetch(new URL("../data/tianguis.json", document.currentScript.src))
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error(`No se pudieron cargar los datos (${respuesta.status}).`);
            }
            return respuesta.json();
        })
        .then(iniciar)
        .catch(error => {
            console.error("Error al iniciar la base de datos de Tianguis:", error);
            throw error;
        });

    window.TianguisDB = {
        ready,
        obtenerTabla: leerTabla,
        guardarTabla,
        obtenerMercadosConProductos
    };

    window.TianguisNegocios = {
        ready,
        crearId,
        normalizarNombreUsuario,
        obtenerNegocios: () => leerTabla("businesses"),
        obtenerTodosLosNegocios: () => leerTabla("businesses"),
        buscarNegocio,
        guardarNegocio(negocioActualizado) {
            const negocios = leerTabla("businesses");
            const negocio = normalizarNegocio(negocioActualizado);
            const indice = negocios.findIndex(item => item.id === negocio.id);

            if (indice === -1) {
                negocios.push(negocio);
            } else {
                const existente = negocios[indice];
                if (
                    existente.ownerUsername &&
                    existente.ownerUsername !== negocio.ownerUsername
                ) {
                    throw new Error("Solo la cuenta propietaria puede modificar este negocio.");
                }
                negocios[indice] = {
                    ...existente,
                    ...negocio,
                    id: existente.id,
                    createdAt: existente.createdAt || negocio.createdAt
                };
            }

            guardarTabla("businesses", negocios);
            return buscarNegocio(negocio.id);
        },
        obtenerValoraciones(idNegocio) {
            return leerTabla("ratings").filter(
                valoracion => valoracion.businessId === String(idNegocio)
            );
        },
        obtenerValoracionDelVisitante(idNegocio) {
            const visitante = localStorage.getItem("tianguis_visitante_v1");
            return this.obtenerValoraciones(idNegocio).find(
                valoracion => valoracion.visitorId === visitante
            ) || null;
        },
        obtenerResumenValoraciones(idNegocio) {
            const valoraciones = this.obtenerValoraciones(idNegocio);
            return {
                total: valoraciones.length,
                promedio: valoraciones.length
                    ? valoraciones.reduce((suma, valoracion) => suma + valoracion.stars, 0) /
                        valoraciones.length
                    : 0
            };
        },
        guardarValoracion(idNegocio, estrellas, comentario, nombre) {
            if (!this.buscarNegocio(idNegocio)) {
                throw new Error("No se encontró el negocio que quieres valorar.");
            }

            const numeroEstrellas = Number(estrellas);
            if (!Number.isInteger(numeroEstrellas) || numeroEstrellas < 1 || numeroEstrellas > 5) {
                throw new Error("Selecciona una valoración de 1 a 5 estrellas.");
            }

            let visitanteId = localStorage.getItem("tianguis_visitante_v1");
            if (!visitanteId) {
                visitanteId = crearId();
                localStorage.setItem("tianguis_visitante_v1", visitanteId);
            }

            const valoraciones = leerTabla("ratings");
            const existente = valoraciones.findIndex(valoracion =>
                valoracion.businessId === String(idNegocio) &&
                valoracion.visitorId === visitanteId
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

            if (existente >= 0) valoraciones[existente] = valoracion;
            else valoraciones.push(valoracion);
            guardarTabla("ratings", valoraciones);
            return valoracion;
        },
        obtenerTianguisConProductos,
        etiquetaCategoria(categoria) {
            return ({
                "comida-preparada": "Comida preparada",
                ropa: "Ropa",
                carne: "Carne",
                pollo: "Pollo",
                pescado: "Pescado",
                "frutas-verduras": "Fruta y verdura",
                cremeria: "Cremería",
                hogar: "Hogar",
                servicios: "Servicios",
                libros: "Libros",
                "tiendas-catalogo": "Tiendas de catálogo",
                otro: "Otro"
            })[categoria] || "Otro";
        },
        textoHorario(negocio) {
            if (typeof negocio.schedule === "string" && negocio.schedule.trim()) {
                return negocio.schedule.trim();
            }
            if (
                !Array.isArray(negocio.days) ||
                !negocio.days.length ||
                !negocio.openingTime ||
                !negocio.closingTime
            ) return "";
            return `${negocio.days.join(", ")} · ${negocio.openingTime} a ${negocio.closingTime}`;
        },
        escaparHTML(valor) {
            return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[caracter]);
        }
    };

    window.addEventListener("storage", evento => {
        if (evento.key !== DATABASE_KEY || !evento.newValue) return;
        const actualizado = JSON.parse(evento.newValue);
        if (
            actualizado.version !== 1 ||
            !actualizado.tables ||
            TABLES.some(tabla => !Array.isArray(actualizado.tables[tabla]))
        ) {
            console.error("Se recibió una base de datos compartida con formato inválido.");
            return;
        }
        database = actualizado;
    });
})();
