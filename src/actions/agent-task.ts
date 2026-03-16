'use server';

import { getDb } from '@/db';
import { agentTask } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, count, desc, eq, sum } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const getTasksSchema = z.object({
  agentId: z.string(),
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
});

/**
 * Get agent tasks with pagination
 */
export const getAgentTasksAction = userActionClient
  .schema(getTasksSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      const tasks = await db
        .select()
        .from(agentTask)
        .where(
          and(
            eq(agentTask.agentId, parsedInput.agentId),
            eq(agentTask.userId, currentUser.id)
          )
        )
        .orderBy(desc(agentTask.createdAt))
        .limit(parsedInput.limit)
        .offset(parsedInput.offset);

      return { success: true, data: tasks };
    } catch (error) {
      console.error('get agent tasks error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch agent tasks',
      };
    }
  });

const createTaskSchema = z.object({
  agentId: z.string(),
  description: z.string().min(1),
  engine: z.string().optional(),
});

/**
 * Create a new agent task
 */
export const createAgentTaskAction = userActionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      const newTask = {
        id: randomUUID(),
        agentId: parsedInput.agentId,
        userId: currentUser.id,
        description: parsedInput.description,
        engine: parsedInput.engine || null,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.insert(agentTask).values(newTask);

      return { success: true, data: newTask };
    } catch (error) {
      console.error('create agent task error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create agent task',
      };
    }
  });

const updateTaskSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  creditsUsed: z.number().min(0).optional(),
  githubCommit: z.string().optional(),
  githubRepo: z.string().optional(),
  result: z.string().optional(),
});

/**
 * Update an agent task
 */
export const updateAgentTaskAction = userActionClient
  .schema(updateTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      // Verify ownership
      const task = await db
        .select()
        .from(agentTask)
        .where(
          and(
            eq(agentTask.id, parsedInput.taskId),
            eq(agentTask.userId, currentUser.id)
          )
        )
        .limit(1);

      if (task.length === 0) {
        return { success: false, error: 'Task not found' };
      }

      const updates: Record<string, unknown> = {};
      if (parsedInput.status) updates.status = parsedInput.status;
      if (parsedInput.creditsUsed !== undefined)
        updates.creditsUsed = parsedInput.creditsUsed;
      if (parsedInput.githubCommit)
        updates.githubCommit = parsedInput.githubCommit;
      if (parsedInput.githubRepo) updates.githubRepo = parsedInput.githubRepo;
      if (parsedInput.result) updates.result = parsedInput.result;

      if (parsedInput.status === 'running') {
        updates.startedAt = new Date();
      }
      if (
        parsedInput.status === 'completed' ||
        parsedInput.status === 'failed'
      ) {
        updates.completedAt = new Date();
      }

      await db
        .update(agentTask)
        .set(updates)
        .where(eq(agentTask.id, parsedInput.taskId));

      return { success: true };
    } catch (error) {
      console.error('update agent task error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update agent task',
      };
    }
  });

/**
 * Get task statistics for the user
 */
export const getTaskStatsAction = userActionClient.action(async ({ ctx }) => {
  try {
    const currentUser = (ctx as { user: User }).user;
    const db = await getDb();

    const totalResult = await db
      .select({ count: count() })
      .from(agentTask)
      .where(eq(agentTask.userId, currentUser.id));

    const completedResult = await db
      .select({ count: count() })
      .from(agentTask)
      .where(
        and(
          eq(agentTask.userId, currentUser.id),
          eq(agentTask.status, 'completed')
        )
      );

    const creditsResult = await db
      .select({ total: sum(agentTask.creditsUsed) })
      .from(agentTask)
      .where(eq(agentTask.userId, currentUser.id));

    return {
      success: true,
      data: {
        totalTasks: totalResult[0]?.count || 0,
        completedTasks: completedResult[0]?.count || 0,
        totalCreditsUsed: Number(creditsResult[0]?.total) || 0,
      },
    };
  } catch (error) {
    console.error('get task stats error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch task statistics',
    };
  }
});
