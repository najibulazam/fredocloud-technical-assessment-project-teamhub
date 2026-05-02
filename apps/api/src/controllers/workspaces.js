import crypto from "crypto";
import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { PERMISSIONS } from "../middleware/rbac.js";
import { sendInvitationEmail } from "../services/email.js";
import { emitNotification, emitToWorkspace } from "../services/socket.js";

const INVITE_DAYS = Number(process.env.INVITE_EXPIRES_DAYS || 7);

export const listWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ workspaces });
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { name, description, accentColor } = req.body;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      description,
      accentColor,
      members: {
        create: { userId, role: "ADMIN" }
      }
    },
    include: { members: { include: { user: true } } }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspace.id, "workspace:created", { workspace });

  res.status(201).json({ workspace });
});

export const discoverWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const [workspaces, memberships, joinRequests] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        accentColor: true,
        createdAt: true
      }
    }),
    prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true, role: true }
    }),
    prisma.workspaceJoinRequest.findMany({
      where: { requesterId: userId },
      select: { workspaceId: true, status: true }
    })
  ]);

  const membershipByWorkspace = new Map(memberships.map((item) => [item.workspaceId, item.role]));
  const requestByWorkspace = new Map(joinRequests.map((item) => [item.workspaceId, item.status]));

  const data = workspaces.map((workspace) => {
    const role = membershipByWorkspace.get(workspace.id) || null;
    const joinRequestStatus = requestByWorkspace.get(workspace.id) || null;
    return {
      ...workspace,
      membershipRole: role,
      joinRequestStatus,
      isMember: Boolean(role)
    };
  });

  res.json({ workspaces: data });
});

export const getWorkspace = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: { members: { include: { user: true } } }
  });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  res.json({ workspace });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, accentColor } = req.body;

  const workspace = await prisma.workspace.update({
    where: { id },
    data: { name, description, accentColor }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, id, "workspace:updated", { workspace });

  res.json({ workspace });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  await prisma.workspace.delete({ where: { id } });

  const io = req.app.get("io");
  emitToWorkspace(io, id, "workspace:deleted", { workspaceId: id });

  res.json({ ok: true });
});

export const getWorkspacePermissions = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const workspaceId = Number(req.params.id);

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!workspaceId) {
    throw new ApiError(400, "Workspace id is required");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId
      }
    }
  });

  if (!membership) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const allowed = PERMISSIONS[membership.role] || [];
  const allActions = Array.from(new Set(Object.values(PERMISSIONS).flat()));
  const matrix = allActions.reduce((acc, action) => {
    acc[action] = allowed.includes(action);
    return acc;
  }, {});

  res.json({
    role: membership.role,
    permissions: allowed,
    matrix
  });
});

export const createInvite = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const invitedByUserId = req.user?.id;
  const { email } = req.body;

  if (!invitedByUserId) {
    throw new ApiError(401, "Unauthorized");
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      workspaceId,
      invitedByUserId,
      token,
      status: "PENDING",
      expiresAt
    }
  });

  const inviter = await prisma.user.findUnique({
    where: { id: invitedByUserId },
    select: { name: true, email: true }
  });

  const baseUrl = process.env.CLIENT_URL || "";
  const acceptUrl = `${baseUrl}/invite/accept?token=${encodeURIComponent(
    token
  )}&workspaceId=${workspaceId}`;

  void sendInvitationEmail({
    to: email,
    inviterName: inviter?.name || inviter?.email || "Someone",
    workspaceName: workspace.name,
    acceptUrl
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "workspace:invited", { invitation });

  res.status(201).json({ invitation });
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      token,
      workspaceId,
      status: "PENDING"
    }
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new ApiError(400, "Invite is invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email && user.email !== invitation.email) {
    throw new ApiError(403, "Invite does not match user email");
  }

  const membership = await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: { userId, workspaceId }
    },
    create: {
      userId,
      workspaceId,
      role: "MEMBER"
    },
    update: {}
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "workspace:memberAdded", {
    userId,
    workspaceId,
    role: membership.role
  });

  res.json({ membership });
});

export const removeMember = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const memberId = Number(req.params.userId);

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: memberId, workspaceId }
    }
  });

  if (!membership) {
    throw new ApiError(404, "Member not found");
  }

  await prisma.workspaceMember.delete({
    where: {
      userId_workspaceId: { userId: memberId, workspaceId }
    }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "workspace:memberRemoved", {
    userId: memberId,
    workspaceId
  });

  res.json({ ok: true });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const memberId = Number(req.params.userId);
  const { role } = req.body;

  const membership = await prisma.workspaceMember.update({
    where: {
      userId_workspaceId: { userId: memberId, workspaceId }
    },
    data: { role }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "workspace:roleUpdated", {
    userId: memberId,
    workspaceId,
    role: membership.role
  });

  res.json({ membership });
});

export const requestJoinWorkspace = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const requesterId = req.user?.id;

  if (!requesterId) {
    throw new ApiError(401, "Unauthorized");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true }
  });
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: requesterId,
        workspaceId
      }
    }
  });
  if (membership) {
    throw new ApiError(400, "You are already a member of this workspace");
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { id: true, name: true, email: true }
  });

  let joinRequest = await prisma.workspaceJoinRequest.findUnique({
    where: {
      requesterId_workspaceId: {
        requesterId,
        workspaceId
      }
    }
  });

  if (joinRequest?.status === "PENDING") {
    return res.status(200).json({ joinRequest });
  }

  if (joinRequest) {
    joinRequest = await prisma.workspaceJoinRequest.update({
      where: { id: joinRequest.id },
      data: { status: "PENDING" }
    });
  } else {
    joinRequest = await prisma.workspaceJoinRequest.create({
      data: {
        requesterId,
        workspaceId,
        status: "PENDING"
      }
    });
  }

  const admins = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: "ADMIN" },
    select: { userId: true }
  });

  if (admins.length) {
    const payload = {
      type: "workspace_join_request",
      payload: {
        requestId: joinRequest.id,
        workspaceId,
        workspaceName: workspace.name,
        requesterId: requester?.id,
        requesterName: requester?.name || requester?.email || "User",
        requesterEmail: requester?.email || ""
      }
    };

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.userId,
        type: payload.type,
        payload: payload.payload,
        isRead: false
      }))
    });

    const io = req.app.get("io");
    admins.forEach((admin) => {
      emitNotification(io, admin.userId, payload);
    });
  }

  res.status(201).json({ joinRequest });
});

export const listJoinRequests = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const status = req.query.status === "ALL" ? undefined : "PENDING";

  const where = { workspaceId };
  if (status) {
    where.status = status;
  }

  const requests = await prisma.workspaceJoinRequest.findMany({
    where,
    include: {
      requester: {
        select: { id: true, name: true, email: true, avatarUrl: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ requests });
});

export const approveJoinRequest = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.id);
  const requestId = Number(req.params.requestId);
  const request = await prisma.workspaceJoinRequest.findFirst({
    where: { id: requestId, workspaceId, status: "PENDING" }
  });

  if (!request) {
    throw new ApiError(404, "Join request not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.workspaceJoinRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED" }
    });

    const membership = await tx.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: request.requesterId,
          workspaceId
        }
      },
      create: {
        userId: request.requesterId,
        workspaceId,
        role: "MEMBER"
      },
      update: {}
    });

    return { updatedRequest, membership };
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "workspace:memberAdded", {
    userId: request.requesterId,
    workspaceId,
    role: result.membership.role
  });

  emitNotification(io, request.requesterId, {
    type: "workspace_join_request_approved",
    payload: {
      requestId: request.id,
      workspaceId
    }
  });

  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      type: "workspace_join_request_approved",
      payload: {
        requestId: request.id,
        workspaceId
      },
      isRead: false
    }
  });

  res.json({ membership: result.membership, request: result.updatedRequest });
});
