"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AnnouncementCard from "../../../../../components/announcements/AnnouncementCard";
import RichTextEditor from "../../../../../components/announcements/RichTextEditor";
import Modal from "../../../../../components/ui/Modal";
import Skeleton from "../../../../../components/ui/Skeleton";
import { api } from "../../../../../lib/api";
import { getSocket } from "../../../../../lib/socket";
import { usePermission } from "../../../../../hooks/usePermission";
import { useAuthStore } from "../../../../../store/authStore";

const updateAnnouncementsCache = (current, updater) => {
  if (!current) return current;
  if (Array.isArray(current)) {
    return updater(current);
  }
  if (Array.isArray(current.announcements)) {
    return { ...current, announcements: updater(current.announcements) };
  }
  return current;
};

const normalizeReactions = (announcement, userId) => {
  if (Array.isArray(announcement.reactions)) {
    const counts = {};
    let userReaction = null;
    announcement.reactions.forEach((reaction) => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      if (userId && reaction.userId === userId) {
        userReaction = reaction.emoji;
      }
    });
    return { ...announcement, reactions: counts, userReactions: userReaction ? [userReaction] : [] };
  }

  const currentReaction = announcement.userReaction
    || (Array.isArray(announcement.userReactions) ? announcement.userReactions[0] : null);
  return { ...announcement, userReactions: currentReaction ? [currentReaction] : [] };
};

export default function AnnouncementsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const currentUser = useAuthStore((state) => state.user);
  const announcementsQueryKey = useMemo(() => ["announcements", workspaceId], [workspaceId]);

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId)
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: announcementsQueryKey,
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/announcements`);
      const items = response.data.announcements || [];
      return items.map((announcement) => normalizeReactions(announcement, currentUser?.id));
    },
    enabled: Boolean(workspaceId)
  });

  const createAnnouncement = useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/announcements`, payload).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) => {
          const normalized = normalizeReactions(data.announcement || {}, currentUser?.id);
          if (!normalized?.id) return items;
          if (items.some((item) => item.id === normalized.id)) return items;
          return [normalized, ...items];
        })
      );
      setOpen(false);
      setContent("");
    }
  });

  useEffect(() => {
    if (!workspaceId) return;
    const socket = getSocket();

    const handleNew = (payload) => {
      const announcement = payload?.announcement || payload;
      if (!announcement?.id) return;
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) => {
          if (items.some((item) => item.id === announcement.id)) return items;
          return [normalizeReactions(announcement, currentUser?.id), ...items];
        })
      );
    };

    const handlePinned = (payload) => {
      if (!payload?.announcement) return;
      const { announcement } = payload;
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) =>
          items.map((item) =>
            item.id === announcement.id ? { ...item, isPinned: announcement.isPinned } : item
          )
        )
      );
    };

    const handleDeleted = (payload) => {
      if (!payload?.announcementId) return;
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) =>
          items.filter((item) => item.id !== payload.announcementId)
        )
      );
    };

    const handleReaction = (payload) => {
      if (!payload?.announcementId || !payload?.emoji) return;
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) =>
          items.map((item) => {
            if (item.id !== payload.announcementId) return item;
            const counts = { ...(item.reactions || {}) };
            const previousEmoji = payload.previousEmoji || null;

            let nextUserReactions = item.userReactions || [];

            if (payload.action === "removed") {
              counts[payload.emoji] = Math.max(0, (counts[payload.emoji] || 0) - 1);
              if (payload.userId && payload.userId === currentUser?.id) {
                nextUserReactions = [];
              }
            } else if (payload.action === "switched") {
              if (previousEmoji) {
                counts[previousEmoji] = Math.max(0, (counts[previousEmoji] || 0) - 1);
              }
              counts[payload.emoji] = (counts[payload.emoji] || 0) + 1;
              if (payload.userId && payload.userId === currentUser?.id) {
                nextUserReactions = [payload.emoji];
              }
            } else {
              counts[payload.emoji] = (counts[payload.emoji] || 0) + 1;
              if (payload.userId && payload.userId === currentUser?.id) {
                nextUserReactions = [payload.emoji];
              }
            }

            return { ...item, reactions: counts, userReactions: nextUserReactions };
          })
        )
      );
    };

    const handleComment = (payload) => {
      if (!payload?.announcementId) return;
      queryClient.setQueryData(announcementsQueryKey, (current) =>
        updateAnnouncementsCache(current, (items) =>
          items.map((item) => {
            if (item.id !== payload.announcementId) return item;
            const comments = Array.isArray(item.comments) ? item.comments : [];
            if (comments.some((comment) => comment.id === payload.id)) return item;
            return { ...item, comments: [payload, ...comments] };
          })
        )
      );
    };

    socket.on("announcement:new", handleNew);
    socket.on("announcement:pinned", handlePinned);
    socket.on("announcement:deleted", handleDeleted);
    socket.on("announcement:reaction", handleReaction);
    socket.on("announcement:comment", handleComment);

    return () => {
      socket.off("announcement:new", handleNew);
      socket.off("announcement:pinned", handlePinned);
      socket.off("announcement:deleted", handleDeleted);
      socket.off("announcement:reaction", handleReaction);
      socket.off("announcement:comment", handleComment);
    };
  }, [workspaceId, queryClient, currentUser?.id, announcementsQueryKey]);

  const members = workspace?.members || [];

  const pinnedAnnouncements = useMemo(() => {
    return announcements
      .filter((announcement) => announcement.isPinned)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [announcements]);

  const feedAnnouncements = useMemo(() => {
    return announcements
      .filter((announcement) => !announcement.isPinned)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [announcements]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    createAnnouncement.mutate({ content });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Share updates and discussions.</p>
        </div>
        {hasPermission("create:announcement") && (
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Post Announcement
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-40" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span>📌</span>
                <span>Pinned</span>
              </div>
              <div className="space-y-4">
                {pinnedAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    workspaceId={workspaceId}
                    members={members}
                    queryKey={announcementsQueryKey}
                    canPin={hasPermission("pin:announcement")}
                    canDelete={hasPermission("delete:announcement")}
                  />
                ))}
              </div>
            </div>
          )}

          {feedAnnouncements.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest</div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto sm:pr-2">
                {feedAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    workspaceId={workspaceId}
                    members={members}
                    queryKey={announcementsQueryKey}
                    canPin={hasPermission("pin:announcement")}
                    canDelete={hasPermission("delete:announcement")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={open} title="Post Announcement" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <RichTextEditor content={content} onChange={setContent} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white sm:w-auto"
              onClick={handleSubmit}
              disabled={createAnnouncement.isPending}
            >
              {createAnnouncement.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
