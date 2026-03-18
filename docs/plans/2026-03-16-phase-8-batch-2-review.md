# Phase 8 Batch 2 Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the new agent API routes and Telegram binding helpers for auth, idempotency, error handling, and route consistency.

**Architecture:** Keep the existing App Router route structure, add shared validation helpers in the Telegram binding module, and patch route behavior with minimal surface-area changes. Prioritize fixes that prevent duplicate provisioning/webhook processing, avoid leaking internal details, and make malformed persisted JSON fail safely.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Drizzle ORM, Better Auth.

---

### Task 1: Review existing route and helper behavior

**Files:**
- Modify: `src/app/api/agents/provision/route.ts`
- Modify: `src/app/api/agents/[id]/sleep/route.ts`
- Modify: `src/app/api/agents/[id]/wake/route.ts`
- Modify: `src/app/api/agents/[id]/terminate/route.ts`
- Modify: `src/app/api/agents/[id]/health/route.ts`
- Modify: `src/app/api/webhooks/agent-task/route.ts`
- Modify: `src/lib/telegram-binding.ts`

**Step 1: Identify route-level security and correctness gaps**
- Verify session checks, ownership checks, channel config parsing, token validation, and duplicate-request handling.

**Step 2: Compare with adjacent project patterns**
- Reuse existing Next.js route conventions, Zod parsing, and error response style where possible.

### Task 2: Apply focused hardening fixes

**Files:**
- Modify: `src/lib/telegram-binding.ts`
- Modify: `src/app/api/agents/provision/route.ts`
- Modify: `src/app/api/agents/[id]/sleep/route.ts`
- Modify: `src/app/api/agents/[id]/wake/route.ts`
- Modify: `src/app/api/agents/[id]/terminate/route.ts`
- Modify: `src/app/api/agents/[id]/health/route.ts`
- Modify: `src/app/api/webhooks/agent-task/route.ts`

**Step 1: Add shared helper primitives**
- Add safe channel-config parsing and constant-time token comparison in `src/lib/telegram-binding.ts`.

**Step 2: Harden agent control routes**
- Replace unsafe JSON parsing with shared helpers and return explicit 5xx errors for missing persisted identifiers.

**Step 3: Harden provisioning flow**
- Prevent duplicate concurrent provisioning, avoid exposing internal workspace details, and keep DB state recoverable on failure.

**Step 4: Harden webhook processing**
- Validate the webhook token in constant time, require the payload agent ID to match the bound agent, and reject duplicate task-completion payloads.

### Task 3: Validate changes

**Files:**
- Test: `src/app/api/agents/provision/route.ts`
- Test: `src/app/api/agents/[id]/sleep/route.ts`
- Test: `src/app/api/agents/[id]/wake/route.ts`
- Test: `src/app/api/agents/[id]/terminate/route.ts`
- Test: `src/app/api/agents/[id]/health/route.ts`
- Test: `src/app/api/webhooks/agent-task/route.ts`
- Test: `src/lib/telegram-binding.ts`

**Step 1: Run focused static validation**
- Use TypeScript/lint checks against the touched files.

**Step 2: Fix any surfaced issues**
- Keep edits minimal and scoped to the reviewed files.
