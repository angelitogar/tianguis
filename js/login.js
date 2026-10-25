/* Inicio de sesión de demostración con cuentas guardadas en localStorage. */
(() => {
    "use strict";

    const USERS_KEY = "tianguis_usuarios_v1";
    const SESSION_KEY = "tianguis_session";

    function leerUsuarios() {
        try {
            const usuarios = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
            return Array.isArray(usuarios) ? usuarios : [];
        } catch {
            return [];
        }
    }

    function guardarUsuarios(usuarios) {
        localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    }

    function agregarUsuariosDemo() {
        const usuarios = leerUsuarios();
        const demos = [
            {
                username: "admin_sedeco",
                password: "123",
                role: "admin",
                name: "Lic. Roberto González",
                business: "",
                tianguis: "Todos los sectores"
            },
            {
                username: "lupita_antojitos",
                password: "123",
                role: "vendedor",
                name: "María Guadalupe Pérez",
                business: "Antojitos Lupita",
                tianguis: "Tianguis Sullivan (Cuauhtémoc)"
            }
        ];

        demos.forEach(demo => {
            if (!usuarios.some(usuario =>
                usuario.username.toLowerCase() === demo.username.toLowerCase()
            )) {
                usuarios.push(demo);
            }
        });

        guardarUsuarios(usuarios);
    }

    function guardarSesion(usuario) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: usuario.username,
            role: usuario.role,
            name: usuario.name,
            business: usuario.business || "",
            tianguis: usuario.tianguis || ""
        }));
    }

    document.addEventListener("DOMContentLoaded", () => {
        agregarUsuariosDemo();

        const tabLogin = document.getElementById("tabLogin");
        const tabRegister = document.getElementById("tabRegister");
        const loginForm = document.getElementById("loginForm");
        const registerForm = document.getElementById("registerForm");
        const formTitle = document.getElementById("formTitle");
        const formSubtitle = document.getElementById("formSubtitle");
        const authAlert = document.getElementById("authAlert");
        const regRole = document.getElementById("regRole");
        const groupBusinessName = document.getElementById("groupBusinessName");
        const groupTianguis = document.getElementById("groupTianguis");
        const roleBadge = document.getElementById("roleBadge");

        function mostrarAlerta(texto, tipo) {
            authAlert.textContent = texto;
            authAlert.className = `auth-alert ${tipo}`;
        }

        function ocultarAlerta() {
            authAlert.textContent = "";
            authAlert.className = "auth-alert hidden";
        }

        tabLogin.addEventListener("click", () => {
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            tabLogin.setAttribute("aria-selected", "true");
            tabRegister.setAttribute("aria-selected", "false");
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            formTitle.textContent = "Bienvenido a Tianguis";
            formSubtitle.textContent = "Inicia sesión para gestionar tu negocio.";
            ocultarAlerta();
        });

        tabRegister.addEventListener("click", () => {
            tabRegister.classList.add("active");
            tabLogin.classList.remove("active");
            tabRegister.setAttribute("aria-selected", "true");
            tabLogin.setAttribute("aria-selected", "false");
            registerForm.classList.remove("hidden");
            loginForm.classList.add("hidden");
            formTitle.textContent = "Crear nueva cuenta";
            formSubtitle.textContent = "Únete a la red de comercio popular de la CDMX.";
            ocultarAlerta();
        });

        regRole.addEventListener("change", () => {
            const esAdmin = regRole.value === "admin";
            groupBusinessName.style.display = esAdmin ? "none" : "flex";
            groupTianguis.style.display = esAdmin ? "none" : "flex";
            roleBadge.textContent = esAdmin ? "Modo Autoridad" : "Modo Comerciante";
        });

        loginForm.addEventListener("submit", evento => {
            evento.preventDefault();

            const usuarioIngresado = document.getElementById("loginUser").value.trim();
            const contrasena = document.getElementById("loginPassword").value;
            const rol = document.getElementById("loginRole").value;

            const usuario = leerUsuarios().find(item =>
                item.username.toLowerCase() === usuarioIngresado.toLowerCase()
            );

            if (!usuario) {
                mostrarAlerta("El usuario no existe en este navegador.", "error");
                return;
            }

            if (usuario.password !== contrasena) {
                mostrarAlerta("La contraseña es incorrecta.", "error");
                return;
            }

            if (usuario.role !== rol) {
                mostrarAlerta("Selecciona el tipo de cuenta correcto.", "error");
                return;
            }

            guardarSesion(usuario);
            mostrarAlerta(`¡Hola ${usuario.name}!`, "success");

            setTimeout(() => {
                window.location.href = usuario.role === "admin"
                    ? "insights.html"
                    : "detalles-local.html";
            }, 500);
        });

        registerForm.addEventListener("submit", evento => {
            evento.preventDefault();

            const role = regRole.value;
            const name = document.getElementById("regName").value.trim();
            const business = document.getElementById("regBusiness").value.trim();
            const tianguis = document.getElementById("regTianguis").value;
            const username = document.getElementById("regUser").value.trim();
            const password = document.getElementById("regPassword").value;

            if (role === "vendedor" && !tianguis) {
                mostrarAlerta("Selecciona el tianguis o mercado donde vendes.", "error");
                return;
            }

            const usuarios = leerUsuarios();
            if (usuarios.some(usuario =>
                usuario.username.toLowerCase() === username.toLowerCase()
            )) {
                mostrarAlerta("Ese nombre de usuario ya está registrado.", "error");
                return;
            }

            if (!username || !password || !name) {
                mostrarAlerta("Completa todos los campos obligatorios.", "error");
                return;
            }

            const nuevoUsuario = {
                username,
                password,
                role,
                name,
                business: role === "vendedor" ? business : "SEDECO",
                tianguis: role === "vendedor" ? tianguis : "N/A"
            };

            try {
                usuarios.push(nuevoUsuario);
                guardarUsuarios(usuarios);
                guardarSesion(nuevoUsuario);
                mostrarAlerta("Cuenta creada. Redirigiendo…", "success");

                setTimeout(() => {
                    window.location.href = role === "admin"
                        ? "insights.html"
                        : "detalles-local.html";
                }, 500);
            } catch {
                mostrarAlerta("No se pudo guardar la cuenta en este navegador.", "error");
            }
        });

        document.getElementById("demoAdminBtn").addEventListener("click", () => {
            document.getElementById("loginUser").value = "admin_sedeco";
            document.getElementById("loginPassword").value = "123";
            document.getElementById("loginRole").value = "admin";
            mostrarAlerta("Credenciales de demostración listas.", "success");
        });

        document.getElementById("demoVendorBtn").addEventListener("click", () => {
            document.getElementById("loginUser").value = "lupita_antojitos";
            document.getElementById("loginPassword").value = "123";
            document.getElementById("loginRole").value = "vendedor";
            mostrarAlerta("Credenciales de demostración listas.", "success");
        });
    });
})();
