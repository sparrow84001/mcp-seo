# 🚀 MCP-SEO Version Release & Error Prevention Playbook

This document serves as the **definitive zero-error checklist and playbook** for all future version releases of `io.github.sparrow84001/mcp-seo`.

---

## 📋 1. Complete Pre-Release Error Checklist (Avoid These Pitfalls)

| # | Known Pitfall / Past Error | Root Cause | Prevention & Strict Fix Rule |
| :-: | :--- | :--- | :--- |
| **1** | **Partial Version Bumps** | Updating `package.json` but forgetting `src/index.ts` `/health`, `server.json`, or test assertions. | **Check all 8 files** listed in Section 2 before committing. |
| **2** | **Render URL Character Confusion** | Letter `l` vs digit `1` (`5dl7` vs `5d17`). | Always use the exact domain: `https://mcp-seo-5dl7.onrender.com`. |
| **3** | **Official Registry Immutability** | Re-running tag release fails because MCP Registry forbids re-publishing the same version. | `continue-on-error: true` is set in `.github/workflows/release.yml` for `publish-mcp-registry`. |
| **4** | **Git Non-Fast-Forward Rejection** | Modifying files remotely via API/MCP while local branch has unpushed commits. | Always run `git pull --rebase origin main` before creating tags. |
| **5** | **TypeScript Type Mismatches** | Changing analyzer return types (e.g. `{ issues }` object vs array). | Always run `bun run typecheck` (`tsc --noEmit`) before writing tests. |
| **6** | **Robots.txt Specificity (RFC 9309)** | Shorter `Allow: /` overriding longer `Disallow: /path`. | Use the standard **longest-match rule** and preserve `$` end-anchors without escaping. |
| **7** | **Tool Count Desynchronization** | Adding new tools without updating `toolsCount` in `/info` and `server-card.json`. | Ensure `toolsCount` matches `server.registerTool` definitions. |

---

## 📂 2. The 8 Mandatory Files for Every Version Bump

When bumping from version `X.Y.Z` to `X.Y.Z+1`, update these exact files:

```text
1. package.json                         -> "version": "X.Y.Z+1"
2. manifest.json                        -> "version": "X.Y.Z+1"
3. server.json                          -> "version": "X.Y.Z+1"
4. README.md                            -> Update version badge & header
5. CHANGELOG.md                         -> Add new release section ## [X.Y.Z+1] - YYYY-MM-DD
6. src/index.ts                         -> Update /health, /info, server-card, and toolsCount
7. tests/smithery-metadata.test.ts     -> Update expected test version assertion
8. .github/workflows/release.yml        -> Verify Render URL (https://mcp-seo-5dl7.onrender.com)
```

---

## 🧪 3. Standard Local Verification Procedure (Always Run with Bun)

Always run these commands in sequence before tagging or pushing:

```powershell
# 1. Strict TypeScript Type Safety
bun run typecheck

# 2. Automated Unit & Integration Tests (Must be 100% green)
bun test

# 3. Production Distribution Bundle
bun run build

# 4. Standalone Windows Native Binary
bun run compile
```

---

## 🚀 4. Zero-Error Push & Tag Procedure (Exact Commands)

When all checks pass, execute this single flow:

```powershell
# 1. Stage all updated files
git add -A

# 2. Commit with conventional semantic message
git commit -m "feat(vX.Y.Z): release description summary"

# 3. Ensure local branch is fast-forward with remote
git pull --rebase origin main

# 4. Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z: release description summary"

# 5. Push main branch and release tag simultaneously
git push origin main && git push origin vX.Y.Z
```

---

## 🌐 5. Post-Push Automated Workflow Verification Checklist

After pushing the tag `vX.Y.Z`, verify that:

1. **GitHub Actions CI (`ci.yml`):**
   - `Validate MCP Registry Manifest (server.json)` ➔ 🟢 **PASSED**
   - `Test & Validate (ubuntu-latest)` ➔ 🟢 **PASSED**
   - `Test & Validate (windows-latest)` ➔ 🟢 **PASSED**
   - `Test & Validate (macos-latest)` ➔ 🟢 **PASSED**
2. **GitHub Releases (`release.yml`):**
   - Release `vX.Y.Z` created with 3 attached standalone binaries (`windows-x64.exe`, `linux-x64`, `darwin-arm64`).
3. **Official MCP Registry:** Auto-published via GitHub OIDC token.
4. **Smithery.ai Indexer:** Triggered for `sparrow8400/mcp-seo`.
5. **Render Cloud Server:** `https://mcp-seo-5dl7.onrender.com/health` returns `200 OK` with the new version.
