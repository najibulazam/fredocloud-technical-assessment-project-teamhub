"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "./AppShell";
import { useAuthStore } from "../../store/authStore";

export default function AppLayout({ children }) {
  const router = useRouter();
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
