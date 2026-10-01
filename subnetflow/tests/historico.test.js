import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createPlan } from "../js/core/vlsm.js";
import { buildCsv } from "../js/servicos/exportacao.js";
import { clearHistory, deletePlan, findPlan, getHistory, savePlan } from "../js/servicos/historico.js";
import { endSession, getSession, startSession } from "../js/servicos/sessao.js";

// O armazenamento em memória permite verificar os serviços sem dados reais de usuários.
class MemoryStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }

    removeItem(key) {
        this.values.delete(key);
    }
}

beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: new MemoryStorage() });
});

function samplePlan(name = "Administrativo") {
    return createPlan("192.168.10.0/24", [{ name, hosts: 50 }]);
}

test("salva e reabre o planejamento completo sem campos indefinidos", () => {
    const saved = savePlan("teste@example.com", samplePlan());
    const loaded = findPlan("teste@example.com", saved.id);
    assert.equal(loaded.network, "192.168.10.0/24");
    assert.deepEqual(loaded.sectors, [{ name: "Administrativo", hosts: 50 }]);
    assert.deepEqual(createPlan(loaded.network, loaded.sectors).results, samplePlan().results);
    assert.equal(createPlan(loaded.network, loaded.sectors).summary.efficiency, 81);
});

test("separa os históricos por e-mail e normaliza maiúsculas", () => {
    savePlan("TESTE@example.com", samplePlan());
    assert.equal(getHistory("teste@example.com").length, 1);
    assert.equal(getHistory("outro@example.com").length, 0);
});

test("salva em HTTP quando randomUUID não está disponível", () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: { getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto) }
    });

    try {
        const first = savePlan("teste@example.com", samplePlan());
        const second = savePlan("teste@example.com", samplePlan());
        assert.match(first.id, /^[a-f0-9]{32}$/);
        assert.notEqual(first.id, second.id);
    } finally {
        Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
    }
});

test("excluir e limpar afetam apenas a conta correspondente", () => {
    const first = savePlan("a@example.com", samplePlan());
    savePlan("a@example.com", samplePlan("TI"));
    savePlan("b@example.com", samplePlan());
    assert.equal(deletePlan("a@example.com", first.id).length, 1);
    clearHistory("a@example.com");
    assert.equal(getHistory("a@example.com").length, 0);
    assert.equal(getHistory("b@example.com").length, 1);
});

test("histórico novo começa vazio sem apagar o histórico legado", () => {
    localStorage.setItem("subnetflow_demo_history", '[{"id":1}]');
    assert.deepEqual(getHistory("teste@example.com"), []);
    assert.equal(localStorage.getItem("subnetflow_demo_history"), '[{"id":1}]');
});

test("dados corrompidos são preservados e impedem sobrescrita silenciosa", () => {
    const key = "subnetflow_history_v2:teste@example.com";

    for (const raw of ["{corrompido", "null", "{}", '[{"id":"a"}]']) {
        localStorage.setItem(key, raw);
        assert.throws(() => savePlan("teste@example.com", samplePlan()));
        assert.equal(localStorage.getItem(key), raw);
    }
});

test("falha de gravação é propagada em vez de anunciar sucesso", () => {
    localStorage.setItem = () => {
        throw new Error("QuotaExceededError");
    };

    assert.throws(() => savePlan("teste@example.com", samplePlan()), /Não foi possível salvar/);
});

test("sessão valida os dados, não guarda senha e pode ser encerrada", () => {
    startSession("Teste", " TESTE@example.com ");
    assert.deepEqual(getSession(), { name: "Teste", email: "teste@example.com" });
    assert.throws(() => startSession("Teste", "email-invalido"));
    endSession();
    assert.equal(getSession(), null);
});

test("CSV mantém acentos, aspas, delimitador e proteção contra fórmulas", () => {
    const csv = buildCsv(samplePlan('Recepção; "TI"').results);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes('"Recepção; ""TI"""'));
    assert.ok(csv.includes("192.168.10.0/26"));
    assert.ok(csv.includes("\r\n"));
    assert.ok(buildCsv(samplePlan("=1+1").results).includes('"\'=1+1"'));
});
