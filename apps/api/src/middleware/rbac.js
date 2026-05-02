import { prisma } from "@team-hub/db";
import { ApiError } from "../utils/ApiError.js";

export const PERMISSIONS = {
  ADMIN: [
    "create:goal",
    "update:goal",
    "delete:goal",
    "create:announcement",
    "delete:announcement",
    "invite:member",
    "remove:member",
    "update:workspace",
    "export:data",
    "pin:announcement",
    "assign:role"
  ],
  MEMBER: [
    "create:goal",
    "update:goal",
    "create:actionItem",
    "update:actionItem",
    "comment",
    "react",
    "create:milestone",
    "update:milestone"
  ]
};

export const checkPermission = (action) => async (req, res, next) => {
  const userId = req.user?.id;
  const workspaceId = Number(req.params.workspaceId || req.params.id || req.body.workspaceId);

  if (!userId) {
    return next(new ApiError(401, "Unauthorized"));
  }

  if (!workspaceId) {
    return next(new ApiError(400, "Workspace id is required"));
  }

  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      }
    });

    if (!membership) {
      return next(new ApiError(403, "Insufficient permissions"));
    }

    req.memberRole = membership.role;
    const allowed = PERMISSIONS[membership.role] || [];

    if (allowed.includes(action)) {
      return next();
    }

    return next(new ApiError(403, "Insufficient permissions"));
  } catch (error) {
    return next(error);
  }
};
