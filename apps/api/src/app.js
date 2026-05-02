import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import goalRoutes from "./routes/goals.js";
import milestoneRoutes from "./routes/milestones.js";
import actionItemRoutes from "./routes/actionItems.js";
import announcementRoutes from "./routes/announcements.js";
import analyticsRoutes from "./routes/analytics.js";
import userRoutes from "./routes/users.js";
import { ApiError } from "./utils/ApiError.js";

export function createApp() {
  const app = express();

  // On serverless targets (e.g. Vercel), io is not attached.
  app.set("io", null);

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : true;

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true
    })
  );
  app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "team-hub-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/workspaces/:workspaceId/goals", goalRoutes);
  app.use("/api/goals/:goalId/milestones", milestoneRoutes);
  app.use("/api/workspaces/:workspaceId/action-items", actionItemRoutes);
  app.use("/api/workspaces/:workspaceId/announcements", announcementRoutes);
  app.use("/api/workspaces/:workspaceId/analytics", analyticsRoutes);
  app.use("/api/users", userRoutes);

  app.use((req, res, next) => {
    next(new ApiError(404, "Route not found"));
  });

  app.use((err, req, res, _next) => {
    const status = err.statusCode || 500;
    const payload = {
      message: err.message || "Internal server error"
    };

    if (err.details) {
      payload.details = err.details;
    }

    if (process.env.NODE_ENV !== "production" && err.stack) {
      payload.stack = err.stack;
    }

    res.status(status).json(payload);
  });

  return app;
}
