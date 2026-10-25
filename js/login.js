/* Inicio de sesión de demostración con cuentas guardadas en localStorage. */
(() => {
    "use strict";

    const API = window.TianguisNegocios;
    const DB = window.TianguisDB;
    const SESSION_KEY = "tianguis_session";

    function leerUsuarios() {
        return DB.obtenerTabla("users");
    }

    function guardarUsuarios(usuarios) {
        DB.guardarTabla("users", usuarios);
    }

    function guardarSesion(usuario) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: usuario.username,
            role: usuario.role,
            name: usuario.name,
            business: usuario.business || "",
            tianguis: usuario.tianguis || "",
            marketId: usuario.marketId || ""
        }));
    }

    function normalizarUsuario(username) {
        return API.normalizarNombreUsuario(username);
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const authAlert = document.getElementById("authAlert");
        try {
            await API.ready;
        } catch (error) {
            authAlert.textContent = `No se pudieron cargar los datos de Tianguis: ${error.message}`;
            authAlert.className = "auth-alert error";
            return;
        }

        const tabLogin = document.getElementById("tabLogin");
        const tabRegister = document.getElementById("tabRegister");
        const loginForm = document.getElementById("loginForm");
        const registerForm = document.getElementById("registerForm");
        const formTitle = document.getElementById("formTitle");
        const formSubtitle = document.getElementById("formSubtitle");
        const regRole = document.getElementById("regRole");
        const groupBusinessName = document.getElementById("groupBusinessName");
        const groupTianguis = document.getElementById("groupTianguis");
        const roleBadge = document.getElementById("roleBadge");
        const marketSelect = document.getElementById("regTianguis");
        const businessInput = document.getElementById("regBusiness");
        const nameInput = document.getElementById("regName");
        const usernameInput = document.getElementById("regUser");
        const passwordInput = document.getElementById("regPassword");
        const loginUserInput = document.getElementById("loginUser");
        const loginPasswordInput = document.getElementById("loginPassword");
        const loginRoleSelect = document.getElementById("loginRole");
        const demoAdminButton = document.getElementById("demoAdminBtn");
        const demoVendorButton = document.getElementById("demoVendorBtn");
        const demoButtons = [demoAdminButton, demoVendorButton];
        let redirecting = false;

        DB.obtenerTabla("markets").forEach(mercado => {
            marketSelect.appendChild(new Option(mercado.name, mercado.id));
        });

        function mostrarAlerta(texto, tipo) {
            authAlert.textContent = texto;
            authAlert.className = `auth-alert ${tipo}`;
        }

        function ocultarAlerta() {
            authAlert.textContent = "";
            authAlert.className = "auth-alert hidden";
        }

        function cambiarEstadoFormulario() {
            const esAdmin = regRole.value === "admin";
            groupBusinessName.style.display = esAdmin ? "none" : "flex";
            groupTianguis.style.display = esAdmin ? "none" : "flex";
            businessInput.required = !esAdmin;
            marketSelect.required = !esAdmin;
            businessInput.disabled = esAdmin;
            marketSelect.disabled = esAdmin;
            roleBadge.textContent = esAdmin ? "Modo Autoridad" : "Modo Comerciante";
        }

        function entrar(usuario, mensaje) {
            if (redirecting) return;
            redirecting = true;
            demoButtons.forEach(button => {
                button.disabled = true;
            });
            guardarSesion(usuario);
            mostrarAlerta(mensaje, "success");
            window.setTimeout(() => {
                window.location.href = usuario.role === "admin"
                    ? "insights.html"
                    : "detalles-local.html";
            }, 400);
        }

        function accederDemo(username, role) {
            try {
                const usuario = leerUsuarios().find(item =>
                    normalizarUsuario(item.username) === normalizarUsuario(username) &&
                    item.role === role
                );
                if (!usuario) {
                    mostrarAlerta(
                        "No se encontró la cuenta de demostración. Revisa que los datos estén inicializados.",
                        "error"
                    );
                    return;
                }

                entrar(usuario, `Acceso de demostración como ${role === "admin" ? "autoridad" : "vendedor"}.`);
            } catch (error) {
                mostrarAlerta(`No se pudo iniciar la sesión de demostración: ${error.message}`, "error");
            }
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

        regRole.addEventListener("change", cambiarEstadoFormulario);
        cambiarEstadoFormulario();

        loginForm.addEventListener("submit", evento => {
            evento.preventDefault();

            const usuarioIngresado = document.getElementById("loginUser").value.trim();
            const contrasena = document.getElementById("loginPassword").value;
            const rol = document.getElementById("loginRole").value;

            let usuario;
            try {
                usuario = leerUsuarios().find(item =>
                    normalizarUsuario(item.username) === normalizarUsuario(usuarioIngresado)
                );
            } catch (error) {
                mostrarAlerta(`No se pudo consultar la base de datos: ${error.message}`, "error");
                return;
            }

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

            entrar(usuario, `¡Hola ${usuario.name}!`);
        });

        registerForm.addEventListener("submit", evento => {
            evento.preventDefault();

            const role = regRole.value;
            const name = document.getElementById("regName").value.trim();
            const business = businessInput.value.trim();
            const tianguis = document.getElementById("regTianguis").value;
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!name || !username || !password) {
                mostrarAlerta("Completa tu nombre, usuario y contraseña.", "error");
                return;
            }

            if (role === "vendedor" && (!business || !tianguis)) {
                mostrarAlerta("Escribe el nombre de tu negocio y selecciona el mercado donde vendes.", "error");
                return;
            }

            let usuarios;
            let mercado;
            try {
                usuarios = leerUsuarios();
                mercado = DB.obtenerTabla("markets").find(item => item.id === tianguis);
            } catch (error) {
                mostrarAlerta(`No se pudieron cargar los datos de registro: ${error.message}`, "error");
                return;
            }

            if (role === "vendedor" && !mercado) {
                mostrarAlerta("El mercado seleccionado ya no existe. Vuelve a elegirlo.", "error");
                return;
            }

            if (usuarios.some(usuario =>
                normalizarUsuario(usuario.username) === normalizarUsuario(username)
            )) {
                mostrarAlerta("Ese nombre de usuario ya está registrado.", "error");
                return;
            }

            const nuevoUsuario = {
                username,
                password,
                role,
                name,
                business: role === "vendedor" ? business : "SEDECO",
                tianguis: role === "vendedor" ? mercado?.name || "" : "N/A",
                marketId: role === "vendedor" ? mercado?.id || "" : ""
            };

            try {
                usuarios.push(nuevoUsuario);
                guardarUsuarios(usuarios);

                if (role === "vendedor") {
                    API.guardarNegocio({
                        id: API.crearId(),
                        name: business,
                        category: "otro",
                        location: mercado.reference || mercado.name,
                        marketId: mercado.id,
                        schedule: mercado.schedule || "",
                        description: "",
                        parking: "",
                        photos: [],
                        contact: { method: "", value: "", share: false },
                        ownerUsername: normalizarUsuario(username),
                        x: mercado.x,
                        y: mercado.y,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                guardarSesion(nuevoUsuario);
                redirecting = true;
                mostrarAlerta("Cuenta creada y guardada. Redirigiendo…", "success");
                window.setTimeout(() => {
                    window.location.href = role === "admin"
                        ? "insights.html"
                        : "detalles-local.html";
                }, 400);
            } catch (error) {
                mostrarAlerta(`No se pudo completar el registro: ${error.message}`, "error");
            }
        });

        demoAdminButton.addEventListener("click", () => {
            accederDemo("admin_sedeco", "admin");
        });

        demoVendorButton.addEventListener("click", () => {
            accederDemo("lupita_antojitos", "vendedor");
        });
    });
})();
