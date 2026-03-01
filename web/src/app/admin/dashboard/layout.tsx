import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin");
  }

  return children;
}
