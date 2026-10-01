const THEME_KEY = "subnetflow_theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let selectedTheme = "system";

function applyTheme() {
    const dark = selectedTheme === "dark" || (selectedTheme === "system" && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";

    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
        button.setAttribute("aria-label", dark ? "Ativar tema claro" : "Ativar tema escuro");
        button.querySelector("[data-theme-icon]").textContent = dark ? "☀" : "☾";
    });

    const select = document.querySelector("#themePreference");

    if (select) {
        select.value = selectedTheme;
    }
}

export function setTheme(theme) {
    selectedTheme = ["light", "dark", "system"].includes(theme) ? theme : "system";
    applyTheme();

    try {
        localStorage.setItem(THEME_KEY, selectedTheme);
    } catch {
        // Sem armazenamento, a preferência continua funcionando na página atual.
    }
}

// O tema é compartilhado entre as páginas e acompanha o sistema quando essa opção está ativa.
export function initializeTheme() {
    try {
        selectedTheme = localStorage.getItem(THEME_KEY) || "system";
    } catch {
        selectedTheme = "system";
    }

    if (!["light", "dark", "system"].includes(selectedTheme)) {
        selectedTheme = "system";
    }

    applyTheme();
    systemTheme.addEventListener("change", applyTheme);

    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
        button.addEventListener("click", () => {
            setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
        });
    });

    document.querySelector("#themePreference")?.addEventListener("change", event => {
        setTheme(event.target.value);
    });
}
