import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDb } from '@/db';
import { agentInstance, agentProject, agentTask } from '@/db/schema';
import { LocaleLink } from '@/i18n/navigation';
import { getSession } from '@/lib/server';
import { Routes } from '@/routes';
import { and, count, desc, eq, sum } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function AgentPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect(Routes.Login);
  }

  const t = await getTranslations('AgentDashboard');
  const db = await getDb();
  const userId = session.user.id;

  // Get user's agent instance
  const instances = await db
    .select()
    .from(agentInstance)
    .where(eq(agentInstance.userId, userId))
    .limit(1);

  const agent = instances[0];

  // No agent — show CTA
  if (!agent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <p className="text-muted-foreground text-lg">{t('noAgent')}</p>
          <Button asChild>
            <LocaleLink href={Routes.Pricing}>{t('getStarted')}</LocaleLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Fetch tasks, projects, and stats in parallel
  const [tasks, projects, taskStatsResult, creditsResult] = await Promise.all([
    db
      .select()
      .from(agentTask)
      .where(
        and(eq(agentTask.agentId, agent.id), eq(agentTask.userId, userId))
      )
      .orderBy(desc(agentTask.createdAt))
      .limit(5),
    db
      .select()
      .from(agentProject)
      .where(
        and(
          eq(agentProject.agentId, agent.id),
          eq(agentProject.userId, userId)
        )
      ),
    db
      .select({ count: count() })
      .from(agentTask)
      .where(
        and(
          eq(agentTask.userId, userId),
          eq(agentTask.status, 'completed')
        )
      ),
    db
      .select({ total: sum(agentTask.creditsUsed) })
      .from(agentTask)
      .where(eq(agentTask.userId, userId)),
  ]);

  const completedTasks = taskStatsResult[0]?.count || 0;
  const totalCreditsUsed = Number(creditsResult[0]?.total) || 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Agent Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>{agent.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {t('status')}
            </span>
            <StatusBadge status={agent.status} label={t(`status.${agent.status as 'active' | 'sleeping' | 'pending' | 'terminated'}`)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {t('plan')}
            </span>
            <span className="text-sm font-medium capitalize">
              {agent.plan}
            </span>
          </div>
          {agent.channel && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {t('channel')}
              </span>
              <span className="text-sm font-medium capitalize">
                {agent.channel}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('credits')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {t('creditsUsed')}
            </span>
            <span className="text-sm font-medium">{totalCreditsUsed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {t('tasksCompleted')}
            </span>
            <span className="text-sm font-medium">{completedTasks}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t('recentTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noTasks')}</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {task.description || '—'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {task.engine && <span>{task.engine} · </span>}
                      {task.creditsUsed ?? 0} credits ·{' '}
                      {task.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t('projects')}</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noProjects')}</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {project.githubRepo && (
                        <span>{project.githubRepo} · </span>
                      )}
                      {project.techStack || '—'}
                    </p>
                  </div>
                  {project.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const variantMap: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    active: 'default',
    sleeping: 'secondary',
    pending: 'outline',
    terminated: 'destructive',
  };

  return <Badge variant={variantMap[status] || 'outline'}>{label}</Badge>;
}

function TaskStatusBadge({ status }: { status: string }) {
  const variantMap: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    completed: 'default',
    running: 'secondary',
    pending: 'outline',
    failed: 'destructive',
  };

  return (
    <Badge variant={variantMap[status] || 'outline'}>{status}</Badge>
  );
}
