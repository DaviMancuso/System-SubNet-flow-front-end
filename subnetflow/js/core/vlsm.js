import { numberToIp, parseNetwork, prefixToMask } from "./ipv4.js";

export const MAX_HOSTS = 2 ** 32 - 2;
export const MAX_SECTORS = 256;

// A validação também é utilizada ao reabrir um plano salvo, sem depender do formulário.
export function normalizeSectors(sectors) {
    if (!Array.isArray(sectors) || sectors.length === 0) {
        throw new Error("O planejamento precisa ter pelo menos um setor.");
    }

    if (sectors.length > MAX_SECTORS) {
        throw new Error(`O planejamento aceita até ${MAX_SECTORS} setores.`);
    }

    return sectors.map((sector, index) => {
        const name = typeof sector?.name === "string" ? sector.name.trim() : "";
        const hosts = sector?.hosts;

        if (!name || name.length > 60) {
            throw new Error(`Informe um nome de até 60 caracteres para o setor ${index + 1}.`);
        }

        if (!Number.isSafeInteger(hosts) || hosts < 1 || hosts > MAX_HOSTS) {
            throw new Error(`A quantidade de hosts de “${name}” deve ser um inteiro entre 1 e ${MAX_HOSTS.toLocaleString("pt-BR")}.`);
        }

        return { name, hosts, originalIndex: index };
    });
}

export function requiredBlock(hosts) {
    if (!Number.isSafeInteger(hosts) || hosts < 1 || hosts > MAX_HOSTS) {
        throw new Error("A quantidade de hosts está fora do intervalo IPv4.");
    }

    let hostBits = 2;

    while (2 ** hostBits - 2 < hosts) {
        hostBits++;
    }

    return {
        hostBits,
        blockSize: 2 ** hostBits,
        prefix: 32 - hostBits,
        capacity: 2 ** hostBits - 2
    };
}

export function estimateAllocation(network, sectors) {
    const blocks = normalizeSectors(sectors)
        .map(sector => ({ ...sector, ...requiredBlock(sector.hosts) }))
        .sort((first, second) => second.blockSize - first.blockSize || first.originalIndex - second.originalIndex);

    const requested = blocks.reduce((total, sector) => total + sector.hosts, 0);
    const allocated = blocks.reduce((total, sector) => total + sector.blockSize, 0);

    return {
        blocks,
        requested,
        allocated,
        remaining: Math.max(0, network.blockSize - allocated),
        fits: allocated <= network.blockSize
    };
}

// Os maiores blocos vêm primeiro; cada início é alinhado ao tamanho da própria sub-rede.
export function calculateVlsm(network, sectors) {
    const allocation = estimateAllocation(network, sectors);

    if (!allocation.fits) {
        throw new Error(`A rede ${network.ip}/${network.prefix} possui ${network.blockSize.toLocaleString("pt-BR")} endereços, mas os blocos dos setores precisam de ${allocation.allocated.toLocaleString("pt-BR")}. Reduza a demanda ou use uma rede maior.`);
    }

    let cursor = network.networkNumber;
    const limit = network.networkNumber + network.blockSize;

    return allocation.blocks.map(sector => {
        cursor = Math.ceil(cursor / sector.blockSize) * sector.blockSize;

        if (cursor + sector.blockSize > limit) {
            throw new Error("As sub-redes ultrapassam o limite da rede principal.");
        }

        const result = {
            ...sector,
            network: numberToIp(cursor),
            firstHost: numberToIp(cursor + 1),
            lastHost: numberToIp(cursor + sector.blockSize - 2),
            broadcast: numberToIp(cursor + sector.blockSize - 1),
            mask: prefixToMask(sector.prefix),
            slack: sector.capacity - sector.hosts
        };

        cursor += sector.blockSize;
        return result;
    });
}

export function createPlan(networkValue, sectorValues) {
    const network = parseNetwork(networkValue);
    const sectors = normalizeSectors(sectorValues);
    const results = calculateVlsm(network, sectors);
    const allocated = results.reduce((total, sector) => total + sector.blockSize, 0);
    const requested = sectors.reduce((total, sector) => total + sector.hosts, 0);
    const capacity = results.reduce((total, sector) => total + sector.capacity, 0);

    return {
        network,
        sectors,
        results,
        summary: {
            subnets: results.length,
            requested,
            allocated,
            capacity,
            remaining: network.blockSize - allocated,
            efficiency: Math.round(requested / capacity * 100)
        }
    };
}
