// O prefixo de texto evita que nomes de setores sejam interpretados como fórmulas no Excel.
function escapeCsvCell(value) {
    let text = String(value);

    if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) {
        text = `'${text}`;
    }

    return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(results) {
    const rows = [["Setor", "Hosts solicitados", "Sub-rede", "Máscara", "Primeiro host", "Último host", "Broadcast", "Folga"]];

    for (const result of results) {
        rows.push([
            result.name,
            result.hosts,
            `${result.network}/${result.prefix}`,
            result.mask,
            result.firstHost,
            result.lastHost,
            result.broadcast,
            result.slack
        ]);
    }

    return "\uFEFF" + rows.map(row => row.map(escapeCsvCell).join(";")).join("\r\n");
}

export function downloadCsv(plan) {
    const blob = new Blob([buildCsv(plan.results)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `subnetflow-${plan.network.ip}-${plan.network.prefix}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
