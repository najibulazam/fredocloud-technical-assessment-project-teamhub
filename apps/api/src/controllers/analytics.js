import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const getStats = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const now = new Date();
  const weekStart = startOfWeek(now);
  const activeSince = new Date(now);
  activeSince.setDate(activeSince.getDate() - 7);

  const [totalGoals, totalGoalsLastWeek, completedThisWeek, overdueGoals, overdueActionItems] =
    await Promise.all([
    prisma.goal.count({ where: { workspaceId } }),
    prisma.goal.count({
      where: {
        workspaceId,
        createdAt: { lt: weekStart }
      }
    }),
    prisma.goal.count({
      where: {
        workspaceId,
        status: "COMPLETED",
        updatedAt: { gte: weekStart }
      }
    }),
    prisma.goal.count({
      where: {
        workspaceId,
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] }
      }
      }),
      prisma.actionItem.count({
        where: {
          workspaceId,
          dueDate: { lt: now },
          status: { in: ["TODO", "IN_PROGRESS"] }
        }
      })
    ]);

  const [recentAnnouncements, recentComments, recentGoalUpdates, recentGoals, recentActionItems] =
    await Promise.all([
      prisma.announcement.findMany({
        where: { workspaceId, createdAt: { gte: activeSince } },
        select: { authorId: true }
      }),
      prisma.comment.findMany({
        where: { createdAt: { gte: activeSince }, announcement: { workspaceId } },
        select: { authorId: true }
      }),
      prisma.goalUpdate.findMany({
        where: { goal: { workspaceId }, createdAt: { gte: activeSince } },
        select: { authorId: true }
      }),
      prisma.goal.findMany({
        where: { workspaceId, createdAt: { gte: activeSince } },
        select: { ownerId: true }
      }),
      prisma.actionItem.findMany({
        where: { workspaceId, updatedAt: { gte: activeSince } },
        select: { assigneeId: true }
      })
    ]);

  const activeIds = new Set();
  recentAnnouncements.forEach((item) => activeIds.add(item.authorId));
  recentComments.forEach((item) => activeIds.add(item.authorId));
  recentGoalUpdates.forEach((item) => activeIds.add(item.authorId));
  recentGoals.forEach((item) => activeIds.add(item.ownerId));
  recentActionItems.forEach((item) => {
    if (item.assigneeId) {
      activeIds.add(item.assigneeId);
    }
  });

  res.json({
    totalGoals,
    totalGoalsLastWeek,
    completedThisWeek,
    overdue: overdueGoals + overdueActionItems,
    activeMembers: activeIds.size
  });
});

export const getChart = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const now = new Date();
  const currentWeek = startOfWeek(now);
  const start = new Date(currentWeek);
  start.setDate(start.getDate() - 7 * 11);

  const [completedGoals, createdGoals] = await Promise.all([
    prisma.goal.findMany({
      where: {
        workspaceId,
        status: "COMPLETED",
        updatedAt: { gte: start }
      },
      select: { updatedAt: true }
    }),
    prisma.goal.findMany({
      where: {
        workspaceId,
        createdAt: { gte: start }
      },
      select: { createdAt: true }
    })
  ]);

  const buckets = new Map();
  for (let i = 0; i < 12; i += 1) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * 7);
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, { created: 0, completed: 0 });
  }

  completedGoals.forEach((goal) => {
    const weekKey = startOfWeek(goal.updatedAt).toISOString().slice(0, 10);
    if (buckets.has(weekKey)) {
      const current = buckets.get(weekKey);
      buckets.set(weekKey, { ...current, completed: current.completed + 1 });
    }
  });

  createdGoals.forEach((goal) => {
    const weekKey = startOfWeek(goal.createdAt).toISOString().slice(0, 10);
    if (buckets.has(weekKey)) {
      const current = buckets.get(weekKey);
      buckets.set(weekKey, { ...current, created: current.created + 1 });
    }
  });

  const data = Array.from(buckets.entries()).map(([weekStart, counts]) => ({
    weekStart,
    created: counts.created,
    completed: counts.completed
  }));

  res.json({ data });
});

export const exportWorkspace = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);

  const [workspace, goals, actionItems, members] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.goal.findMany({ where: { workspaceId } }),
    prisma.actionItem.findMany({ where: { workspaceId } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    })
  ]);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=workspace-${workspaceId}-export.csv`
  );

  res.write(`Workspace,${csvEscape(workspace.name)}`);
  res.write("\n\nGoals\n");
  res.write("id,title,status,dueDate,ownerId,createdAt\n");
  goals.forEach((goal) => {
    res.write(
      [
        goal.id,
        csvEscape(goal.title),
        goal.status,
        goal.dueDate ? goal.dueDate.toISOString() : "",
        goal.ownerId,
        goal.createdAt.toISOString()
      ].join(",") + "\n"
    );
  });

  res.write("\nActionItems\n");
  res.write("id,title,status,priority,assigneeId,goalId,dueDate,createdAt\n");
  actionItems.forEach((item) => {
    res.write(
      [
        item.id,
        csvEscape(item.title),
        item.status,
        item.priority,
        item.assigneeId || "",
        item.goalId || "",
        item.dueDate ? item.dueDate.toISOString() : "",
        item.createdAt.toISOString()
      ].join(",") + "\n"
    );
  });

  res.write("\nMembers\n");
  res.write("userId,email,name,role,joinedAt\n");
  members.forEach((member) => {
    res.write(
      [
        member.userId,
        csvEscape(member.user?.email || ""),
        csvEscape(member.user?.name || ""),
        member.role,
        member.joinedAt.toISOString()
      ].join(",") + "\n"
    );
  });

  res.end();
});
