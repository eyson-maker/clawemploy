'use server';

import { getDb } from '@/db';
import { agentInstance, agentTask } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, count, eq, ne, sum } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Get the user's agent instance
 */
export const getAgentInstanceAction = userActionClient.action(
  async ({ ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      const instances = await db
        .select()
        .from(agentInstance)
        .where(eq(agentInstance.userId, currentUser.id))
        .limit(1);

      return { success: true, data: instances[0] || null };
    } catch (error) {
      console.error('get agent instance error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch agent instance',
      };
    }
  }
);

const createAgentSchema = z.object({
  plan: z.enum(['starter', 'pro', 'dedicated']),
  name: z.string().min(1),
  channel: z.string().optional(),
});

/**
 * Create a new agent instance (only one active instance per user)
 */
export const createAgentInstanceAction = userActionClient
  .schema(createAgentSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      // Check for existing active instance
      const existing = await db
        .select()
        .from(agentInstance)
        .where(
          and(
            eq(agentInstance.userId, currentUser.id),
            ne(agentInstance.status, 'terminated')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          error: 'You already have an active agent instance',
        };
      }

      const newInstance = {
        id: randomUUID(),
        userId: currentUser.id,
        name: parsedInput.name,
        plan: parsedInput.plan,
        channel: parsedInput.channel || null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(agentInstance).values(newInstance);

      return { success: true, data: newInstance };
    } catch (error) {
      console.error('create agent instance error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create agent instance',
      };
    }
  });

const updateStatusSchema = z.object({
  instanceId: z.string(),
  status: z.enum(['pending', 'active', 'sleeping', 'terminated']),
});

/**
 * Update agent instance status
 */
export const updateAgentStatusAction = userActionClient
  .schema(updateStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      // Verify ownership
      const instance = await db
        .select()
        .from(agentInstance)
        .where(
          and(
            eq(agentInstance.id, parsedInput.instanceId),
            eq(agentInstance.userId, currentUser.id)
          )
        )
        .limit(1);

      if (instance.length === 0) {
        return { success: false, error: 'Agent instance not found' };
      }

      await db
        .update(agentInstance)
        .set({
          status: parsedInput.status,
          updatedAt: new Date(),
        })
        .where(eq(agentInstance.id, parsedInput.instanceId));

      return { success: true };
    } catch (error) {
      console.error('update agent status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update agent status',
      };
    }
  });

/**
 * Get agent statistics (task count, credits usage)
 */
export const getAgentStatsAction = userActionClient.action(async ({ ctx }) => {
  try {
    const currentUser = (ctx as { user: User }).user;
    const db = await getDb();

    const taskCountResult = await db
      .select({ count: count() })
      .from(agentTask)
      .where(eq(agentTask.userId, currentUser.id));

    const completedTasksResult = await db
      .select({ count: count() })
      .from(agentTask)
      .where(
        and(
          eq(agentTask.userId, currentUser.id),
          eq(agentTask.status, 'completed')
        )
      );

    const creditsUsedResult = await db
      .select({ total: sum(agentTask.creditsUsed) })
      .from(agentTask)
      .where(eq(agentTask.userId, currentUser.id));

    return {
      success: true,
      data: {
        totalTasks: taskCountResult[0]?.count || 0,
        completedTasks: completedTasksResult[0]?.count || 0,
        totalCreditsUsed: Number(creditsUsedResult[0]?.total) || 0,
      },
    };
  } catch (error) {
    console.error('get agent stats error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch agent statistics',
    };
  }
});
