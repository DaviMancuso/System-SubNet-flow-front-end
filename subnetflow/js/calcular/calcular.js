import { parseNetwork } from "../core/ipv4.js";
import { createPlan, estimateAllocation, MAX_SECTORS } from "../core/vlsm.js";
import { downloadCsv } from "../servicos/exportacao.js";
import { findPlan, savePlan } from "../servicos/historico.js";
import { initializeApp, showMessage } from "../compartilhado/interface.js";

const initialSectors = [
    { name: "Administrativo", hosts: 50 },
    { name: "Financeiro", hosts: 25 },
    { name: "Tecnologia", hosts: 10 },
    { name: "Servidores", hosts: 2 }
];

const exampleSectors = [
    { name: "Laboratórios", hosts: 180 },
    { name: "Administrativo", hosts: 60 },
    { name: "Professores", hosts: 28 },
    { name: "Servidores", hosts: 10 }
];

const sectorList = document.querySelector("#sectorList");
const sectorTemplate = document.querySelector("#sectorTemplate");
const networkInput = document.querySelector("#mainNetwork");
const resultsSection = document.querySelector("#resultados");
const errorMessage = document.querySelector("#errorMessage");
const resultMessage = document.querySelector("#resultMessage");
const saveButton = document.querySelector("#saveNetworkButton");
const exportButton = document.querySelector("#exportCsv");
const user = initializeApp();
let latestPlan = null;
let rowSequence = 0;

function formatNumber(value) {
    return value.toLocaleString("pt-BR");
}

// As linhas partem do template HTML; o JavaScript apenas preenche dados e associa eventos.
function addSector(name = "Novo setor", hosts = 5) {
    if (sectorList.children.length >= MAX_SECTORS) {
        showMessage(errorMessage, `O planejamento aceita até ${MAX_SECTORS} setores.`);
        return null;
    }

    const row = sectorTemplate.content.firstElementChild.cloneNode(true);
    const nameInput = row.querySelector(".sector-name");
    const hostsInput = row.querySelector(".sector-hosts");
    rowSequence++;
    nameInput.id = `sectorName${rowSequence}`;
    hostsInput.id = `sectorHosts${rowSequence}`;
    row.querySelector(".sector-name-label").htmlFor = nameInput.id;
    row.querySelector(".sector-hosts-label").htmlFor = hostsInput.id;
    nameInput.value = name;
    hostsInput.value = hosts;

    row.querySelector(".remove-sector").addEventListener("click", () => {
        if (sectorList.children.length === 1) {
            showMessage(errorMessage, "O planejamento precisa ter pelo menos um setor.");
            return;
        }

        const nextRow = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        handleInputChange();
        nextRow.querySelector(".sector-name").focus();
    });

    row.addEventListener("input", handleInputChange);
    sectorList.appendChild(row);
    return row;
}

function setSectors(sectors) {
    sectorList.replaceChildren();
    sectors.forEach(sector => addSector(sector.name, sector.hosts));
}

function collectSectors() {
    return [...sectorList.querySelectorAll(".sector-row")].map(row => ({
        name: row.querySelector(".sector-name").value,
        hosts: Number(row.querySelector(".sector-hosts").value)
    }));
}

function invalidateResults() {
    latestPlan = null;
    resultsSection.hidden = true;
    saveButton.disabled = true;
    saveButton.textContent = "Salvar rede";
    exportButton.disabled = true;
    document.querySelector("#learningExample").hidden = true;
    document.querySelector("#learningPlaceholder").hidden = false;
    showMessage(resultMessage);

    if (new URL(window.location.href).searchParams.has("plano")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
}

function handleInputChange() {
    invalidateResults();
    showMessage(errorMessage);
    showMessage(document.querySelector("#pageMessage"));
    refreshPreview();
}

function renderMiniMap(network, allocation) {
    const map = document.querySelector("#miniMap");
    const legend = document.querySelector("#mapLegend");
    const blockTemplate = document.querySelector("#mapBlockTemplate");
    const legendTemplate = document.querySelector("#mapLegendTemplate");
    const segments = allocation.blocks.map((block, index) => ({
        name: block.name,
        size: block.blockSize,
        tone: index % 7
    }));

    if (allocation.remaining > 0) {
        segments.push({ name: "Livre", size: allocation.remaining, tone: "free" });
    }

    map.replaceChildren();
    legend.replaceChildren();
    const scale = Math.max(network.blockSize, allocation.allocated);
    let cursor = 0;

    for (const segment of segments) {
        const block = blockTemplate.content.querySelector("rect").cloneNode(true);
        const item = legendTemplate.content.firstElementChild.cloneNode(true);
        const label = `${segment.name}: ${formatNumber(segment.size)} endereços`;

        block.dataset.tone = segment.tone;
        block.setAttribute("x", String(cursor / scale * 1000));
        block.setAttribute("width", String(segment.size / scale * 1000));
        block.querySelector("title").textContent = label;
        item.dataset.tone = segment.tone;
        item.querySelector(".legend-label").textContent = label;
        map.appendChild(block);
        legend.appendChild(item);
        cursor += segment.size;
    }
}

// A ocupação considera o bloco inteiro, incluindo rede, broadcast e folga.
function refreshPreview() {
    const count = sectorList.children.length;
    const panel = document.querySelector("#previewPanel");
    const progress = document.querySelector("#usedBar");
    const previewMessage = document.querySelector("#previewMessage");
    document.querySelector("#sectorCounter").textContent = `${count} ${count === 1 ? "setor" : "setores"}`;

    try {
        const network = parseNetwork(networkInput.value);
        const allocation = estimateAllocation(network, collectSectors());
        document.querySelector("#previewCidr").textContent = `/${network.prefix}`;
        document.querySelector("#capacityHosts").textContent = formatNumber(network.blockSize);
        document.querySelector("#requestedHosts").textContent = formatNumber(allocation.requested);
        document.querySelector("#allocatedAddresses").textContent = formatNumber(allocation.allocated);
        document.querySelector("#freeHosts").textContent = formatNumber(allocation.remaining);
        document.querySelector("#networkHint").textContent = `Rede normalizada: ${network.ip}/${network.prefix}. Antes da divisão: ${formatNumber(network.usable)} hosts utilizáveis.`;
        progress.max = network.blockSize;
        progress.value = Math.min(allocation.allocated, network.blockSize);
        panel.dataset.state = allocation.fits ? "valid" : "overflow";
        renderMiniMap(network, allocation);
        showMessage(previewMessage, allocation.fits ? "" : `Faltam ${formatNumber(allocation.allocated - network.blockSize)} endereços para acomodar os blocos.`, "error");
    } catch (error) {
        panel.dataset.state = "invalid";
        progress.value = 0;
        document.querySelector("#previewCidr").textContent = "—";
        ["capacityHosts", "requestedHosts", "allocatedAddresses", "freeHosts"].forEach(id => {
            document.getElementById(id).textContent = "—";
        });
        document.querySelector("#networkHint").textContent = "Revise a rede e os setores para atualizar a prévia.";
        document.querySelector("#miniMap").replaceChildren();
        document.querySelector("#mapLegend").replaceChildren();
        showMessage(previewMessage, error.message, "error");
    }
}

function renderResults(plan) {
    const body = document.querySelector("#resultsBody");
    const template = document.querySelector("#resultRowTemplate");
    body.replaceChildren();

    plan.results.forEach((result, index) => {
        const row = template.content.firstElementChild.cloneNode(true);
        const values = {
            name: result.name,
            hosts: `${formatNumber(result.hosts)} hosts`,
            subnet: `${result.network}/${result.prefix}`,
            mask: result.mask,
            range: `${result.firstHost} – ${result.lastHost}`,
            broadcast: result.broadcast,
            slack: `+${formatNumber(result.slack)}`
        };

        row.querySelector(".sector-badge").dataset.tone = index % 7;

        for (const [field, value] of Object.entries(values)) {
            row.querySelector(`[data-field="${field}"]`).textContent = value;
        }

        body.appendChild(row);
    });

    document.querySelector("#resultSubtitle").textContent = `Resultado para ${plan.network.ip}/${plan.network.prefix}, do maior para o menor bloco.`;
    document.querySelector("#summaryNetworks").textContent = formatNumber(plan.summary.subnets);
    document.querySelector("#summaryAllocated").textContent = formatNumber(plan.summary.allocated);
    document.querySelector("#summaryEfficiency").textContent = `${plan.summary.efficiency}%`;
    document.querySelector("#summaryRemaining").textContent = formatNumber(plan.summary.remaining);

    const example = plan.results[0];
    document.querySelector("#learningSector").textContent = `Exemplo: ${example.name}`;
    document.querySelector("#learningText").textContent = `Para ${formatNumber(example.hosts)} hosts, precisamos de ${example.hostBits} bits: 2 elevado a ${example.hostBits}, menos 2, resulta em ${formatNumber(example.capacity)} hosts utilizáveis. Prefixo adequado: `;
    document.querySelector("#learningPrefix").textContent = `/${example.prefix}.`;
    document.querySelector("#learningPlaceholder").hidden = true;
    document.querySelector("#learningExample").hidden = false;
    resultsSection.hidden = false;
    saveButton.disabled = false;
    exportButton.disabled = false;
}

function runCalculation() {
    try {
        latestPlan = createPlan(networkInput.value, collectSectors());
        renderResults(latestPlan);
        refreshPreview();
        showMessage(errorMessage);
        showMessage(resultMessage);
        saveButton.textContent = "Salvar rede";
        document.querySelector("#resultsTitle").focus({ preventScroll: true });
        resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        invalidateResults();
        showMessage(errorMessage, error.message);
    }
}

function saveGeneratedNetwork() {
    if (!latestPlan || saveButton.disabled) {
        return;
    }

    try {
        const item = savePlan(user.email, latestPlan);
        saveButton.disabled = true;
        saveButton.textContent = "Rede salva ✓";
        showMessage(resultMessage, "Planejamento salvo. Você pode reabri-lo pelo Histórico.", "success");
        const url = new URL(window.location.href);
        url.searchParams.set("plano", item.id);
        window.history.replaceState(null, "", url);
    } catch (error) {
        showMessage(resultMessage, error.message);
    }
}

function loadSavedPlan() {
    const id = new URL(window.location.href).searchParams.get("plano");

    if (!id) {
        return;
    }

    try {
        const item = findPlan(user.email, id);

        if (!item) {
            throw new Error("Este planejamento não foi encontrado no seu histórico.");
        }

        networkInput.value = item.network;
        setSectors(item.sectors);
        latestPlan = createPlan(item.network, item.sectors);
        renderResults(latestPlan);
        refreshPreview();
        saveButton.disabled = true;
        saveButton.textContent = "Rede salva ✓";
        showMessage(resultMessage, "Planejamento recuperado do histórico. Edite os dados para criar uma nova versão.", "success");
    } catch (error) {
        showMessage(document.querySelector("#pageMessage"), error.message);
    }
}

if (user) {
    document.querySelector("#planningForm").addEventListener("submit", event => {
        event.preventDefault();
        runCalculation();
    });

    document.querySelector("#addSector").addEventListener("click", () => {
        const row = addSector();

        if (row) {
            handleInputChange();
            row.querySelector(".sector-name").focus();
        }
    });

    document.querySelector("#loadExample").addEventListener("click", () => {
        networkInput.value = "10.10.0.0/23";
        setSectors(exampleSectors);
        handleInputChange();
    });

    networkInput.addEventListener("input", handleInputChange);
    saveButton.addEventListener("click", saveGeneratedNetwork);
    exportButton.addEventListener("click", () => {
        if (latestPlan) {
            downloadCsv(latestPlan);
        }
    });

    setSectors(initialSectors);
    refreshPreview();
    loadSavedPlan();
}
