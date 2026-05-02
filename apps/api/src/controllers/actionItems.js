import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { emitStatusChange, emitToWorkspace } from "../services/socket.js";

export const listActionItems = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const where = { workspaceId };

  if (req.query.assigneeId) {
    where.assigneeId = Number(req.query.assigneeId);
  }

  if (req.query.status) {
    where.status = req.query.status;
  }

  if (req.query.priority) {
    where.priority = req.query.priority;
  }

  const actionItems = await prisma.actionItem.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  res.json({ actionItems });
});

export const createActionItem = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const { title, assigneeId, goalId, priority, status, dueDate } = req.body;

  const actionItem = await prisma.actionItem.create({
    data: {
      title,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      goalId: goalId ? Number(goalId) : undefined,
      workspaceId,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined
    }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "actionItem:created", { actionItem });

  res.status(201).json({ actionItem });
});

export const updateActionItem = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);
  const { title, assigneeId, goalId, priority, status, dueDate } = req.body;

  const existing = await prisma.actionItem.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Action item not found");
  }

  const actionItem = await prisma.actionItem.update({
    where: { id },
    data: {
      title,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      goalId: goalId ? Number(goalId) : undefined,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined
    }
  });

  const io = req.app.get("io");
  emitStatusChange(io, workspaceId, {
    entity: "actionItem",
    id,
    status: actionItem.status
  });

  res.json({ actionItem });
});

export const deleteActionItem = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);

  const existing = await prisma.actionItem.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Action item not found");
  }

  await prisma.actionItem.delete({ where: { id } });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "actionItem:deleted", { actionItemId: id });

  res.json({ ok: true });
});
