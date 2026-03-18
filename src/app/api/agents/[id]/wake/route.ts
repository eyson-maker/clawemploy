import path from 'node:path';
import { getUserCredits } from '@/credits/credits';
import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { wakeAgent } from '@/lib/agent-provisioner';
import { auth } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AgentChannelConfig = {
  openclawAgentId?: string;
  telegramAccountId?: string;
  pausedReason?: 'insufficient_credits';
};

function parseChannelConfig(channelConfig: string | null): AgentChannelConfig {
  if (!channelConfig) {
    throw new Error('Agent channel configuration is missing');
  }

  return JSON.parse(channelConfig) as AgentChannelConfig;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = await getDb();
    const instances = await db
      .select()
      .from(agentInstance)
      .where(
        and(eq(agentInstance.id, id), eq(agentInstance.userId, session.user.id))
      )
      .limit(1);

    const instance = instances[0];

    if (!instance) {
      return NextResponse.json(
        { error: 'Agent instance not found' },
        { status: 404 }
      );
    }

    if (instance.status !== 'sleeping') {
      return NextResponse.json(
        { error: 'Only sleeping agents can be woken up' },
        { status: 400 }
      );
    }

    const currentCredits = await getUserCredits(session.user.id);

    if (currentCredits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits to wake agent' },
        { status: 402 }
      );
    }

    if (!instance.workspacePath) {
      return NextResponse.json(
        { error: 'Agent workspace path is missing' },
        { status: 500 }
      );
    }

    const channelConfig = parseChannelConfig(instance.channelConfig);
    const { pausedReason: _pausedReason, ...restChannelConfig } = channelConfig;

    if (!channelConfig.openclawAgentId) {
      return NextResponse.json(
        { error: 'OpenClaw agent ID is missing' },
        { status: 500 }
      );
    }

    const agentDir = path.join(path.dirname(instance.workspacePath), 'agent');

    await wakeAgent(
      channelConfig.openclawAgentId,
      instance.workspacePath,
      agentDir,
      undefined,
      channelConfig.telegramAccountId
    );

    await db
      .update(agentInstance)
      .set({
        status: 'active',
        channelConfig: JSON.stringify(restChannelConfig),
        updatedAt: new Date(),
      })
      .where(eq(agentInstance.id, id));

    return NextResponse.json({ success: true, status: 'active' });
  } catch (error) {
    console.error('wake agent route error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to wake agent',
      },
      { status: 500 }
    );
  }
}
