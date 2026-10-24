import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { notFound } from "next/navigation";
import { isAdminSection } from "@/lib/admin-navigation";

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isAdminSection(section) || section === "dashboard") notFound();
  return <AdminWorkspace initialSection={section} />;
}
