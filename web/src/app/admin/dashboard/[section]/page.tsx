import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { notFound } from "next/navigation";
const sections = new Set(["projects", "articles", "clients", "r2-assets", "site-content", "resume", "analytics", "sessions", "contacts", "rate-limits", "ai", "contact-form-entries", "campaigns", "rizz", "bar", "visitors", "booking", "identities", "crossdevice", "traffic", "status", "database", "discord", "content-studio", "operations", "publishing", "content-health"]);
export default async function Page({params}:{params:Promise<{section:string}>}) { const {section}=await params; if(!sections.has(section))notFound(); return <AdminWorkspace initialSection={section} />; }
