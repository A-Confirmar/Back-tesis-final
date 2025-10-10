import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server);

  io.on("connection", (socket) => {
    logToPage("🔌 Socket conectado: " + socket.id);

    socket.on("disconnect", () => {
      logToPage("❌ Socket desconectado: " + socket.id);
    });
  });
}

export function logToPage(mensaje) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `${timestamp} - ${mensaje}`;

  // Log en consola
  console.log(logMessage);

  // Enviar a todos log a la terminal
  io.emit("server-log", logMessage);
}

export function logErrorToPage(mensaje) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `${timestamp} - ${mensaje}`;

  // Log en consola
  console.log(logMessage);

  // Enviar a todos log a la terminal
  io.emit("server-log-error", logMessage);
}

