import { randomUUID } from 'crypto';
import { consumeCreditsInTransaction, getUserCredits } from '@/credits/credits';
import { getDb } from '@/db';
import { agentInstance } from '@/db/schema';
import { provisionAgent, terminateAgent } from '@/lib/agent-provisioner';
import { auth } from '@/lib/auth';
import { generateTelegramAccountId } from '@/lib/telegram-binding';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const provisionAgentSchema = z.object({
  name: z.string().trim().min(1),
  plan: z.enum(['starter', 'pro', 'dedicated']),
  channel: z.string().trim().min(1),
  telegramAccountId: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let json: unknown;

    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = provisionAgentSchema.safeParse(json);

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
    const userId = session.user.id;

    if (body.channel !== 'telegram') {
      return NextResponse.json(
        { error: 'Only telegram channel supported in MVP' },
        { status: 400 }
      );
    }

    const currentCredits = await getUserCredits(userId);

    if (currentCredits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    const db = await getDb();
    const instanceId = randomUUID();
    const telegramAccountId =
      body.telegramAccountId || generateTelegramAccountId(instanceId);
    const result = await provisionAgent({
      userId,
      userName: session.user.name || 'User',
      agentName: body.name,
      plan: body.plan,
      channel: 'telegram',
      telegramAccountId,
      model: undefined,
    });
    const channelConfig = JSON.stringify({
      webhookToken: result.webhookToken,
      telegramAccountId,
      openclawAgentId: result.openclawAgentId,
    });

    try {
      await db.transaction(async (tx) => {
        await tx.insert(agentInstance).values({
          id: instanceId,
          userId,
          name: body.name,
          plan: body.plan,
          channel: 'telegram',
          channelConfig,
          processId: result.openclawAgentId,
          workspacePath: result.workspacePath,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await consumeCreditsInTransaction(tx, {
          userId,
          amount: 1,
          description: `Agent provisioning: ${body.name}`,
        });
      });
    } catch (error) {
      await terminateAgent(result.openclawAgentId, result.workspacePath, true);
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        agentId: instanceId,
        openclawAgentId: result.openclawAgentId,
        workspacePath: result.workspacePath,
        status: 'active',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('provision agent route error:', error);

    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to provision agent',
      },
      { status: 500 }
    );
  }
}
