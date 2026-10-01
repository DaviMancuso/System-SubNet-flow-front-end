import { createPlan } from "../core/vlsm.js";
import { CALCULATOR_URL } from "../servicos/sessao.js";
import { clearHistory, deletePlan, getHistory } from "../servicos/historico.js";
import { initializeApp, showMessage } from "../compartilhado/interface.js";

const user = initializeApp();
const searchInput = document.querySelector("#historySearch");
const message = document.querySelector("#historyMessage");
const confirmation = document.querySelector("#confirmDialog");
const clearButton = document.querySelector("#clearHistory");
let historyItems = [];
let pendingAction = null;

function normalizeSearch(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function requestConfirmation(text, action) {
    pendingAction = action;
    document.querySelector("#confirmationText").textContent = text;
    confirmation.returnValue = "";
    confirmation.showModal();
}

// Texto do usuário é inserido com textContent, sem interpretar marcação HTML.
function renderHistory() {
    const body = document.querySelector("#historyBody");
    const template = document.querySelector("#historyRowTemplate");
    const filter = normalizeSearch(searchInput.value);
    const records = historyItems.map(item => {
        const plan = createPlan(item.network, item.sectors);

        return {
            ...item,
            label: item.sectors.map(sector => sector.name).join(", "),
            date: new Intl.DateTimeFormat("pt-BR").format(new Date(item.createdAt)),
            summary: plan.summary
        };
    });

    const visible = records.filter(item => {
        const text = [item.network, item.label, item.date, item.summary.requested, item.summary.subnets, `${item.summary.efficiency}%`].join(" ");
        return normalizeSearch(text).includes(filter);
    });

    body.replaceChildren();

    for (const item of visible) {
        const row = template.content.firstElementChild.cloneNode(true);
        const fields = {
            network: item.network,
            label: item.label,
            subnets: item.summary.subnets.toLocaleString("pt-BR"),
            hosts: item.summary.requested.toLocaleString("pt-BR"),
            efficiency: `${item.summary.efficiency}%`,
            date: item.date
        };

        for (const [field, value] of Object.entries(fields)) {
            row.querySelector(`[data-field="${field}"]`).textContent = value;
        }

        const link = row.querySelector(".history-open");
        const url = new URL(CALCULATOR_URL);
        url.searchParams.set("plano", item.id);
        link.href = url.href;
        link.setAttribute("aria-label", `Abrir planejamento ${item.network}`);

        const removeButton = row.querySelector(".history-action");
        removeButton.setAttribute("aria-label", `Excluir planejamento ${item.network}`);
        removeButton.addEventListener("click", () => {
            requestConfirmation(`Excluir o planejamento ${item.network} do seu histórico?`, () => {
                historyItems = deletePlan(user.email, item.id);
            });
        });

        body.appendChild(row);
    }

    document.querySelector("#historyCount").textContent = historyItems.length.toLocaleString("pt-BR");
    document.querySelector("#historyTableWrap").hidden = visible.length === 0;
    document.querySelector("#historyEmpty").hidden = visible.length > 0;
    document.querySelector("#historyEmptyTitle").textContent = filter ? "Nenhum resultado para esta busca" : "Seu histórico está vazio";
    document.querySelector("#historyEmptyText").textContent = filter ? "Tente outro endereço, setor ou prefixo CIDR." : "Calcule um planejamento e clique em Salvar rede para encontrá-lo aqui.";
    clearButton.disabled = historyItems.length === 0;
    document.querySelector("#historySearchCount").textContent = `${visible.length} de ${historyItems.length} registros`;
}

function loadHistory() {
    try {
        historyItems = getHistory(user.email);
        renderHistory();
        showMessage(message);
    } catch (error) {
        clearButton.disabled = true;
        showMessage(message, error.message);
    }
}

if (user) {
    searchInput.addEventListener("input", renderHistory);
    clearButton.addEventListener("click", () => {
        requestConfirmation("Excluir todos os planejamentos desta conta de demonstração neste navegador?", () => {
            clearHistory(user.email);
            historyItems = [];
        });
    });

    confirmation.addEventListener("close", () => {
        const action = pendingAction;
        pendingAction = null;

        if (confirmation.returnValue !== "confirm" || !action) {
            return;
        }

        try {
            action();
            renderHistory();
            showMessage(message, "Histórico atualizado.", "success");
            searchInput.focus();
        } catch (error) {
            showMessage(message, error.message);
        }
    });

    window.addEventListener("storage", loadHistory);
    loadHistory();
}
