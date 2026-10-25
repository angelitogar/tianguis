(() => {
    "use strict";

    const SESSION_KEY = "tianguis_session";
    const STORES_KEY = "tianguis_locales";
    const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

    const accessMessage = document.getElementById("accessMessage");
    const accessTitle = document.getElementById("accessTitle");
    const accessDescription = document.getElementById("accessDescription");
    const accessLink = document.getElementById("accessLink");
    const localContent = document.getElementById("localContent");
    const localForm = document.getElementById("localForm");
    const pageMessage = document.getElementById("pageMessage");
    const formMessage = document.getElementById("formMessage");
    const summaryTitle = document.getElementById("summaryTitle");
    const summaryDescription = document.getElementById("summaryDescription");
    const localDetails = document.getElementById("localDetails");

    let currentUser = null;
    let currentStore = null;

    function showAccessMessage(title, description, linkText, linkHref) {
        accessTitle.textContent = title;
        accessDescription.textContent = description;
        accessLink.textContent = linkText;
        accessLink.href = linkHref;
        accessMessage.classList.remove("hidden");
        localContent.classList.add("hidden");
    }

    function showPageMessage(text, isError = false) {
        pageMessage.textContent = text;
        pageMessage.classList.toggle("error", isError);
        pageMessage.classList.remove("hidden");
    }

    function showFormMessage(text, isError = false) {
        formMessage.textContent = text;
        formMessage.classList.toggle("error", isError);
        formMessage.classList.remove("hidden");
    }

    function readSession() {
        const rawSession = localStorage.getItem(SESSION_KEY);
        if (!rawSession) return null;

        const session = JSON.parse(rawSession);
        if (
            !session ||
            typeof session !== "object" ||
            typeof session.username !== "string" ||
            typeof session.role !== "string"
        ) {
            throw new Error("La sesión guardada no contiene una cuenta válida.");
        }

        return session;
    }

    function readStores() {
        const rawStores = localStorage.getItem(STORES_KEY);
        if (!rawStores) return {};

        const stores = JSON.parse(rawStores);
        if (!stores || typeof stores !== "object" || Array.isArray(stores)) {
            throw new Error("Los datos guardados de los locales tienen un formato inválido.");
        }

        return stores;
    }

    function defaultStore(user) {
        return {
            owner: user.username,
            businessName: user.business || user.name || "Mi local",
            businessType: "tianguis",
            category: "comida-preparada",
            marketName: user.tianguis || "",
            description: "",
            location: "",
            days: [],
            openingTime: "",
            closingTime: "",
            contactMethod: "",
            contact: ""
        };
    }

    function displayValue(value, fallback = "Sin información") {
        return typeof value === "string" && value.trim() ? value.trim() : fallback;
    }

    function addDetail(label, value) {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        localDetails.append(term, description);
    }

    function renderStore(store) {
        summaryTitle.textContent = displayValue(store.businessName, "Mi local");
        summaryDescription.textContent = displayValue(
            store.description,
            "Agrega una descripción para que tus clientes conozcan mejor tu negocio."
        );
        localDetails.replaceChildren();

        addDetail("Tipo de lugar", {
            tianguis: "Puesto de tianguis",
            mercado: "Local de mercado",
            barrio: "Negocio de barrio",
            otro: "Otro"
        }[store.businessType] || "Sin información");
        addDetail("Giro", {
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
        }[store.category] || "Sin información");
        addDetail("Tianguis o mercado", displayValue(store.marketName));
        addDetail("Ubicación", displayValue(store.location));

        const days = Array.isArray(store.days)
            ? DAYS.filter(day => store.days.includes(day))
            : [];
        const schedule = days.length && store.openingTime && store.closingTime
            ? `${days.join(", ")} · ${store.openingTime} a ${store.closingTime}`
            : "Sin horario registrado";
        addDetail("Horario", schedule);

        const contact = store.contactMethod && store.contact
            ? `${{
                whatsapp: "WhatsApp",
                llamada: "Teléfono",
                correo: "Correo"
            }[store.contactMethod] || "Contacto"}: ${store.contact}`
            : "No compartido";
        addDetail("Contacto", contact);
    }

    function setFormValue(name, value) {
        const field = localForm.elements.namedItem(name);
        if (field && "value" in field) field.value = value || "";
    }

    function populateForm(store) {
        [
            "businessName",
            "businessType",
            "category",
            "marketName",
            "description",
            "location",
            "openingTime",
            "closingTime",
            "contactMethod",
            "contact"
        ].forEach(name => setFormValue(name, store[name]));

        localForm.querySelectorAll('input[name="days"]').forEach(checkbox => {
            checkbox.checked = Array.isArray(store.days) && store.days.includes(checkbox.value);
        });
    }

    function isCurrentOwner() {
        let session;
        try {
            session = readSession();
        } catch {
            return false;
        }

        return Boolean(
            session &&
            session.role === "vendedor" &&
            session.username.trim().toLocaleLowerCase("es") ===
                currentStore.owner.trim().toLocaleLowerCase("es")
        );
    }

    function initialize() {
        try {
            currentUser = readSession();
        } catch (error) {
            showAccessMessage(
                "No se pudo validar tu sesión",
                error.message,
                "Ir al inicio",
                "index.html"
            );
            return;
        }

        if (!currentUser) {
            showAccessMessage(
                "Inicia sesión para continuar",
                "Inicia sesión como comerciante para consultar y administrar tu local.",
                "Iniciar sesión",
                "login.html"
            );
            return;
        }

        if (currentUser.role !== "vendedor" || !currentUser.username.trim()) {
            showAccessMessage(
                "Esta sección es para comerciantes",
                "Solo la cuenta propietaria del local puede editar su información.",
                "Volver al mapa",
                "index.html"
            );
            return;
        }

        try {
            const stores = readStores();
            const username = currentUser.username.trim().toLocaleLowerCase("es");
            currentStore = stores[username] || defaultStore(currentUser);

            if (
                !currentStore ||
                typeof currentStore !== "object" ||
                currentStore.owner.trim().toLocaleLowerCase("es") !== username
            ) {
                showAccessMessage(
                    "No tienes permiso para editar este local",
                    "La cuenta de la sesión no coincide con la cuenta propietaria registrada.",
                    "Volver al mapa",
                    "index.html"
                );
                return;
            }
        } catch (error) {
            showAccessMessage(
                "No se pudieron cargar los datos del local",
                `${error.message} No se realizaron cambios.`,
                "Volver al mapa",
                "index.html"
            );
            return;
        }

        accessMessage.classList.add("hidden");
        localContent.classList.remove("hidden");
        populateForm(currentStore);
        renderStore(currentStore);
    }

    localForm.addEventListener("submit", event => {
        event.preventDefault();
        formMessage.classList.add("hidden");

        if (!isCurrentOwner()) {
            showFormMessage("Tu sesión ya no corresponde al propietario de este local. Vuelve a iniciar sesión.", true);
            localForm.querySelectorAll("input, select, textarea, button").forEach(field => {
                field.disabled = true;
            });
            return;
        }

        if (!localForm.reportValidity()) return;

        const days = [...localForm.querySelectorAll('input[name="days"]:checked')]
            .map(checkbox => checkbox.value);
        const openingTime = localForm.elements.namedItem("openingTime").value;
        const closingTime = localForm.elements.namedItem("closingTime").value;
        const hasPartialSchedule = days.length > 0 || openingTime || closingTime;

        if (
            hasPartialSchedule &&
            (!days.length || !openingTime || !closingTime || closingTime <= openingTime)
        ) {
            showFormMessage("Completa los días y el horario; la hora de cierre debe ser posterior a la apertura.", true);
            return;
        }

        const contactMethod = localForm.elements.namedItem("contactMethod").value;
        const contact = localForm.elements.namedItem("contact").value.trim();

        if (contactMethod && !contact) {
            showFormMessage("Escribe el dato de contacto o selecciona que no deseas compartirlo.", true);
            localForm.elements.namedItem("contact").focus();
            return;
        }

        if (
            ["whatsapp", "llamada"].includes(contactMethod) &&
            !/^\d{8,15}$/.test(contact.replace(/\D/g, ""))
        ) {
            showFormMessage("Escribe un teléfono válido de entre 8 y 15 dígitos.", true);
            localForm.elements.namedItem("contact").focus();
            return;
        }

        if (contactMethod === "correo" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
            showFormMessage("Escribe un correo electrónico válido.", true);
            localForm.elements.namedItem("contact").focus();
            return;
        }

        try {
            const stores = readStores();
            const username = currentUser.username.trim().toLocaleLowerCase("es");
            const storedStore = stores[username];

            if (storedStore && storedStore.owner.trim().toLocaleLowerCase("es") !== username) {
                showFormMessage("No se guardaron los cambios porque la cuenta propietaria no coincide.", true);
                return;
            }

            currentStore = {
                owner: username,
                businessName: localForm.elements.namedItem("businessName").value.trim(),
                businessType: localForm.elements.namedItem("businessType").value,
                category: localForm.elements.namedItem("category").value,
                marketName: localForm.elements.namedItem("marketName").value.trim(),
                description: localForm.elements.namedItem("description").value.trim(),
                location: localForm.elements.namedItem("location").value.trim(),
                days,
                openingTime,
                closingTime,
                contactMethod,
                contact
            };

            stores[username] = currentStore;
            localStorage.setItem(STORES_KEY, JSON.stringify(stores));

            const updatedSession = {
                ...currentUser,
                business: currentStore.businessName,
                tianguis: currentStore.marketName
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
            currentUser = updatedSession;

            renderStore(currentStore);
            showFormMessage("Los datos de tu local se guardaron correctamente.");
            showPageMessage("Información actualizada. Los cambios están guardados en este navegador.");
        } catch (error) {
            showFormMessage(`No se pudieron guardar los cambios: ${error.message}`, true);
        }
    });

    initialize();
})();