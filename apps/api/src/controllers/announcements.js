import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  emitNewAnnouncement,
  emitNewComment,
  emitNewReaction,
  emitNotification,
  emitToWorkspace
} from "../services/socket.js";
import { sendMentionEmail } from "../services/email.js";

const mentionRegex = /@([a-zA-Z0-9._-]+)/g;

const extractMentions = (content) => {
  const matches = new Set();
  if (!content) return [];
  mentionRegex.lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content))) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }

  return Array.from(matches);
};

export const listAnnouncements = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const userId = req.user?.id;

  const announcements = await prisma.announcement.findMany({
    where: { workspaceId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  const normalized = announcements.map((announcement) => {
    const reactions = {};
    const userReactions = [];
    announcement.reactions.forEach((reaction) => {
      reactions[reaction.emoji] = (reactions[reaction.emoji] || 0) + 1;
      if (userId && reaction.userId === userId && !userReactions.includes(reaction.emoji)) {
        userReactions.push(reaction.emoji);
      }
    });

    return {
      ...announcement,
      reactions,
      userReactions
    };
  });

  res.json({ announcements: normalized });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const authorId = req.user?.id;
  const { content, isPinned } = req.body;

  if (!authorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const announcement = await prisma.announcement.create({
    data: {
      workspaceId,
      authorId,
      content,
      isPinned: Boolean(isPinned)
    },
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } }
    }
  });

  const normalized = {
    ...announcement,
    reactions: {},
    userReactions: [],
    comments: []
  };

  const io = req.app.get("io");
  emitNewAnnouncement(io, workspaceId, normalized);

  res.status(201).json({ announcement: normalized });
});

export const togglePin = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);

  const existing = await prisma.announcement.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Announcement not found");
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { isPinned: !existing.isPinned }
  });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "announcement:pinned", { announcement });

  res.json({ announcement });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const id = Number(req.params.id);

  const existing = await prisma.announcement.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ApiError(404, "Announcement not found");
  }

  await prisma.announcement.delete({ where: { id } });

  const io = req.app.get("io");
  emitToWorkspace(io, workspaceId, "announcement:deleted", { announcementId: id });

  res.json({ ok: true });
});

export const toggleReaction = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const announcementId = Number(req.params.id);
  const userId = req.user?.id;
  const { emoji } = req.body;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, workspaceId }
  });

  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }

  const existing = await prisma.reaction.findFirst({
    where: {
      announcementId,
      userId
    }
  });

  let reaction = null;
  let action = "added";
  let previousEmoji = null;

  if (existing && existing.emoji === emoji) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    action = "removed";
    previousEmoji = existing.emoji;
  } else if (existing) {
    reaction = await prisma.reaction.update({
      where: { id: existing.id },
      data: { emoji }
    });
    action = "switched";
    previousEmoji = existing.emoji;
  } else {
    reaction = await prisma.reaction.create({
      data: {
        announcementId,
        userId,
        emoji
      }
    });
  }

  const io = req.app.get("io");
  emitNewReaction(io, workspaceId, {
    announcementId,
    userId,
    emoji,
    action,
    previousEmoji
  });

  res.status(200).json({
    reaction: reaction || { announcementId, userId, emoji, removed: true },
    action,
    previousEmoji
  });
});

export const addComment = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  const announcementId = Number(req.params.id);
  const authorId = req.user?.id;
  const { content } = req.body;

  if (!authorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, workspaceId }
  });

  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }

  const comment = await prisma.comment.create({
    data: {
      announcementId,
      authorId,
      content
    },
    include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } }
  });

  const mentions = extractMentions(content);
  if (mentions.length) {
    const orFilters = mentions.flatMap((token) => [
      { email: { equals: token, mode: "insensitive" } },
      { name: { equals: token, mode: "insensitive" } }
    ]);

    const users = await prisma.user.findMany({
      where: {
        OR: orFilters
      },
      select: { id: true, email: true, name: true }
    });

    const uniqueUsers = Array.from(
      new Map(
        users
          .filter((user) => user.id !== authorId)
          .map((user) => [user.id, user])
      ).values()
    );

    if (uniqueUsers.length) {
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { name: true, email: true }
      });
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true }
      });
      const mentionerName = author?.name || author?.email || "Someone";
      const workspaceName = workspace?.name || "workspace";
      const baseUrl = process.env.CLIENT_URL || "";
      const commentUrl = `${baseUrl}/workspaces/${workspaceId}/announcements/${announcementId}`;
      const commentPreview = content.length > 140 ? `${content.slice(0, 140)}...` : content;

      const payload = {
        workspaceId,
        announcementId,
        commentId: comment.id,
        mentionedBy: authorId
      };

      await prisma.notification.createMany({
        data: uniqueUsers.map((user) => ({
          userId: user.id,
          type: "mention",
          payload,
          isRead: false
        }))
      });

      const io = req.app.get("io");
      uniqueUsers.forEach((user) => {
        emitNotification(io, user.id, {
          type: "mention",
          payload
        });

        if (user.email) {
          void sendMentionEmail({
            to: user.email,
            mentionerName,
            workspaceName,
            commentPreview,
            commentUrl
          });
        }
      });
    }
  }

  const io = req.app.get("io");
  emitNewComment(io, workspaceId, comment);

  res.status(201).json({ comment });
});
