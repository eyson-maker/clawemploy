'use server';

import { getDb } from '@/db';
import { agentProject } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Get agent's associated projects
 */
export const getAgentProjectsAction = userActionClient
  .schema(z.object({ agentId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      const projects = await db
        .select()
        .from(agentProject)
        .where(
          and(
            eq(agentProject.agentId, parsedInput.agentId),
            eq(agentProject.userId, currentUser.id)
          )
        );

      return { success: true, data: projects };
    } catch (error) {
      console.error('get agent projects error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch agent projects',
      };
    }
  });

const createProjectSchema = z.object({
  agentId: z.string(),
  name: z.string().min(1),
  githubRepo: z.string().optional(),
  techStack: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Create a new project for an agent
 */
export const createAgentProjectAction = userActionClient
  .schema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      const newProject = {
        id: randomUUID(),
        agentId: parsedInput.agentId,
        userId: currentUser.id,
        name: parsedInput.name,
        githubRepo: parsedInput.githubRepo || null,
        techStack: parsedInput.techStack || null,
        description: parsedInput.description || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(agentProject).values(newProject);

      return { success: true, data: newProject };
    } catch (error) {
      console.error('create agent project error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create agent project',
      };
    }
  });

const updateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).optional(),
  githubRepo: z.string().optional(),
  techStack: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Update an agent project
 */
export const updateAgentProjectAction = userActionClient
  .schema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      // Verify ownership
      const project = await db
        .select()
        .from(agentProject)
        .where(
          and(
            eq(agentProject.id, parsedInput.projectId),
            eq(agentProject.userId, currentUser.id)
          )
        )
        .limit(1);

      if (project.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (parsedInput.name) updates.name = parsedInput.name;
      if (parsedInput.githubRepo !== undefined)
        updates.githubRepo = parsedInput.githubRepo;
      if (parsedInput.techStack !== undefined)
        updates.techStack = parsedInput.techStack;
      if (parsedInput.description !== undefined)
        updates.description = parsedInput.description;

      await db
        .update(agentProject)
        .set(updates)
        .where(eq(agentProject.id, parsedInput.projectId));

      return { success: true };
    } catch (error) {
      console.error('update agent project error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update agent project',
      };
    }
  });

/**
 * Deactivate a project
 */
export const deactivateProjectAction = userActionClient
  .schema(z.object({ projectId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const db = await getDb();

      // Verify ownership
      const project = await db
        .select()
        .from(agentProject)
        .where(
          and(
            eq(agentProject.id, parsedInput.projectId),
            eq(agentProject.userId, currentUser.id)
          )
        )
        .limit(1);

      if (project.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      await db
        .update(agentProject)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(agentProject.id, parsedInput.projectId));

      return { success: true };
    } catch (error) {
      console.error('deactivate project error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to deactivate project',
      };
    }
  });
