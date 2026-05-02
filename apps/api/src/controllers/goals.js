import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { emitGoalUpdate, emitStatusChange, emitToWorkspace } from "../services/socket.js";

export const listGoals = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const where = { workspaceId };

  if (req.query.status) {
    where.status = req.query.status;
  }

  const goals = await prisma.goal.findMany({
    where,
    include: {
      _count: {
        select: {
          milestones: true,
          actionItems: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const formatted = goals.map(({ _count, ...goal }) => ({
    ...goal,
    milestoneCount: _count.milestones,
    actionItemCount: _count.actionItems
  }));

  res.json({ goals: formatted });
});

export const createGoal = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  if (!ownerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const workspaceId = Number(req.params.workspaceId);
  const { title, dueDate, status, description } = req.body;

  const goal = await prisma.goal.create({
    data: {
      title,
      workspaceId,
      ownerId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status,
      description
    }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "goal:created", { goal });

  res.status(201).json({ goal });
});

export const getGoal = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);

  const goal = await prisma.goal.findFirst({
    where: { id, workspaceId },
    include: {
      milestones: true,
      updates: {
        orderBy: { createdAt: "desc" }
      },
      actionItems: true
    }
  });

  if (!goal) {
    throw new ApiError(404, "Goal not found");
  }

  res.json({ goal });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);
  const { title, dueDate, status, description } = req.body;

  const existing = await prisma.goal.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Goal not found");
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status,
      description
    }
  });

  const io = req.app.get("io");
  emitStatusChange(io, workspaceId, {
    entity: "goal",
    id: goal.id,
    status: goal.status
  });

  res.json({ goal });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);

  const existing = await prisma.goal.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Goal not found");
  }

  await prisma.goal.delete({ where: { id } });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "goal:deleted", { goalId: id });

  res.json({ ok: true });
});

export const getGoalFeed = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const goal = await prisma.goal.findFirst({ where: { id, workspaceId } });
  if (!goal) {
    throw new ApiError(404, "Goal not found");
  }

  const [updates, total] = await Promise.all([
    prisma.goalUpdate.findMany({
      where: { goalId: id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.goalUpdate.count({ where: { goalId: id } })
  ]);

  res.json({ updates, page, pageSize, total });
});

export const postGoalUpdate = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const goalId = Number(req.params.id);
  const authorId = req.user?.id;
  const { content } = req.body;

  if (!authorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const goal = await prisma.goal.findFirst({ where: { id: goalId, workspaceId } });
  if (!goal) {
    throw new ApiError(404, "Goal not found");
  }

  const update = await prisma.goalUpdate.create({
    data: {
      goalId,
      authorId,
      content
    }
  });

  const io = req.app.get("io");
  emitGoalUpdate(io, workspaceId, {
    ...update,
    goalId
  });

  res.status(201).json({ update });
});
