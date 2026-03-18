import { randomUUID } from 'crypto';
import { consumeCredits, getUserCredits } from '@/credits/credits';
import { getDb } from '@/db';
import { agentInstance, agentTask } from '@/db/schema';
import { sleepAgent } from '@/lib/agent-provisioner';
import { and, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const agentTaskWebhookSchema = z.object({
  agent_id: z.string().trim().min(1),
  task_description: z.string().trim().min(1),
  engine: z.string().trim().min(1),
  github_commit: z.string().trim().min(1).nullable().optional(),
  github_repo: z.string().trim().min(1).nullable().optional(),
  status: z.enum(['completed', 'failed', 'blocked']),
});

type AgentChannelConfig = {
  webhookToken?: string;
  openclawAgentId?: string;
  pausedReason?: 'insufficient_credits';
};

const PLAN_DAILY_LIMITS = {
  starter: 10,
  pro: 30,
  dedicated: 100,
} as const;

function parseChannelConfig(channelConfig: string | null): AgentChannelConfig {
  if (!channelConfig) {
    return {};
  }

  try {
    return JSON.parse(channelConfig) as AgentChannelConfig;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    // Auth check FIRST — before parsing body
    const agentToken = request.headers.get('X-Agent-Token');

    if (!agentToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let json: unknown;

    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = agentTaskWebhookSchema.safeParse(json);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const body = parsedBody.data;
    const db = await getDb();
    const [matchedInstance] = await db
      .select()
      .from(agentInstance)
      .where(
        and(
          eq(agentInstance.status, 'active'),
          eq(agentInstance.processId, body.agent_id),
          sql`${agentInstance.channelConfig}::jsonb->>'webhookToken' = ${agentToken}`
        )
      )
      .limit(1);

    if (!matchedInstance) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const dailyLimit = getDailyTaskLimit(matchedInstance.plan);
    const dailyUsageResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentTask)
      .where(
        and(
          eq(agentTask.agentId, matchedInstance.id),
          gte(agentTask.createdAt, todayStart)
        )
      );

    const usedToday = Number(dailyUsageResult[0]?.count ?? 0);

    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: 'Daily task limit reached',
          limit: dailyLimit,
          used: usedToday,
        },
        { status: 429 }
      );
    }

    const creditDescription = `Agent task completed: ${body.task_description}`;
    let creditsUsed = 0;
    let warning: string | undefined;
    let agentPaused = false;

    if (body.status === 'completed') {
      try {
        await consumeCredits({
          userId: matchedInstance.userId,
          amount: 1,
          description: creditDescription,
        });
        creditsUsed = 1;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Insufficient credits'
        ) {
          const channelConfig = parseChannelConfig(matchedInstance.channelConfig);
          const { pausedReason: _pausedReason, ...restChannelConfig } =
            channelConfig;

          if (channelConfig.openclawAgentId) {
            await sleepAgent(channelConfig.openclawAgentId);
          }

          await db
            .update(agentInstance)
            .set({
              status: 'sleeping',
              channelConfig: JSON.stringify({
                ...restChannelConfig,
                pausedReason: 'insufficient_credits',
              }),
              lastActiveAt: now,
              updatedAt: now,
            })
            .where(eq(agentInstance.id, matchedInstance.id));

          agentPaused = true;
          warning = 'Agent paused due to insufficient credits';
        } else {
          console.error('agent task webhook credit consumption error:', error);
          warning = 'Task completed but credits could not be consumed.';
        }
      }
    }

    await db.insert(agentTask).values({
      id: randomUUID(),
      agentId: matchedInstance.id,
      userId: matchedInstance.userId,
      description: body.task_description,
      status: body.status,
      engine: body.engine,
      creditsUsed,
      githubCommit: body.github_commit,
      githubRepo: body.github_repo,
      completedAt: now,
      createdAt: now,
    });

    if (!agentPaused) {
      await db
        .update(agentInstance)
        .set({
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(agentInstance.id, matchedInstance.id));
    }

    const remainingCredits = await getUserCredits(matchedInstance.userId);

    return NextResponse.json({
      success: true,
      remainingCredits,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    console.error('agent task webhook route error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process agent task webhook',
      },
      { status: 500 }
    );
  }
}

function getDailyTaskLimit(plan: string) {
  if (plan === 'pro') {
    return PLAN_DAILY_LIMITS.pro;
  }

  if (plan === 'dedicated') {
    return PLAN_DAILY_LIMITS.dedicated;
  }

  return PLAN_DAILY_LIMITS.starter;
}
