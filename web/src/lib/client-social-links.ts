import auditData from "./client-social-audit.json";
import type { Client, SocialLink } from "./types";

interface ClientSocialAudit {
  id: string;
  name: string;
  status: string;
  links: SocialLink[];
  legacyLinkSets: SocialLink[][];
  sources: string[];
  note: string;
}

export const clientSocialAudit = auditData.clients as ClientSocialAudit[];
const auditById = new Map(clientSocialAudit.map((entry) => [entry.id, entry]));

function linkSignature(links: SocialLink[]) {
  return JSON.stringify(links.map((link) => [
    link.platform, link.url, link.handle ?? "", link.title ?? "",
    link.channelId ?? "", link.userId ?? "",
  ]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

/** Correct the audited legacy records without overwriting subsequent social edits. */
export function reconcileClientSocialLinks(client: Client): Client {
  const entry = auditById.get(client.id);
  if (!entry) return client;
  const signature = linkSignature(client.socialLinks ?? []);
  if (!entry.legacyLinkSets.some((links) => linkSignature(links) === signature)) {
    return client;
  }
  return { ...client, socialLinks: entry.links.map((link) => ({ ...link })) };
}
