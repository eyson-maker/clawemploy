# Phase 6 Batch 2 Credits and Legal Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the new `Credits` i18n namespace and update the privacy and terms legal content for the AI Agent platform without introducing new dependencies.

**Architecture:** Keep the existing legal page rendering flow unchanged because `src/app/[locale]/(marketing)/(legal)/privacy/page.tsx` and `src/app/[locale]/(marketing)/(legal)/terms/page.tsx` already load MDX from `content/pages`. Update the locale-specific MDX source files in place and extend `messages/en.json` and `messages/zh.json` with the requested credits copy.

**Tech Stack:** Next.js App Router, `next-intl`, Fumadocs MDX content pages, Biome, pnpm.

---

### Task 1: Add credits translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

**Step 1: Write the failing test**
- No repo-level automated unit test harness is configured for JSON message coverage.
- Use the application build as the verification gate for JSON validity and i18n consumption safety.

**Step 2: Run test to verify it fails**
- Not applicable without a configured test runner for this slice.

**Step 3: Write minimal implementation**
- Add a top-level `Credits` object in both locale files with the exact requested shape and localized strings.

**Step 4: Run test to verify it passes**
- Run `pnpm build` after all content changes to confirm the message files parse and the app compiles.

### Task 2: Update privacy policy content

**Files:**
- Modify: `content/pages/privacy-policy.mdx`
- Modify: `content/pages/privacy-policy.zh.mdx`

**Step 1: Write the failing test**
- No legal-content snapshot or MDX rendering test harness exists.
- Use the production build as the verification gate for MDX validity and page generation.

**Step 2: Run test to verify it fails**
- Not applicable without a configured content test runner for this slice.

**Step 3: Write minimal implementation**
- Replace the generic privacy copy with AI Agent platform-specific sections covering data collection, AI processing, GitHub App access, retention, user rights, credit transactions, and support contact.

**Step 4: Run test to verify it passes**
- Run `pnpm build` to validate the MDX compiles and route metadata still resolves.

### Task 3: Update terms of service content

**Files:**
- Modify: `content/pages/terms-of-service.mdx`
- Modify: `content/pages/terms-of-service.zh.mdx`

**Step 1: Write the failing test**
- No automated test harness exists for legal MDX content.
- Use the production build as the verification gate for the rendered content source.

**Step 2: Run test to verify it fails**
- Not applicable without a configured test runner for this slice.

**Step 3: Write minimal implementation**
- Replace the generic terms with platform-specific sections covering service description, credits policy, acceptable use, IP, service level, liability, and support contact.

**Step 4: Run test to verify it passes**
- Run `pnpm build` to validate the content compiles and the app builds successfully.
