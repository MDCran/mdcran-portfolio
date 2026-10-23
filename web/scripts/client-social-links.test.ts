import assert from "node:assert/strict";
import test from "node:test";
import { clientSocialAudit, reconcileClientSocialLinks } from "../src/lib/client-social-links";
import { clients } from "../src/lib/data";
import type { Client } from "../src/lib/types";

test("all 29 audited clients use source-backed links or explicitly remain unresolved", () => {
  assert.equal(clientSocialAudit.length, 29);
  assert.equal(new Set(clientSocialAudit.map((entry) => entry.id)).size, 29);
  for (const entry of clientSocialAudit) {
    assert.ok(entry.sources.length, entry.id);
    assert.equal(entry.links.length > 0, entry.status === "confirmed-links", entry.id);
    assert.equal(new Set(entry.links.map((link) => link.url)).size, entry.links.length, entry.id);
    for (const link of entry.links) {
      const url = new URL(link.url);
      assert.equal(url.protocol, "https:", `${entry.id}: ${link.url}`);
      assert.equal(url.search, "", `${entry.id}: no tracking or redirect URLs`);
      const hosts: Record<string, string[]> = {
        youtube: ["www.youtube.com"], twitch: ["www.twitch.tv"],
        instagram: ["www.instagram.com"], x: ["x.com"],
        facebook: ["www.facebook.com"], tiktok: ["www.tiktok.com"],
        discord: ["discord.gg"],
      };
      if (link.platform !== "website") assert.ok(hosts[link.platform]?.includes(url.hostname), entry.id);
    }
  }
});

test("every legacy snapshot is corrected, including records stored in a different order", () => {
  for (const entry of clientSocialAudit) {
    for (const links of entry.legacyLinkSets) {
      const client: Client = { id: entry.id, name: entry.name, roles: [], socialLinks: [...links].reverse(), bio: "Keep biography", followerCount: 123 };
      const before = structuredClone(client);
      const corrected = reconcileClientSocialLinks(client);
      assert.deepEqual(corrected.socialLinks, entry.links, entry.id);
      assert.equal(corrected.bio, client.bio);
      assert.equal(corrected.followerCount, 123);
      assert.deepEqual(client, before, "must not mutate the database record");
      assert.deepEqual(reconcileClientSocialLinks(corrected), corrected, "idempotent");
    }
  }
});

test("subsequent admin social edits and unknown clients are preserved", () => {
  const entry = clientSocialAudit.find((entry) => entry.id === "beckjack")!;
  const client: Client = { id: entry.id, name: entry.name, roles: [], socialLinks: [{ ...entry.legacyLinkSets[0][0], handle: "Admin-corrected label" }] };
  assert.equal(reconcileClientSocialLinks(client), client);
  const unknown = { ...client, id: "new-client" };
  assert.equal(reconcileClientSocialLinks(unknown), unknown);
});

test("seeded data cannot restore the incorrect accounts", () => {
  for (const client of clients) {
    const audit = clientSocialAudit.find((entry) => entry.id === client.id)!;
    assert.deepEqual(client.socialLinks, audit.links, client.id);
  }
  assert.ok(clients.find((client) => client.id === "beckjack")!.socialLinks[0].url.endsWith("@beckbrojack"));
  assert.ok(!clients.flatMap((client) => client.socialLinks).some((link) => link.url.includes("100Thieves")));
});
