class UserHashMap {
    constructor(capacity = 31) {
        this.capacity = capacity;
        this.buckets = new Array(capacity).fill(null).map(() => []);
    }

    _hash(key) {
        let hash = 0;
        const stringKey = String(key).toLowerCase().trim();
        for (let i = 0; i < stringKey.length; i++) {
            hash = (hash * 31 + stringKey.charCodeAt(i)) % this.capacity;
        }
        return Math.abs(hash);
    }

    set(username, userData) {
        const key = String(username).toLowerCase().trim();
        const index = this._hash(key);
        const bucket = this.buckets[index];
        const existing = bucket.find(item => item.key === key);

        if (existing) {
            existing.value = userData;
        } else {
            bucket.push({ key, value: userData });
        }
    }

    get(username) {
        const key = String(username).toLowerCase().trim();
        const index = this._hash(key);
        const bucket = this.buckets[index];
        const item = bucket.find(entry => entry.key === key);
        return item ? item.value : null;
    }

    has(username) {
        return this.get(username) !== null;
    }
}

const userMap = new UserHashMap();

function seedDefaultUsers() {
    userMap.set("admin_sedeco", {
        username: "admin_sedeco",
        password: "123",
        role: "admin",
        name: "Lic. Roberto González",
        entity: "SEDECO CDMX",
        tianguis: "Todos los sectores"
    });

    userMap.set("lupita_antojitos", {
        username: "lupita_antojitos",
        password: "123",
        role: "vendedor",
        name: "María Guadalupe Pérez",
        business: "Antojitos Lupita",
        tianguis: "Tianguis Sullivan (Cuauhtémoc)"
    });
}

document.addEventListener("DOMContentLoaded", () => {
    seedDefaultUsers();

    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const formTitle = document.getElementById("formTitle");
    const formSubtitle = document.getElementById("formSubtitle");
    const authAlert = document.getElementById("authAlert");
    const regRoleSelect = document.getElementById("regRole");
    const groupBusinessName = document.getElementById("groupBusinessName");
    const groupTianguis = document.getElementById("groupTianguis");
    const roleBadge = document.getElementById("roleBadge");

    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        formTitle.textContent = "Bienvenido a Tianguis";
        formSubtitle.textContent = "Inicia sesión para gestionar tu negocio o consultar el monitoreo local.";
        hideAlert();
    });

    tabRegister.addEventListener("click", () => {
        tabRegister.classList.add("active");
        tabLogin.classList.remove("active");
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        formTitle.textContent = "Crear nueva cuenta";
        formSubtitle.textContent = "Únete a la red de comercio popular de la CDMX.";
        hideAlert();
    });

    // Control dinámico de campos según rol
    regRoleSelect.addEventListener("change", (e) => {
        if (e.target.value === "admin") {
            groupBusinessName.style.display = "none";
            groupTianguis.style.display = "none";
            roleBadge.textContent = "Modo Autoridad";
        } else {
            groupBusinessName.style.display = "flex";
            groupTianguis.style.display = "flex";
            roleBadge.textContent = "Modo Comerciante";
        }
    });

    // Login Handler
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById("loginUser").value.trim();
        const passwordInput = document.getElementById("loginPassword").value.trim();
        const roleInput = document.getElementById("loginRole").value;

        const user = userMap.get(usernameInput);

        if (!user) {
            showAlert("El usuario no existe.", "error");
            return;
        }

        if (user.password !== passwordInput) {
            showAlert("Contraseña incorrecta.", "error");
            return;
        }

        if (user.role !== roleInput) {
            const roleLabel = user.role === "admin" ? "Autoridad" : "Comerciante";
            showAlert(`El usuario es tipo ${roleLabel}. Ajusta la selección de rol.`, "error");
            return;
        }

        saveSession(user);
        showAlert(`¡Hola ${user.name}! Ingresando...`, "success");

        setTimeout(() => {
            window.location.href = user.role === "admin" ? "insights.html" : "detalles-local.html";
        }, 1000);
    });

    // Registro Handler
    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const role = document.getElementById("regRole").value;
        const name = document.getElementById("regName").value.trim();
        const business = document.getElementById("regBusiness").value.trim();
        const tianguis = document.getElementById("regTianguis").value;
        const username = document.getElementById("regUser").value.trim();
        const password = document.getElementById("regPassword").value.trim();

        if (role === "vendedor" && !tianguis) {
            showAlert("Por favor selecciona un tianguis o mercado.", "error");
            return;
        }

        if (userMap.has(username)) {
            showAlert("Nombre de usuario ocupado.", "error");
            return;
        }

        const newUser = {
            username,
            password,
            role,
            name,
            business: role === "vendedor" ? (business || "Puesto registrado") : "SEDECO",
            tianguis: role === "vendedor" ? tianguis : "N/A"
        };

        userMap.set(username, newUser);
        saveSession(newUser);

        showAlert("Registro exitoso. Redirigiendo...", "success");

        setTimeout(() => {
            window.location.href = role === "admin" ? "insights.html" : "detalles-local.html";
        }, 1000);
    });

    // Quick Demos
    document.getElementById("demoAdminBtn").addEventListener("click", () => {
        document.getElementById("loginUser").value = "admin_sedeco";
        document.getElementById("loginPassword").value = "123";
        document.getElementById("loginRole").value = "admin";
        roleBadge.textContent = "Demo Autoridad";
        showAlert("Credenciales de Autoridad listas.", "success");
    });

    document.getElementById("demoVendorBtn").addEventListener("click", () => {
        document.getElementById("loginUser").value = "lupita_antojitos";
        document.getElementById("loginPassword").value = "123";
        document.getElementById("loginRole").value = "vendedor";
        roleBadge.textContent = "Demo Comerciante";
        showAlert("Credenciales de Vendedor listas.", "success");
    });

    function showAlert(msg, type) {
        authAlert.textContent = msg;
        authAlert.className = `auth-alert ${type}`;
    }

    function hideAlert() {
        authAlert.className = "auth-alert hidden";
    }

    function saveSession(user) {
        localStorage.setItem("tianguis_session", JSON.stringify({
            username: user.username,
            role: user.role,
            name: user.name,
            business: user.business || "",
            tianguis: user.tianguis || ""
        }));
    }
});