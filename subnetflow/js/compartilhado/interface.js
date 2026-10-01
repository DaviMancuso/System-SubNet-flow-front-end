import { endSession, LOGIN_URL, requireSession } from "../servicos/sessao.js";
import { initializeTheme } from "./tema.js";

export function showMessage(element, message = "", type = "error") {
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
}

function initializeAccountMenu(user) {
    const button = document.querySelector("#accountButton");
    const dropdown = document.querySelector("#accountDropdown");
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2)
        .map(part => part.charAt(0).toUpperCase()).join("");

    document.querySelectorAll("[data-user-name]").forEach(element => {
        element.textContent = user.name;
    });

    document.querySelectorAll("[data-user-email]").forEach(element => {
        element.textContent = user.email;
    });

    document.querySelectorAll("[data-user-initials]").forEach(element => {
        element.textContent = initials;
    });

    function closeMenu() {
        dropdown.hidden = true;
        button.setAttribute("aria-expanded", "false");
    }

    button.addEventListener("click", () => {
        dropdown.hidden = !dropdown.hidden;
        button.setAttribute("aria-expanded", String(!dropdown.hidden));
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".account-menu-wrap")) {
            closeMenu();
        }
    });

    document.addEventListener("focusin", event => {
        if (!event.target.closest(".account-menu-wrap")) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dropdown.hidden) {
            closeMenu();
            button.focus();
        }
    });

    // Os diálogos nativos mantêm o foco no conteúdo aberto e permitem fechar com Escape.
    document.querySelectorAll("[data-open-dialog]").forEach(trigger => {
        trigger.addEventListener("click", () => {
            closeMenu();
            const dialog = document.getElementById(trigger.dataset.openDialog);
            dialog.addEventListener("close", () => button.focus(), { once: true });
            dialog.showModal();
        });
    });

    document.querySelector("#logoutButton").addEventListener("click", () => {
        try {
            endSession();
            window.location.replace(LOGIN_URL.href);
        } catch (error) {
            showMessage(document.querySelector("#accountMessage"), error.message);
        }
    });
}

export function initializeApp() {
    initializeTheme();
    const user = requireSession();

    if (!user) {
        return null;
    }

    initializeAccountMenu(user);
    document.querySelector("#appShell").hidden = false;
    return user;
}
