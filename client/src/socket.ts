import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  autoConnect: true,
  auth: () => ({
    token: localStorage.getItem("jwt_token") || "",
  }),
});

export { socket };

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});