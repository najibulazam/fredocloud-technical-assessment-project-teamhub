"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "../../hooks/useOptimistic";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import Avatar from "../ui/Avatar";
import { useAuthStore } from "../../store/authStore";

const mentionPattern = /@([a-zA-Z0-9._-]+)/g;

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

const renderCommentHtml = (content) => {
  const escaped = escapeHtml(content || "");
  const withMentions = escaped.replace(
    mentionPattern,
    '<span class="font-semibold text-indigo-600 dark:text-indigo-300">@$1</span>'
  );
  return withMentions.replace(/\n/g, "<br />");
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

const updateCommentsCache = (current, variables, data, announcementId) => {
  return updateAnnouncementCache(current, announcementId, (item) => {
    const base = Array.isArray(item.comments) ? item.comments : [];

    if (data?.comment) {
      const next = base.map((comment) =>
        comment.id === variables.optimisticId
          ? { ...data.comment, pending: false, author: comment.author || data.comment.author }
          : comment
      );

      const exists = next.some((comment) => comment.id === data.comment.id);
      return {
        ...item,
        comments: exists ? next : [data.comment, ...next]
      };
    }

    const optimisticComment = {
      id: variables.optimisticId,
      content: variables.content,
      createdAt: new Date().toISOString(),
      pending: true,
      author: variables.author,
      authorId: variables.author?.id
    };

    return {
      ...item,
      comments: [optimisticComment, ...base]
    };
  });
};

export default function CommentThread({
  comments = [],
  workspaceId,
  announcementId,
  queryKey,
  members = []
}) {
  const [content, setContent] = useState("");
  const [mentionState, setMentionState] = useState(null);
  const [mentionIds, setMentionIds] = useState([]);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const resolvedQueryKey = useMemo(
    () => queryKey || ["announcements", workspaceId],
    [queryKey, workspaceId]
  );

  const membersById = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.userId] = member.user;
      return acc;
    }, {});
  }, [members]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [comments]);

  const suggestions = useMemo(() => {
    if (!mentionState) return [];
    const query = (mentionState.query || "").toLowerCase();
    return members
      .map((member) => member.user)
      .filter(Boolean)
      .filter((user) =>
        (user.name || user.email || "").toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [mentionState, members]);

  const optimistic = useOptimisticMutation({
    queryKey: resolvedQueryKey,
    mutationFn: ({ content: body }) =>
      api
        .post(`/workspaces/${workspaceId}/announcements/${announcementId}/comments`, {
          content: body
        })
        .then((res) => res.data),
    updateFn: (current, variables, data) =>
      updateCommentsCache(current, variables, data, announcementId)
  });

  useEffect(() => {
    const socket = getSocket();

    const handleComment = (payload) => {
      if (!payload || payload.announcementId !== announcementId) return;
      queryClient.setQueryData(resolvedQueryKey, (current) =>
        updateAnnouncementCache(current, announcementId, (item) => {
          const base = Array.isArray(item.comments) ? item.comments : [];
          if (base.some((comment) => comment.id === payload.id)) return item;
          return { ...item, comments: [payload, ...base] };
        })
      );
    };

    socket.on("announcement:comment", handleComment);

    return () => {
      socket.off("announcement:comment", handleComment);
    };
  }, [announcementId, queryClient, resolvedQueryKey, workspaceId]);

  const handleContentChange = (event) => {
    const value = event.target.value;
    const caret = event.target.selectionStart || 0;
    setContent(value);

    const prefix = value.slice(0, caret);
    const match = prefix.match(/@([a-zA-Z0-9._-]*)$/);
    if (match) {
      setMentionState({
        query: match[1] || "",
        start: caret - match[1].length - 1,
        end: caret
      });
    } else {
      setMentionState(null);
    }
  };

  const insertMention = (user) => {
    if (!mentionState) return;
    const name = user.name || user.email || "user";
    const before = content.slice(0, mentionState.start);
    const after = content.slice(mentionState.end);
    const nextContent = `${before}@${name} ${after}`;
    setContent(nextContent);
    setMentionState(null);
    setMentionIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));

    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const cursor = before.length + name.length + 2;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(cursor, cursor);
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    const optimisticId = `temp-${Date.now()}`;
    const payload = {
      content,
      optimisticId,
      author: currentUser,
      mentionIds
    };

    setContent("");
    setMentionIds([]);
    setMentionState(null);

    optimistic.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            ref={inputRef}
            className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Write a comment..."
            value={content}
            onChange={handleContentChange}
          />
          {mentionState && suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              {suggestions.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => insertMention(user)}
                >
                  <Avatar name={user.name || user.email} src={user.avatarUrl} className="h-6 w-6" />
                  <span className="flex-1 truncate">{user.name || user.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-500">Use @ to mention teammates</p>
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white" type="submit">
            Post
          </button>
        </div>
      </form>

      {sortedComments.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-500">No comments yet.</p>
      )}

      {sortedComments.map((comment) => {
        const author = comment.author || membersById[comment.authorId] || {};
        return (
          <div key={comment.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Avatar name={author.name || author.email || "User"} src={author.avatarUrl} className="h-7 w-7" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  {author.name || author.email || "Unknown"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500">{formatRelativeTime(comment.createdAt)}</p>
              </div>
              {comment.pending && (
                <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 animate-spin rounded-full border border-slate-400 border-t-transparent dark:border-slate-300" />
                  Sending
                </span>
              )}
            </div>
            <div
              className="mt-2 text-sm text-slate-700 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: renderCommentHtml(comment.content || "") }}
            />
          </div>
        );
      })}
    </div>
  );
}
