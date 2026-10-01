import { readJson, removeStoredValue, writeJson } from "./armazenamento.js";

const SESSION_KEY = "subnetflow_demo_session";

export const LOGIN_URL = new URL("../../html/inicio/index.html", import.meta.url);
export const CALCULATOR_URL = new URL("../../html/calcular/calcular.html", import.meta.url);

export function normalizeEmail(value) {
    return String(value).trim().toLowerCase();
}

export function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

// A sessão é demonstrativa: o front-end não armazena nem verifica senhas.
export function startSession(name, email) {
    const user = {
        name: String(name).trim().slice(0, 60),
        email: normalizeEmail(email)
    };

    if (!user.name || !isValidEmail(user.email)) {
        throw new Error("Informe um nome e um e-mail válidos para iniciar a demonstração.");
    }

    writeJson(SESSION_KEY, user, "sessionStorage");
    return user;
}

export function getSession() {
    const user = readJson(SESSION_KEY, null, "sessionStorage");

    if (!user || typeof user.name !== "string" || !user.name.trim() || typeof user.email !== "string") {
        return null;
    }

    const email = normalizeEmail(user.email);

    return isValidEmail(email) ? { name: user.name.slice(0, 60), email } : null;
}

export function endSession() {
    removeStoredValue(SESSION_KEY, "sessionStorage");
}

export function requireSession() {
    try {
        const user = getSession();

        if (user) {
            return user;
        }
    } catch {
        // A tela inicial apresenta o erro se o navegador não permitir uma nova sessão.
    }

    window.location.replace(LOGIN_URL.href);
    return null;
}
