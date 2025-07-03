import { io } from "socket.io-client";

const socket = io(`${import.meta.env.VITE_API_URL}`, {
  
  transports: ["websocket"],
  autoConnect: true,
  auth: {
    token: localStorage.getItem("jwtToken") || "",
  },
});

console.log("[Client] Attempting to connect to Socket.IO server...", localStorage.getItem("jwtToken"));

export { socket };

socket.on("connect", () => {
  console.log("[Client] Socket connected with ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("[Client] connect_error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.warn("[Client] Socket disconnected:", reason);
});

// Debug: log any received event
socket.onAny((event, ...args) => {
  console.log(`[Client] Event received: ${event}`, args);
});

socket.on("update", (data) => {
  console.log("[Client] Received update", data);
});