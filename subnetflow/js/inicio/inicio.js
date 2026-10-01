import { CALCULATOR_URL, getSession, isValidEmail, normalizeEmail, startSession } from "../servicos/sessao.js";
import { showMessage } from "../compartilhado/interface.js";
import { initializeTheme } from "../compartilhado/tema.js";

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const message = document.querySelector("#authMessage");
const tabs = [...document.querySelectorAll(".auth-tab")];

function switchAuthMode(mode) {
    const login = mode === "login";
    loginForm.hidden = !login;
    registerForm.hidden = login;
    document.querySelector("#loginCopy").hidden = !login;
    document.querySelector("#registerCopy").hidden = login;

    tabs.forEach(tab => {
        const active = tab.dataset.authMode === mode;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
    });

    showMessage(message);
}

function openDemo(name, email) {
    startSession(name, email);
    loginForm.reset();
    registerForm.reset();
    window.location.assign(CALCULATOR_URL.href);
}

// Os formulários validam a interação do protótipo; a senha nunca é persistida.
function handleSubmit(event) {
    event.preventDefault();
    const registering = event.currentTarget === registerForm;
    const prefix = registering ? "register" : "login";
    const email = normalizeEmail(document.querySelector(`#${prefix}Email`).value);
    const password = document.querySelector(`#${prefix}Password`).value;

    try {
        if (!isValidEmail(email)) {
            throw new Error("Informe um e-mail válido.");
        }

        if (!password.trim()) {
            throw new Error("Preencha a senha de demonstração.");
        }

        let name = email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Visitante";

        if (registering) {
            name = document.querySelector("#registerName").value.trim();

            if (!name) {
                throw new Error("Informe seu nome.");
            }

            if (password !== document.querySelector("#registerPasswordConfirm").value) {
                throw new Error("As senhas não coincidem. Confira a confirmação.");
            }
        }

        openDemo(name, email);
    } catch (error) {
        showMessage(message, error.message);
    }
}

tabs.forEach(tab => {
    tab.addEventListener("click", () => switchAuthMode(tab.dataset.authMode));
    tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            return;
        }

        event.preventDefault();
        const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[1] : tabs.find(item => item !== tab);
        switchAuthMode(next.dataset.authMode);
        next.focus();
    });
});

document.querySelectorAll("[data-password-target]").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordTarget);
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Mostrar" : "Ocultar";
        button.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
        button.setAttribute("aria-pressed", String(!showing));
    });
});

loginForm.addEventListener("submit", handleSubmit);
registerForm.addEventListener("submit", handleSubmit);

document.querySelector("#demoButton").addEventListener("click", () => {
    try {
        openDemo("Visitante", "demo@subnetflow.com");
    } catch (error) {
        showMessage(message, error.message);
    }
});

initializeTheme();

try {
    if (getSession()) {
        window.location.replace(CALCULATOR_URL.href);
    }
} catch (error) {
    showMessage(message, error.message);
}
