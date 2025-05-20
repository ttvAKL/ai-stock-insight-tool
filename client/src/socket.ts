import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  
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

socket.on("update", (data) => {
  console.log("[Client] Received update", data);
});

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});