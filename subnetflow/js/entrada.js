// Módulos JavaScript precisam de um servidor estático, como o Live Server.
if (window.location.protocol === "file:") {
    document.querySelector("#entryStatus").textContent = "Inicie o projeto em um servidor local.";
    document.querySelector("#localHelp").hidden = false;
} else {
    window.location.replace(new URL("html/inicio/index.html", window.location.href));
}
