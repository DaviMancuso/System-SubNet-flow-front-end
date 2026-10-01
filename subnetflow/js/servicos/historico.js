import { createPlan } from "../core/vlsm.js";
import { readJson, writeJson } from "./armazenamento.js";
import { normalizeEmail } from "./sessao.js";

function historyKey(email) {
    return `subnetflow_history_v2:${normalizeEmail(email)}`;
}

function createPlanId() {
    if (typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }

    // randomUUID exige contexto seguro; esta alternativa também funciona em HTTP local.
    const values = globalThis.crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, value => value.toString(16).padStart(8, "0")).join("");
}

// Cada registro guarda as entradas completas; os resultados são recalculados ao abrir.
export function getHistory(email) {
    const items = readJson(historyKey(email), []);

    if (!Array.isArray(items)) {
        throw new Error("O histórico está em um formato inválido. Os dados originais foram preservados.");
    }

    const ids = new Set();

    try {
        return items.map(item => {
            if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id) || typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) {
                throw new Error("Registro inválido.");
            }

            ids.add(item.id);
            const plan = createPlan(item.network, item.sectors);

            return {
                id: item.id,
                createdAt: item.createdAt,
                network: `${plan.network.ip}/${plan.network.prefix}`,
                sectors: plan.sectors.map(({ name, hosts }) => ({ name, hosts }))
            };
        });
    } catch {
        throw new Error("Há um registro inválido no histórico. Os dados foram preservados; nenhum novo registro será gravado até corrigir os dados locais.");
    }
}

export function savePlan(email, plan) {
    const history = getHistory(email);
    const verified = createPlan(`${plan.network.ip}/${plan.network.prefix}`, plan.sectors);
    const item = {
        id: createPlanId(),
        createdAt: new Date().toISOString(),
        network: `${verified.network.ip}/${verified.network.prefix}`,
        sectors: verified.sectors.map(({ name, hosts }) => ({ name, hosts }))
    };

    writeJson(historyKey(email), [item, ...history]);
    return item;
}

export function deletePlan(email, id) {
    const history = getHistory(email).filter(item => item.id !== id);
    writeJson(historyKey(email), history);
    return history;
}

export function clearHistory(email) {
    getHistory(email);
    writeJson(historyKey(email), []);
}

export function findPlan(email, id) {
    return getHistory(email).find(item => item.id === id) ?? null;
}
