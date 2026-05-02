"use client";

import { useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Pin, PinOff, Smile, Trash2 } from "lucide-react";
import Avatar from "../ui/Avatar";
import CommentThread from "./CommentThread";
import ReactionPicker from "./ReactionPicker";
import { useOptimisticMutation } from "../../hooks/useOptimistic";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const updateAnnouncementCache = (current, announcementId, updater) => {
  if (!current) return current;
  if (Array.isArray(current)) {
    return current.map((item) => (item.id === announcementId ? updater(item) : item));
  }
  if (Array.isArray(current.announcements)) {
    return {
      ...current,
      announcements: current.announcements.map((item) =>
        item.id === announcementId ? updater(item) : item
      )
    };
  }
  if (current.id === announcementId) {
    return updater(current);
  }
  return current;
};

const getReactionState = (announcement, userId) => {
  if (Array.isArray(announcement.reactions)) {
    const counts = {};
    let userReaction = null;
    announcement.reactions.forEach((reaction) => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      if (userId && reaction.userId === userId) {
        userReaction = reaction.emoji;
      }
    });
    return { counts, userReactions: userReaction ? [userReaction] : [] };
  }

  const currentReaction = announcement.userReaction
    || (Array.isArray(announcement.userReactions) ? announcement.userReactions[0] : null);

  return {
    counts: announcement.reactions || {},
    userReactions: currentReaction ? [currentReaction] : []
  };
};

export default function AnnouncementCard({
  announcement,
  workspaceId,
  members = [],
  queryKey,
  canPin,
  canDelete
}) {
  const currentUser = useAuthStore((state) => state.user);
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const pickerButtonRef = useRef(null);

  const membersById = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.userId] = member.user;
      return acc;
    }, {});
  }, [members]);

  const author = announcement.author || membersById[announcement.authorId] || {};
  const safeHtml = useMemo(
    () => DOMPurify.sanitize(announcement.content || ""),
    [announcement.content]
  );

  const reactionState = useMemo(
    () => getReactionState(announcement, currentUser?.id),
    [announcement, currentUser?.id]
  );
  const reactions = reactionState.counts;
  const userReactions = reactionState.userReactions;
  const comments = Array.isArray(announcement.comments) ? announcement.comments : [];
  const commentCount = announcement.commentCount ?? comments.length;

  const reactionMutation = useOptimisticMutation({
    queryKey: queryKey || ["announcements", workspaceId],
    mutationFn: ({ emoji }) =>
      api
        .post(`/workspaces/${workspaceId}/announcements/${announcement.id}/reactions`, { emoji })
        .then((res) => res.data),
    updateFn: (current, variables) =>
      updateAnnouncementCache(current, announcement.id, (item) => {
        const { counts, userReactions: currentUserReactions } = getReactionState(
          item,
          currentUser?.id
        );
        const currentReaction = currentUserReactions[0] || null;
        const active = currentReaction === variables.emoji;
        const nextCounts = { ...counts };
        let nextUserReaction = null;

        if (active) {
          nextCounts[variables.emoji] = Math.max(0, (nextCounts[variables.emoji] || 0) - 1);
        } else {
          if (currentReaction) {
            nextCounts[currentReaction] = Math.max(0, (nextCounts[currentReaction] || 0) - 1);
          }
          nextCounts[variables.emoji] = (nextCounts[variables.emoji] || 0) + 1;
          nextUserReaction = variables.emoji;
        }

        return {
          ...item,
          reactions: nextCounts,
          userReactions: nextUserReaction ? [nextUserReaction] : []
        };
      })
  });

  const pinMutation = useOptimisticMutation({
    queryKey: queryKey || ["announcements", workspaceId],
    mutationFn: () =>
      api
        .put(`/workspaces/${workspaceId}/announcements/${announcement.id}/pin`)
        .then((res) => res.data),
    updateFn: (current, variables, data) =>
      updateAnnouncementCache(current, announcement.id, (item) => ({
        ...item,
        isPinned: data?.announcement?.isPinned ?? !item.isPinned
      }))
  });

  const deleteMutation = useOptimisticMutation({
    queryKey: queryKey || ["announcements", workspaceId],
    mutationFn: () =>
      api.delete(`/workspaces/${workspaceId}/announcements/${announcement.id}`).then((res) => res.data),
    updateFn: (current) => {
      if (!current) return current;
      if (Array.isArray(current)) {
        return current.filter((item) => item.id !== announcement.id);
      }
      if (Array.isArray(current.announcements)) {
        return {
          ...current,
          announcements: current.announcements.filter((item) => item.id !== announcement.id)
        };
      }
      return current;
    }
  });

  const handleToggleReaction = (emoji) => {
    setShowPicker(false);
    reactionMutation.mutate({ emoji });
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={author.name || author.email || "User"} src={author.avatarUrl} className="h-9 w-9" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {author.name || author.email || "Unknown"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">{formatRelativeTime(announcement.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {announcement.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
          {canPin && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              onClick={() => pinMutation.mutate()}
            >
              {announcement.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              {announcement.isPinned ? "Unpin" : "Pin"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-slate-900"
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div
        className="mt-3 text-sm text-slate-700 leading-relaxed dark:text-slate-200 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-300 [&_ul]:ml-5 [&_ul]:list-disc [&_h2]:text-base [&_h2]:font-semibold"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Object.entries(reactions)
          .filter(([, count]) => count > 0)
          .map(([emoji, count]) => {
            const active = userReactions.includes(emoji);
            return (
              <button
                type="button"
                key={emoji}
                className={`rounded-full border px-2 py-1 text-xs ${
                  active
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-indigo-200"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                }`}
                onClick={() => handleToggleReaction(emoji)}
              >
                {emoji} {count}
              </button>
            );
          })}
        <button
          ref={pickerButtonRef}
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          onClick={() => setShowPicker((prev) => !prev)}
          aria-label="Add reaction"
        >
          <Smile className="h-4 w-4" />
          React
        </button>
        <ReactionPicker
          open={showPicker}
          anchorRef={pickerButtonRef}
          onSelect={handleToggleReaction}
          onClose={() => setShowPicker(false)}
        />
        <button
          type="button"
          className="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          onClick={() => setShowComments((prev) => !prev)}
        >
          {showComments ? "Hide" : "Comments"} ({commentCount})
        </button>
      </div>

      {showComments && (
        <div className="mt-4">
          <CommentThread
            comments={comments}
            workspaceId={workspaceId}
            announcementId={announcement.id}
            queryKey={queryKey}
            members={members}
          />
        </div>
      )}
    </article>
  );
}
