"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Menu } from "lucide-react";
import Avatar from "../ui/Avatar";
import ThemeToggle from "./ThemeToggle";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { useSocket } from "../../hooks/useSocket";

export default function Header() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const [connected, setConnected] = useState(false);

  const handleConnect = useCallback(() => setConnected(true), []);
  const handleDisconnect = useCallback(() => setConnected(false), []);

  const socket = useSocket("connect", handleConnect);
  useSocket("disconnect", handleDisconnect);

  useEffect(() => {
    if (!socket) return;
    setConnected(socket.connected);
  }, [socket]);

  const titleMap = [
    { match: "/dashboard", label: "Dashboard" },
    { match: "/goals", label: "Goals" },
    { match: "/action-items", label: "Action Items" },
    { match: "/announcements", label: "Announcements" },
    { match: "/analytics", label: "Analytics" },
    { match: "/settings", label: "Settings" }
  ];

  const title =
    titleMap.find((item) => pathname.includes(item.match))?.label || "Workspace";

  return (
    <div className="relative">
      {!connected && (
        <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:px-6">
          Reconnecting...
        </div>
      )}
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 sm:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h1>
          <p className="hidden text-xs text-slate-600 dark:text-slate-500 sm:block">Stay aligned with your team</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell />
          <div className="relative">
            <Avatar name={user?.name || "User"} src={user?.avatarUrl} />
            {connected && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400 dark:border-slate-900" />
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("/users/notifications");
      return response.data.notifications || [];
    }
  });

  const notifications = data || [];
  const unreadCount = notifications.length;

  const handleClick = async (notification) => {
    await api.put("/users/notifications/read");
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });

    const payload = notification.payload || {};
    if (payload.workspaceId && payload.announcementId) {
      router.push(`/workspace/${payload.workspaceId}/announcements`);
      return;
    }
    if (payload.workspaceId && payload.goalId) {
      router.push(`/workspace/${payload.workspaceId}/goals/${payload.goalId}`);
      return;
    }

    router.push("/dashboard");
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px]">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notifications</p>
          <div className="mt-3 space-y-2">
            {notifications.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500">No unread notifications</p>
            )}
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className="flex w-full items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                onClick={() => handleClick(notification)}
              >
                <span>{getNotificationIcon(notification.type)}</span>
                <span className="flex-1">
                  {notification.type === "mention" ? "You were mentioned" : notification.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getNotificationIcon(type) {
  switch (type) {
    case "mention":
      return "💬";
    case "update":
      return "✅";
    default:
      return "🔔";
  }
}
