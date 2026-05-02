export function emitToWorkspace(io, workspaceId, event, data) {
  if (!io || !workspaceId) return;
  io.to(`workspace:${workspaceId}`).emit(event, data);
}

export function emitNewAnnouncement(io, workspaceId, announcement) {
  emitToWorkspace(io, workspaceId, "announcement:new", announcement);
}

export function emitNewReaction(io, workspaceId, reaction) {
  emitToWorkspace(io, workspaceId, "announcement:reaction", reaction);
}

export function emitNewComment(io, workspaceId, comment) {
  emitToWorkspace(io, workspaceId, "announcement:comment", comment);
}

export function emitGoalUpdate(io, workspaceId, update) {
  emitToWorkspace(io, workspaceId, "goal:update:new", update);
}

export function emitStatusChange(io, workspaceId, payload) {
  if (!payload?.entity) return;
  emitToWorkspace(io, workspaceId, `${payload.entity}:updated`, payload);
}

export function emitPresenceUpdate(io, workspaceId, onlineUsers) {
  emitToWorkspace(io, workspaceId, "presence:update", { workspaceId, onlineUsers });
}

export function emitNotification(io, userId, notification) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("notification:new", notification);
}
