// Erros de leitura não são tratados como histórico vazio, para evitar sobrescrever dados.
export function readJson(key, fallback, area = "localStorage") {
    let value;

    try {
        value = globalThis[area].getItem(key);
    } catch {
        throw new Error("O navegador bloqueou o armazenamento. Permita os dados deste site e tente novamente.");
    }

    if (value === null) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        throw new Error("Não foi possível ler os dados salvos neste navegador. Eles foram preservados.");
    }
}

export function writeJson(key, value, area = "localStorage") {
    try {
        globalThis[area].setItem(key, JSON.stringify(value));
    } catch {
        throw new Error("Não foi possível salvar. O armazenamento do navegador pode estar bloqueado ou cheio.");
    }
}

export function removeStoredValue(key, area = "localStorage") {
    try {
        globalThis[area].removeItem(key);
    } catch {
        throw new Error("Não foi possível encerrar a sessão. Verifique as permissões de armazenamento do navegador.");
    }
}
