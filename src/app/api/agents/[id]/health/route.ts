import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { healthCheckAgent } from '@/lib/agent-provisioner';
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

export async function GET(request: Request, context: RouteContext) {
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

    if (!instance.workspacePath) {
      return NextResponse.json(
        { error: 'Agent workspace path is missing' },
        { status: 500 }
      );
    }

    const channelConfig = parseChannelConfig(instance.channelConfig);

    if (!channelConfig.openclawAgentId) {
      return NextResponse.json(
        { error: 'OpenClaw agent ID is missing' },
        { status: 500 }
      );
    }

    const healthStatus = await healthCheckAgent(
      channelConfig.openclawAgentId,
      instance.workspacePath
    );

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('health agent route error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check agent health',
      },
      { status: 500 }
    );
  }
}
