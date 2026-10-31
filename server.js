import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const origins = [process.env.CLIENT_ORIGIN, process.env.ADMIN_ORIGIN].filter(Boolean);
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || origins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS."));
}, credentials: true }));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => res.json({ success: true, service: "Eman Jewelers API" }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", authLimiter, adminRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: "The requested endpoint was not found." }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ success: false, message: status === 500 ? "Something went wrong. Please try again." : err.message });
});

const port = Number(process.env.PORT) || 5000;
const start = async () => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error("MONGODB_URI and JWT_SECRET must be configured.");
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Eman Jewelers API listening on port ${port}`));
};
start().catch(error => { console.error("API startup failed:", error.message); process.exit(1); });
