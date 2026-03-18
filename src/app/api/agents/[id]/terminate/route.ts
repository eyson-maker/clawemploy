import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { terminateAgent } from '@/lib/agent-provisioner';
import { auth } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AgentChannelConfig = {
  openclawAgentId?: string;
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

    if (instance.status === 'terminated') {
      return NextResponse.json(
        { error: 'Agent is already terminated' },
        { status: 400 }
      );
    }

    const channelConfig = parseChannelConfig(instance.channelConfig);

    if (!channelConfig.openclawAgentId) {
      return NextResponse.json(
        { error: 'OpenClaw agent ID is missing' },
        { status: 500 }
      );
    }

    await terminateAgent(
      channelConfig.openclawAgentId,
      instance.workspacePath ?? undefined,
      false
    );

    await db
      .update(agentInstance)
      .set({
        status: 'terminated',
        updatedAt: new Date(),
      })
      .where(eq(agentInstance.id, id));

    return NextResponse.json({ success: true, status: 'terminated' });
  } catch (error) {
    console.error('terminate agent route error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to terminate agent',
      },
      { status: 500 }
    );
  }
}
