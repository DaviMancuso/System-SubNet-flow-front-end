import { CALCULATOR_URL } from "../servicos/sessao.js";

import {
    excluirHistoricoPorId,
    listarHistoricos
} from "../servicos/historico-api.js";

import {
    initializeApp,
    showMessage
} from "../compartilhado/interface.js";

// So prossegue quando o Spring Boot confirmar a autenticacao.
const user = await initializeApp();

const searchInput = document.querySelector("#historySearch");
const message = document.querySelector("#historyMessage");
const confirmation = document.querySelector("#confirmDialog");
const clearButton = document.querySelector("#clearHistory");

let historyItems = [];
let pendingAction = null;
let processing = false;

// Normaliza textos para a pesquisa.
function normalizeSearch(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Formata números no padrão brasileiro.
function formatNumber(value) {
    return Number(value).toLocaleString("pt-BR");
}

// Formata a data de criação do histórico.
function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Data indisponível";
    }
    return new Intl.DateTimeFormat("pt-BR").format(date);
}

// Adapta o resumo do Spring Boot para a tabela.
function toHistoryItem(summary) {
    if (
        !summary?.redePrincipal ||
        !Array.isArray(summary.setores)
    ) {
        throw new Error(
            "O servidor retornou um planejamento incompleto."
        );
    }

    return {
        id: summary.id,
        name: summary.nome,
        createdAt: summary.criadoEm,
        network: summary.redePrincipal,
        sectorsLabel: summary.setores.join(", "),
        summary: {
            subnets: summary.totalSubredes,
            requested: summary.hostsSolicitados,
            efficiency: summary.aproveitamentoPercentual
        }
    };
}

// Abre a confirmação de exclusão.
function requestConfirmation(text, action) {
    if (processing) {
        return;
    }

    pendingAction = action;
    document.querySelector("#confirmationText").textContent = text;
    confirmation.returnValue = "";
    confirmation.showModal();
}

// Renderiza os históricos na tabela.
function renderHistory() {
    const body = document.querySelector("#historyBody");
    const template = document.querySelector("#historyRowTemplate");
    const filter = normalizeSearch(searchInput.value);

    const visible = historyItems.filter(item => {
        const searchable = [
            item.name,
            item.network,
            item.sectorsLabel,
            formatDate(item.createdAt),
            item.summary.subnets,
            item.summary.requested,
            `${item.summary.efficiency}%`
        ].join(" ");
        return normalizeSearch(searchable).includes(filter);
    });

    body.replaceChildren();

    for (const item of visible) {
        const row = template.content
            .firstElementChild
            .cloneNode(true);

        const fields = {
            network: item.network,
            label: item.sectorsLabel,
            subnets: formatNumber(item.summary.subnets),
            hosts: formatNumber(item.summary.requested),
            efficiency: `${item.summary.efficiency}%`,
            date: formatDate(item.createdAt)
        };

        for (const [field, value] of Object.entries(fields)) {
            row.querySelector(
                `[data-field="${field}"]`
            ).textContent = value;
        }

        // Abre o planejamento na calculadora.
        const link = row.querySelector(".history-open");
        const url = new URL(CALCULATOR_URL);
        url.searchParams.set("plano", item.id);
        link.href = url.href;
        link.setAttribute(
            "aria-label",
            `Abrir planejamento ${item.network}`
        );

        // Exclui somente o histórico selecionado.
        const removeButton = row.querySelector(".history-action");
        removeButton.disabled = processing;
        removeButton.setAttribute(
            "aria-label",
            `Excluir planejamento ${item.network}`
        );
        removeButton.addEventListener("click", () => {
            requestConfirmation(
                `Excluir o planejamento ${item.network} do seu histórico?`,
                async () => {
                    await excluirHistoricoPorId(item.id);
                }
            );
        });

        body.appendChild(row);
    }

    // Atualiza os indicadores da página.
    document.querySelector("#historyCount").textContent =
        formatNumber(historyItems.length);
    document.querySelector("#historyTableWrap").hidden =
        visible.length === 0;
    document.querySelector("#historyEmpty").hidden =
        visible.length > 0;
    document.querySelector("#historyEmptyTitle").textContent =
        filter
            ? "Nenhum resultado para esta busca"
            : "Seu histórico está vazio";
    document.querySelector("#historyEmptyText").textContent =
        filter
            ? "Tente outro endereço, setor ou prefixo CIDR."
            : "Realize um cálculo para encontrá-lo automaticamente aqui.";
    document.querySelector("#historySearchCount").textContent =
        `${visible.length} de ${historyItems.length} registros`;
    clearButton.disabled = processing || historyItems.length === 0;
}

// Busca os históricos reais no PostgreSQL.
async function loadHistory() {
    clearButton.disabled = true;
    showMessage(message, "Carregando históricos...", "success");

    try {
        // Uma única requisição: os detalhes só são buscados
        // quando o planejamento é aberto na calculadora.
        const summaries = await listarHistoricos();
        historyItems = summaries.map(toHistoryItem);
        renderHistory();
        showMessage(message);
        return true;
    } catch (error) {
        showMessage(
            message,
            error.message ||
                "Não foi possível carregar seu histórico."
        );
        clearButton.disabled = true;
        return false;
    }
}

// Configura os eventos somente quando o servidor confirmou a sessao.
if (user) {
    // Atualiza o texto antigo sobre armazenamento local.
    const counter = document.querySelector("#historyCount");
    if (counter.nextSibling) {
        counter.nextSibling.textContent =
            " planejamentos salvos na sua conta.";
    }

    // Busca no histórico.
    searchInput.addEventListener("input", renderHistory);

    // Exclui todos os históricos da conta.
    clearButton.addEventListener("click", () => {
        requestConfirmation(
            "Excluir todos os seus planejamentos salvos no PostgreSQL?",
            async () => {
                for (const item of [...historyItems]) {
                    await excluirHistoricoPorId(item.id);
                }
            }
        );
    });

    // Executa as ações somente após confirmação.
    confirmation.addEventListener("close", async () => {
        const action = pendingAction;
        pendingAction = null;

        if (
            confirmation.returnValue !== "confirm" ||
            !action ||
            processing
        ) {
            return;
        }

        processing = true;
        clearButton.disabled = true;
        showMessage(message, "Atualizando histórico...", "success");

        try {
            await action();
            const carregou = await loadHistory();
            if (carregou) {
                showMessage(message, "Histórico atualizado.", "success");
            }
        } catch (error) {
            await loadHistory();
            showMessage(
                message,
                error.message ||
                    "Não foi possível atualizar o histórico."
            );
        } finally {
            processing = false;
            renderHistory();
            searchInput.focus();
        }
    });

    // Carrega os históricos automaticamente.
    void loadHistory();
}
