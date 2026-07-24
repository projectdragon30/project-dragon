import { bootstrapApplication } from "./app/bootstrap.js";

bootstrapApplication().catch((error) => {
  console.error("[PROJECT DRAGON] Error de inicialización.", error);
  const container = document.querySelector("#notification-center");
  if (container) {
    const message = document.createElement("p");
    message.className = "notification notification--error";
    message.setAttribute("role", "alert");
    message.textContent = "No fue posible iniciar el mapa. Recarga la página para intentarlo nuevamente.";
    container.replaceChildren(message);
  }
});
