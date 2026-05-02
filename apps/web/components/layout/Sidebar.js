"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckSquare,
  Home,
  LogOut,
  Megaphone,
  PanelLeftClose,
  Settings,
  Target
} from "lucide-react";
import Avatar from "../ui/Avatar";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useUiStore } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "./ThemeToggle";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { api } from "../../lib/api";
import { useSocket } from "../../hooks/useSocket";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "goals", label: "Goals", icon: Target },
  { key: "action-items", label: "Action Items", icon: CheckSquare },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings }
];

function SidebarItem({ href, label, icon: Icon, active, disabled, collapsed, onClick }) {
  return (
    <Link
      href={href}
      title={label}
      aria-disabled={disabled}
      onClick={onClick}
      className={`group relative rounded-lg transition-all duration-200 ${
        collapsed
          ? "mx-auto flex h-10 w-10 items-center justify-center"
          : "flex h-10 items-center gap-2 px-3"
      } ${
        disabled
          ? "cursor-not-allowed text-slate-400 dark:text-slate-600"
          : active
          ? "bg-[color:var(--accent-color)]/12 text-[color:var(--accent-color)]"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span
        className={`truncate text-sm transition-opacity duration-200 ${
          collapsed ? "pointer-events-none w-0 opacity-0" : "opacity-100"
        }`}
      >
        {label}
      </span>

      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
          {label}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const onlineMembersMap = useWorkspaceStore((state) => state.onlineMembers);
  const setOnlineMembers = useWorkspaceStore((state) => state.setOnlineMembers);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const pathname = usePathname();
  const router = useRouter();
  const workspace =
    currentWorkspace || user?.workspaceMemberships?.[0]?.workspace || user?.workspace || null;
  const workspaceId = workspace?.id;
  const hasWorkspace = Boolean(workspaceId);
  const accentColor = workspace?.accentColor || "#6366f1";
  const isCollapsed = !sidebarOpen;

  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await api.get("/workspaces");
      return response.data.workspaces || [];
    },
    enabled: Boolean(user),
    staleTime: 2 * 60 * 1000
  });

  useEffect(() => {
    const list = workspacesData || [];
    setWorkspaces(list);
    if (!currentWorkspace && list.length > 0) {
      setCurrentWorkspace(list[0]);
    }
  }, [workspacesData, setWorkspaces, currentWorkspace, setCurrentWorkspace]);

  const onlineMemberIds = useMemo(
    () => onlineMembersMap?.[workspaceId] || [],
    [onlineMembersMap, workspaceId]
  );
  const onlineCount = onlineMemberIds.length;
  const { data: workspaceDetails } = useQuery({
    queryKey: ["sidebar-workspace", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data.workspace;
    },
    enabled: Boolean(workspaceId && sidebarOpen),
    staleTime: 60 * 1000
  });
  const members = workspaceDetails?.members || currentWorkspace?.members || [];

  const handlePresenceUpdate = useCallback(
    (payload) => {
      const resolvedId = payload?.workspaceId || workspaceId;
      if (!resolvedId) return;
      const list = Array.isArray(payload?.onlineUsers) ? payload.onlineUsers : [];
      setOnlineMembers(resolvedId, list);
    },
    [setOnlineMembers, workspaceId]
  );

  useSocket("presence:update", handlePresenceUpdate);

  useEffect(() => {
    const match = pathname.match(/\/workspace\/(\d+)/);
    if (!match) return;
    const id = Number(match[1]);
    if (!id || currentWorkspace?.id === id) return;
    const membership = user?.workspaceMemberships?.find((item) => item.workspace?.id === id);
    if (membership?.workspace) {
      setCurrentWorkspace(membership.workspace);
    }
  }, [pathname, currentWorkspace?.id, setCurrentWorkspace, user]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const syncDesktopSidebar = (event) => {
      if (event.matches) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    if (media.matches) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }

    media.addEventListener("change", syncDesktopSidebar);
    return () => {
      media.removeEventListener("change", syncDesktopSidebar);
    };
  }, [setSidebarOpen]);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        if (item.key === "dashboard") {
          return { ...item, href: "/dashboard", disabled: false };
        }
        return {
          ...item,
          href: workspaceId ? `/workspace/${workspaceId}/${item.key}` : "#",
          disabled: !hasWorkspace
        };
      }),
    [workspaceId, hasWorkspace]
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-300 sm:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        style={{ "--accent-color": accentColor }}
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 shadow-xl transition-[width,transform] duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:static sm:shadow-none ${
          sidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Top section: branding + workspace selector */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className={`flex items-center px-4 pb-4 pt-5 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent-color)]" />
              <span
                className={`truncate transition-opacity duration-200 ${
                  sidebarOpen ? "opacity-100" : "pointer-events-none w-0 opacity-0"
                }`}
              >
                Team Hub
              </span>
            </div>
            {sidebarOpen && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {onlineCount}
              </span>
            )}
          </div>
          {sidebarOpen && (
            <div className="px-4 pb-4 transition-opacity duration-200">
              <WorkspaceSwitcher />
            </div>
          )}
        </div>

        {/* Middle section: nav grows to fill available space */}
        <div className="flex-1 overflow-y-auto py-4">
          {!hasWorkspace && sidebarOpen && (
            <p className="mx-3 mb-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Select or create a workspace to enable workspace navigation.
            </p>
          )}
          <nav
            className={`flex h-full flex-col px-2 ${
              isCollapsed ? "items-center justify-center gap-6" : "items-stretch justify-center gap-2"
            }`}
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <SidebarItem
                  key={item.key}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  disabled={item.disabled}
                  collapsed={isCollapsed}
                  onClick={(event) => {
                    if (item.disabled) {
                      event.preventDefault();
                      return;
                    }
                    if (window.innerWidth < 640) {
                      setSidebarOpen(false);
                    }
                  }}
                />
              );
            })}
          </nav>
        </div>

        {/* Bottom section: always pinned */}
        <div
          className={`shrink-0 border-t border-slate-200 py-4 dark:border-slate-800 ${
            sidebarOpen ? "px-3" : "px-2"
          }`}
        >
          {sidebarOpen && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Members
                </p>
                <Link
                  href={`/workspace/${workspaceId}/members`}
                  className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  See more
                </Link>
              </div>
              <div className="space-y-1.5">
                {members.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No members yet
                  </p>
                )}
                {members.slice(0, 5).map((member) => {
                  const displayName = member.user?.name || member.user?.email || "Member";
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-700"
                    >
                      <Avatar name={displayName} src={member.user?.avatarUrl} className="h-6 w-6" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                          {displayName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500">{member.role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`flex items-center ${sidebarOpen ? "gap-3 px-1" : "justify-center"}`}>
            <Avatar name={user?.name || "User"} src={user?.avatarUrl} />
            {sidebarOpen && (
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {user?.name || "Team member"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">{user?.email}</span>
              </div>
            )}
          </div>
          <div className={`mt-4 flex items-center gap-2 ${sidebarOpen ? "px-1" : "justify-center"}`}>
            <button
              className={`rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 ${
                sidebarOpen ? "px-3 py-1" : "p-2"
              }`}
              onClick={handleLogout}
              title={isCollapsed ? "Logout" : undefined}
            >
              {sidebarOpen ? "Logout" : <LogOut className="h-4 w-4" />}
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 sm:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
