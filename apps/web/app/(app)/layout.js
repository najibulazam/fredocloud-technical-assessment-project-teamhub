import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "./AppShell";

export default function AppLayout({ children }) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("accessToken");

  if (!accessToken) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
