import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { emitToWorkspace } from "../services/socket.js";

export const createMilestone = asyncHandler(async (req, res) => {
  const goalId = Number(req.params.goalId);
  const { title, progress } = req.body;

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new ApiError(404, "Goal not found");
  }

  const milestone = await prisma.milestone.create({
    data: {
      goalId,
      title,
      progress: progress ?? undefined
    }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, goal.workspaceId, "milestone:created", { milestone, goalId });

  res.status(201).json({ milestone });
});

export const updateMilestone = asyncHandler(async (req, res) => {
  const goalId = Number(req.params.goalId);
  const id = Number(req.params.id);
  const { title, progress } = req.body;

  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { goal: true }
  });

  if (!existing) {
    throw new ApiError(404, "Milestone not found");
  }

  const nextProgress = progress ?? existing.progress;
  const completedAt = nextProgress >= 100 ? new Date() : null;

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      title,
      progress: nextProgress,
      completedAt
    }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, existing.goal.workspaceId, "milestone:updated", { milestone, goalId });

  res.json({ milestone });
});

export const deleteMilestone = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { goal: true }
  });

  if (!existing) {
    throw new ApiError(404, "Milestone not found");
  }

  await prisma.milestone.delete({ where: { id } });

  const io = req.app.get("io");
  emitToWorkspace(io, existing.goal.workspaceId, "milestone:deleted", {
    milestoneId: id,
    goalId: existing.goalId
  });

  res.json({ ok: true });
});
