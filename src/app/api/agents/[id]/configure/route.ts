import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { auth } from '@/lib/auth';
import { configureAgentChannel } from '@/lib/agent-provisioner';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AgentChannelConfig = {
  openclawAgentId?: string;
  telegramAccountId?: string;
  telegramBotToken?: string;
  botUsername?: string;
  botName?: string;
};

const TELEGRAM_BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

const configureAgentSchema = z.object({
  telegramBotToken: z.string().trim().regex(TELEGRAM_BOT_TOKEN_PATTERN),
});

function parseChannelConfig(
  channelConfig: string | null
): AgentChannelConfig | null {
  if (!channelConfig) {
    return null;
  }

  try {
    const parsedConfig = JSON.parse(channelConfig) as unknown;

    if (!parsedConfig || typeof parsedConfig !== 'object') {
      return null;
    }

    return parsedConfig as AgentChannelConfig;
  } catch {
    return null;
  }
}

function redactSecret(value: string, secret: string): string {
  if (!secret) {
    return value;
  }

  return value.split(secret).join('[REDACTED]');
}

export async function POST(request: Request, context: RouteContext) {
  let submittedBotToken = '';

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
        { error: 'Only active agents can be configured' },
        { status: 409 }
      );
    }

    const channelConfig = parseChannelConfig(instance.channelConfig);

    if (!channelConfig) {
      return NextResponse.json(
        { error: 'Agent channel configuration is invalid' },
        { status: 500 }
      );
    }

    if (!channelConfig.openclawAgentId) {
      return NextResponse.json(
        { error: 'OpenClaw agent ID is missing' },
        { status: 500 }
      );
    }

    if (!channelConfig.telegramAccountId) {
      return NextResponse.json(
        { error: 'Telegram account ID is missing' },
        { status: 500 }
      );
    }

    let json: unknown;

    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = configureAgentSchema.safeParse(json);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid Telegram bot token',
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { telegramBotToken } = parsedBody.data;
    submittedBotToken = telegramBotToken;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getMe`,
      {
        cache: 'no-store',
      }
    );

    const telegramData = (await telegramResponse.json().catch(() => null)) as
      | {
          ok?: boolean;
          result?: {
            username?: string;
            first_name?: string;
            last_name?: string;
          };
        }
      | null;

    const botUsername = telegramData?.result?.username;
    const botName = [
      telegramData?.result?.first_name,
      telegramData?.result?.last_name,
    ]
      .filter(Boolean)
      .join(' ');

    if (!telegramResponse.ok || telegramData?.ok !== true || !botUsername) {
      return NextResponse.json(
        { error: 'Invalid Telegram bot token' },
        { status: 400 }
      );
    }

    await configureAgentChannel(
      channelConfig.openclawAgentId,
      channelConfig.telegramAccountId,
      telegramBotToken
    );

    await db
      .update(agentInstance)
      .set({
        channelConfig: JSON.stringify({
          ...channelConfig,
          botUsername,
          botName: botName || botUsername,
        }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(agentInstance.id, id), eq(agentInstance.userId, session.user.id))
      );

    return NextResponse.json({
      success: true,
      botUsername,
      botName: botName || botUsername,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? redactSecret(error.message, submittedBotToken)
        : 'Unknown error';

    console.error('configure agent route error:', errorMessage);

    return NextResponse.json(
      {
        error: 'Failed to configure Telegram',
      },
      { status: 500 }
    );
  }
}
