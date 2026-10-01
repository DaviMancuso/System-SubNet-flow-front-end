import assert from "node:assert/strict";
import test from "node:test";
import { ipToNumber, numberToIp, parseNetwork, prefixToMask } from "../js/core/ipv4.js";
import { createPlan, estimateAllocation, MAX_HOSTS, requiredBlock } from "../js/core/vlsm.js";

// Exemplos conhecidos e fronteiras evitam regressões no cálculo de endereços.
test("normaliza um IP de host para a rede /26", () => {
    const network = parseNetwork("192.168.1.50/26");
    assert.equal(network.ip, "192.168.1.0");
    assert.equal(network.blockSize, 64);
    assert.equal(network.usable, 62);
    assert.equal(prefixToMask(26), "255.255.255.192");
});

test("converte os extremos IPv4 sem overflow ou sinal negativo", () => {
    assert.equal(ipToNumber("255.255.255.255"), 4294967295);
    assert.equal(numberToIp(4294967295), "255.255.255.255");
    assert.equal(numberToIp(0), "0.0.0.0");
    assert.equal(prefixToMask(0), "0.0.0.0");
    assert.equal(prefixToMask(32), "255.255.255.255");
    assert.throws(() => numberToIp(4294967296));
});

test("recusa IPv4 inválido, CIDR inválido e redes fora do escopo LAN", () => {
    for (const value of ["256.1.1.1/24", "192.168.1/24", "192.168.1.1", "1.2.3.4/-1", "1.2.3.4/33", "abc/24"]) {
        assert.throws(() => parseNetwork(value), undefined, value);
    }

    assert.throws(() => parseNetwork("192.168.1.0/31"), /ponto a ponto/);
    assert.throws(() => parseNetwork("192.168.1.0/32"), /único endereço/);
});

test("escolhe o menor bloco suficiente nos limites de capacidade", () => {
    for (const [hosts, prefix] of [[1, 30], [2, 30], [3, 29], [6, 29], [7, 28], [62, 26], [63, 25], [254, 24], [255, 23], [MAX_HOSTS, 0]]) {
        assert.equal(requiredBlock(hosts).prefix, prefix);
    }

    for (const hosts of [0, -1, 1.5, NaN, Infinity, MAX_HOSTS + 1, "5"]) {
        assert.throws(() => requiredBlock(hosts));
    }
});

test("gera o plano original com endereços, folgas e resumo corretos", () => {
    const plan = createPlan("192.168.10.0/24", [
        { name: "Administrativo", hosts: 50 },
        { name: "Financeiro", hosts: 25 },
        { name: "Tecnologia", hosts: 10 },
        { name: "Servidores", hosts: 2 }
    ]);

    assert.deepEqual(plan.results.map(result => `${result.network}/${result.prefix}`), [
        "192.168.10.0/26", "192.168.10.64/27", "192.168.10.96/28", "192.168.10.112/30"
    ]);
    assert.equal(plan.results[0].firstHost, "192.168.10.1");
    assert.equal(plan.results[0].lastHost, "192.168.10.62");
    assert.equal(plan.results[0].broadcast, "192.168.10.63");
    assert.equal(plan.results[3].broadcast, "192.168.10.115");
    assert.deepEqual(plan.summary, {
        subnets: 4,
        requested: 87,
        allocated: 116,
        capacity: 108,
        remaining: 140,
        efficiency: 81
    });
});

test("ordena por bloco, preserva empates e não modifica a lista recebida", () => {
    const sectors = [
        { name: "Pequeno A", hosts: 2 },
        { name: "Grande", hosts: 50 },
        { name: "Pequeno B", hosts: 1 }
    ];
    const before = structuredClone(sectors);
    const plan = createPlan("10.0.0.0/24", sectors);
    assert.deepEqual(plan.results.map(result => result.name), ["Grande", "Pequeno A", "Pequeno B"]);
    assert.deepEqual(sectors, before);
});

test("detecta falta de espaço mesmo quando a soma dos hosts parece caber", () => {
    const sectors = [{ name: "A", hosts: 2 }, { name: "B", hosts: 3 }];
    const preview = estimateAllocation(parseNetwork("10.0.0.0/29"), sectors);
    assert.equal(preview.requested, 5);
    assert.equal(preview.allocated, 12);
    assert.equal(preview.fits, false);
    assert.throws(() => createPlan("10.0.0.0/29", sectors), /precisam de 12/);
});

test("aceita preenchimento exato da rede e o último bloco IPv4", () => {
    const exact = createPlan("10.0.0.0/29", [{ name: "A", hosts: 2 }, { name: "B", hosts: 2 }]);
    assert.equal(exact.summary.remaining, 0);
    const last = createPlan("255.255.255.253/30", [{ name: "Último", hosts: 2 }]);
    assert.equal(last.results[0].network, "255.255.255.252");
    assert.equal(last.results[0].lastHost, "255.255.255.254");
    assert.equal(last.results[0].broadcast, "255.255.255.255");
});

test("calcula /0 sem estourar o intervalo numérico", () => {
    const plan = createPlan("192.168.1.1/0", [{ name: "Toda a faixa", hosts: MAX_HOSTS }]);
    assert.equal(plan.results[0].network, "0.0.0.0");
    assert.equal(plan.results[0].firstHost, "0.0.0.1");
    assert.equal(plan.results[0].lastHost, "255.255.255.254");
    assert.equal(plan.results[0].broadcast, "255.255.255.255");
    assert.equal(plan.summary.remaining, 0);
});

test("rejeita setores vazios e demandas inválidas", () => {
    for (const sectors of [[], null, [{ name: " ", hosts: 2 }], [{ name: "A", hosts: 0 }], [{ name: "A", hosts: 2.2 }]]) {
        assert.throws(() => createPlan("10.0.0.0/24", sectors));
    }
});

test("mantém todos os blocos alinhados, dentro da rede e sem sobreposição", () => {
    for (let size = 1; size <= 40; size++) {
        const sectors = Array.from({ length: size }, (_, index) => ({
            name: `Setor ${index + 1}`,
            hosts: (index * 37 + size * 13) % 300 + 1
        }));
        const plan = createPlan("172.16.0.0/16", sectors);
        let end = plan.network.networkNumber;

        for (const result of plan.results) {
            const start = ipToNumber(result.network);
            assert.ok(start >= end);
            assert.equal(start % result.blockSize, 0);
            assert.ok(result.capacity >= result.hosts);
            assert.ok(result.blockSize === 4 || result.blockSize / 2 - 2 < result.hosts);
            end = ipToNumber(result.broadcast) + 1;
            assert.ok(end <= plan.network.networkNumber + plan.network.blockSize);
        }
    }
});
