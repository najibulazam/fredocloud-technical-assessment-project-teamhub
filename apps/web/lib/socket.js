import { io } from "socket.io-client";
import { useWorkspaceStore } from "../store/workspaceStore";

let socket;
let subscribed = false;
let activeWorkspaceId = null;
let socketsEnabled;

const createNoopSocket = () => ({
  connected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {}
});

const isSocketEnabled = () => {
  if (typeof socketsEnabled === "boolean") {
    return socketsEnabled;
  }

  const explicit = process.env.NEXT_PUBLIC_ENABLE_SOCKET;
  if (explicit === "true") {
    socketsEnabled = true;
    return true;
  }

  if (explicit === "false") {
    socketsEnabled = false;
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "";
  socketsEnabled = url.includes("localhost") || url.includes("127.0.0.1");
  return socketsEnabled;
};

const getWorkspaceIdFromUrl = () => {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/\/workspace\/(\d+)/);
  return match ? Number(match[1]) : null;
};

const emitJoin = (workspaceId) => {
  if (!socket || !workspaceId) return;
  socket.emit("join:workspace", { workspaceId });
};

const emitLeave = (workspaceId) => {
  if (!socket || !workspaceId) return;
  socket.emit("leave:workspace", { workspaceId });
};

const syncWorkspaceFromStore = () => {
  if (subscribed) return;
  subscribed = true;

  const store = useWorkspaceStore;
  activeWorkspaceId = store.getState().currentWorkspace?.id || getWorkspaceIdFromUrl();

  store.subscribe((state, prevState) => {
    const nextId = state.currentWorkspace?.id;
    const prevId = prevState?.currentWorkspace?.id || activeWorkspaceId;

    if (!nextId || nextId === prevId) return;
    if (prevId) {
      emitLeave(prevId);
    }
    activeWorkspaceId = nextId;
    if (socket?.connected) {
      emitJoin(nextId);
    }
  });
};

export const getSocket = () => {
  if (!socket) {
    if (!isSocketEnabled()) {
      socket = createNoopSocket();
      return socket;
    }

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: true
    });

    syncWorkspaceFromStore();

    socket.on("connect", () => {
      const resolvedId = activeWorkspaceId || getWorkspaceIdFromUrl();
      if (resolvedId) {
        activeWorkspaceId = resolvedId;
        emitJoin(resolvedId);
      }
    });
  }

  return socket;
};
