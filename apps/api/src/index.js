import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { prisma } from "@team-hub/db";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import goalRoutes from "./routes/goals.js";
import milestoneRoutes from "./routes/milestones.js";
import actionItemRoutes from "./routes/actionItems.js";
import announcementRoutes from "./routes/announcements.js";
import analyticsRoutes from "./routes/analytics.js";
import userRoutes from "./routes/users.js";
import { emitPresenceUpdate } from "./services/socket.js";
import { verifyToken } from "./utils/jwt.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    credentials: true
  }
});
app.set("io", io);

const onlineUsers = new Map();

const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join("="));
  });

  return cookies;
};

const addOnlineUser = (workspaceId, userId) => {
  let set = onlineUsers.get(workspaceId);
  if (!set) {
    set = new Set();
    onlineUsers.set(workspaceId, set);
  }
  set.add(userId);
  emitPresenceUpdate(io, workspaceId, Array.from(set));
};

const removeOnlineUser = (workspaceId, userId) => {
  const set = onlineUsers.get(workspaceId);
  if (!set) return;
  set.delete(userId);
  const updated = Array.from(set);
  if (set.size === 0) {
    onlineUsers.delete(workspaceId);
  }
  emitPresenceUpdate(io, workspaceId, updated);
};

io.on("connection", async (socket) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const token = cookies.accessToken;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    let payload;
    try {
      payload = verifyToken(token, "access");
    } catch (error) {
      socket.disconnect(true);
      return;
    }

    const userId = payload.userId || payload.id;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.data.userId = userId;
    socket.join(`user:${userId}`);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    const workspaceIds = memberships.map((member) => member.workspaceId);
    socket.data.workspaceIds = workspaceIds;
    socket.data.joinedWorkspaces = new Set();

    const joinWorkspace = (workspaceId) => {
      if (!workspaceId) return;
      if (!workspaceIds.includes(workspaceId)) return;
      if (socket.data.joinedWorkspaces.has(workspaceId)) return;
      socket.join(`workspace:${workspaceId}`);
      socket.data.joinedWorkspaces.add(workspaceId);
      addOnlineUser(workspaceId, userId);
    };

    const leaveWorkspace = (workspaceId) => {
      if (!workspaceId) return;
      if (!socket.data.joinedWorkspaces.has(workspaceId)) return;
      socket.leave(`workspace:${workspaceId}`);
      socket.data.joinedWorkspaces.delete(workspaceId);
      removeOnlineUser(workspaceId, userId);
    };

    socket.on("join:workspace", (payload) => {
      const workspaceId = Number(payload?.workspaceId);
      joinWorkspace(workspaceId);
    });

    socket.on("leave:workspace", (payload) => {
      const workspaceId = Number(payload?.workspaceId);
      leaveWorkspace(workspaceId);
    });

    socket.on("disconnect", () => {
      socket.data.joinedWorkspaces.forEach((workspaceId) => {
        removeOnlineUser(workspaceId, userId);
      });
    });
  } catch (error) {
    socket.disconnect(true);
  }
});

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

app.use((err, req, res, next) => {
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

const port = Number(process.env.API_PORT || process.env.PORT || 5000);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
