// server/index.js or app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { servicesRouter } from "./routes/services.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { mechanicsRouter } from "./routes/mechanics.routes";
import { initSocket } from "./socket";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/auth";
import { authRouter } from "./routes/auth.routes";
import savedLocationRouter from "./routes/savedLocations.routes";

const app = express();
app.use(cookieParser());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// Initialize socket with all event handlers
initSocket(io);

app.use(cors({ origin: "*", credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't crash the server, just log it
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't crash the server, just log it
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roadside-assistance-api" });
});

app.use("/api/services", servicesRouter);
app.use("/api/auth", authRouter);
app.use("/api/bookings", authMiddleware, bookingsRouter);
app.use("/api/mechanics", authMiddleware, mechanicsRouter);
app.use("/api/location", authMiddleware, savedLocationRouter);
app.post("/api/directions", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    const apiKey = "AIzaSyDwLkPpLwhKZfnkZ1e3W_cdg78xfS6fvfM";

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.append("origin", `${origin.latitude},${origin.longitude}`);
    url.searchParams.append(
      "destination",
      `${destination.latitude},${destination.longitude}`,
    );
    url.searchParams.append("key", apiKey);
    url.searchParams.append("mode", "driving");

    const response = await fetch(url.toString());
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch directions" });
  }
});
server.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});
