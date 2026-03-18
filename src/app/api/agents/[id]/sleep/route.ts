import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { sleepAgent } from '@/lib/agent-provisioner';
import { auth } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AgentChannelConfig = {
  openclawAgentId?: string;
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

    if (instance.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active agents can be put to sleep' },
        { status: 400 }
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

    await sleepAgent(channelConfig.openclawAgentId);

    await db
      .update(agentInstance)
      .set({
        status: 'sleeping',
        channelConfig: JSON.stringify(restChannelConfig),
        updatedAt: new Date(),
      })
      .where(eq(agentInstance.id, id));

    return NextResponse.json({ success: true, status: 'sleeping' });
  } catch (error) {
    console.error('sleep agent route error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sleep agent',
      },
      { status: 500 }
    );
  }
}
