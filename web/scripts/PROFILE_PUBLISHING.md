# Publish the shared public profile

Run these commands from `web/` after the portfolio deployment is verified. No admin session or server GitHub token is needed to obtain the public snapshot. Publishing uses the operator's existing local GitHub CLI authentication.

## 1. Download the canonical production snapshot

```powershell
curl.exe --fail --silent --show-error https://www.mdcran.com/api/profile-publication --output profile-publication.json
```

The read-only endpoint returns the same canonical snapshot as the admin publisher and `/githubprofile`: projected public identity, skills, visible engineering projects, the unchanged reported AI total, generated README, and SHA-256 hash. It does not expose raw CMS documents, hidden projects, drafts, contacts, provider configuration, email/PDF fields, or admin metadata. Credential-bearing URLs are omitted.

`X-Publication-Hash` matches the JSON `hash`. Responses require revalidation and include a weak ETag; a matching `If-None-Match` receives 304. The timestamp is excluded from the hash, while all published content is included. Failed content loads return 503 rather than a partial snapshot.

## 2. Capture and review the production profile

Open `https://www.mdcran.com/githubprofile?capture=1` and capture the rendered profile as a PNG. The capture route omits the decorative video. Confirm the screenshot surface's `data-publication-hash` equals the downloaded JSON `hash`; this attribute is on the element with `data-profile-capture`. If they differ, download a fresh snapshot and reload the capture page before continuing.

Save the reviewed image as `githubprofile.png`. The publishing script checks PNG format/dimensions, but the operator must review its visual contents and matching snapshot. The generated README places this image near the top and uses a compact table of actual public project/source/live links.

## 3. Preview locally

```powershell
node scripts/publish-profile.mjs --snapshot profile-publication.json --screenshot githubprofile.png
```

The default validates the snapshot checksum, public publishing marker, screenshot dimensions, and file sizes. It reports file hashes and the exact target. It makes no GitHub requests or writes. Prefer the full JSON snapshot; `--readme README.md` is also supported but cannot verify snapshot provenance.

## 4. Apply the reviewed publication

```powershell
node scripts/publish-profile.mjs --snapshot profile-publication.json --screenshot githubprofile.png --apply
```

Only this explicit option calls GitHub. It atomically updates `README.md` and `assets/githubprofile.png` in `MDCran/mdcran` through one commit on the repository's default branch. Other files are preserved. A non-forced reference update rejects concurrent remote changes rather than overwriting them. If the two files already match, no commit is created.

After publishing, inspect the returned commit and rendered GitHub profile. Keep the local JSON and PNG together if a reproducible publication record is needed.
