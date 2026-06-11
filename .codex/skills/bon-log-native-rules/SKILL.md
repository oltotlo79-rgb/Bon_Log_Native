---
name: bon-log-native-rules
description: Load Bon_Log Native project rules from CLAUDE.md and .claude/rules only when needed. Use for coding, reviewing, testing, or architecture work in this Expo / React Native mobile app, especially when touching the API client, auth tokens, TanStack Query layer, navigation, push notifications, billing, tests, or store compliance.
---

# Bon_Log Native Rules

Use this skill as Codex's lightweight bridge to the Claude-maintained project rules.

`CLAUDE.md` and `.claude/rules/*.md` are the canonical sources. Do not duplicate those rule bodies into `AGENTS.md` or this skill. Load only the files relevant to the current task.

## Workflow

1. Read root `CLAUDE.md` when the project baseline is not already in context.
2. Identify the files, feature area, and risk profile of the task.
3. Read only the matching `.claude/rules/*.md` files from the table below.
4. Apply those rules as project constraints while keeping the existing Claude-readable format intact.
5. If rule content itself must change, edit the canonical file in `.claude/rules/` or `CLAUDE.md`.

On Windows, read Japanese markdown with UTF-8 explicitly when using PowerShell:

```powershell
Get-Content -Raw -Encoding UTF8 CLAUDE.md
Get-Content -Raw -Encoding UTF8 .claude\rules\api-client.md
```

## Rule Index

| Task area | Read |
| --- | --- |
| Layering, placement decisions, dependency direction | `.claude/rules/architecture.md` |
| API client, OpenAPI codegen, no direct DB access | `.claude/rules/api-client.md` |
| TanStack Query, query keys, invalidation map, infinite scroll | `.claude/rules/data-fetching.md` |
| Auth, access/refresh tokens, secure-store, Google OAuth | `.claude/rules/auth-tokens.md` |
| Screens, components, lists, images, accessibility | `.claude/rules/components.md` |
| Expo Router, route constants, auth guard, deep links | `.claude/rules/navigation.md` |
| Push notifications, device tokens, tap navigation | `.claude/rules/push-notifications.md` |
| RevenueCat, premium gating, purchases | `.claude/rules/billing.md` |
| Error boundaries, Sentry, offline, retry policy | `.claude/rules/error-handling.md` |
| Performance, list virtualization, images, re-renders | `.claude/rules/performance.md` |
| Unit/E2E tests, mocks, coverage expectations | `.claude/rules/testing.md` |
| Development environment setup, API endpoint switching | `.claude/rules/setup-dev.md` |
| Comment policy and WHY/WHAT judgment | `.claude/rules/comments.md` |
| App Store / Google Play review requirements | `.claude/rules/store-compliance.md` |

## Loading Guidance

- For code edits, read the rule for the touched layer before editing.
- For cross-cutting changes, read each relevant rule, but avoid bulk-loading all rules by default.
- For reviews, read the rules tied to changed files and the test rule when test coverage is part of the risk.
- Preserve `.claude/rules` filenames, frontmatter, and Markdown structure so Claude can continue reading them.
