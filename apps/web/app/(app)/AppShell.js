"use client";

import { useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import Toast from "../../components/ui/Toast";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

export default function AppShell({ children }) {
  const initialize = useAuthStore((state) => state.initialize);
  const toast = useUiStore((state) => state.toast);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        {toast && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
            <Toast message={toast.message} description={toast.description} variant={toast.variant} />
          </div>
        )}
      </div>
    </div>
  );
}
