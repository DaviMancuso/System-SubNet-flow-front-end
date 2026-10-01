const ADDRESS_SPACE = 2 ** 32;

// As operações aritméticas evitam o sinal negativo dos inteiros de 32 bits do JavaScript.
export function ipToNumber(ip) {
    const octets = ip.split(".");

    if (octets.length !== 4 || octets.some(octet => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)) {
        throw new Error("Informe um endereço IPv4 válido, com quatro números entre 0 e 255.");
    }

    return octets.reduce((number, octet) => number * 256 + Number(octet), 0);
}

export function numberToIp(number) {
    if (!Number.isInteger(number) || number < 0 || number >= ADDRESS_SPACE) {
        throw new Error("O endereço calculado está fora do intervalo IPv4.");
    }

    return [24, 16, 8, 0]
        .map(bits => Math.floor(number / 2 ** bits) % 256)
        .join(".");
}

export function prefixToMask(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error("O prefixo CIDR deve estar entre /0 e /32.");
    }

    return numberToIp(ADDRESS_SPACE - 2 ** (32 - prefix));
}

// Este planejador mantém a regra de redes LAN: um endereço de rede e um de broadcast.
export function parseNetwork(value) {
    const match = String(value).trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);

    if (!match) {
        throw new Error("Use o formato IPv4/CIDR, por exemplo: 192.168.10.0/24.");
    }

    const ipNumber = ipToNumber(match[1]);
    const prefix = Number(match[2]);

    if (prefix > 32) {
        throw new Error("O prefixo CIDR deve estar entre /0 e /32.");
    }

    if (prefix > 30) {
        throw new Error("Este planejador LAN usa prefixos de /0 a /30. /31 é destinado a enlaces ponto a ponto e /32 representa um único endereço.");
    }

    const blockSize = 2 ** (32 - prefix);
    const networkNumber = Math.floor(ipNumber / blockSize) * blockSize;

    return {
        ip: numberToIp(networkNumber),
        networkNumber,
        prefix,
        blockSize,
        usable: blockSize - 2
    };
}
