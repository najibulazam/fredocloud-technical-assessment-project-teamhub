import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name }
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!req.uploadedFile?.secure_url) {
    throw new ApiError(400, "Upload failed");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: req.uploadedFile.secure_url }
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    }
  });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" }
  });

  res.json({ notifications });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });

  res.json({ ok: true });
});
