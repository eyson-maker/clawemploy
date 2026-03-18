import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDb } from '@/db';
import { agentInstance, agentProject, agentTask, payment } from '@/db/schema';
import { getUserCredits } from '@/credits/credits';
import { findPlanByPriceId } from '@/lib/price-plan';
import { getSession } from '@/lib/server';
import { PaymentScenes, PaymentTypes } from '@/payment/types';
import { Routes } from '@/routes';
import { AgentActions } from './agent-actions';
import { HireAgentButton } from './hire-agent-button';
import { SetupWizardWithRefresh } from './setup-wizard';
import { and, count, desc, eq, or, sum } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

type AgentChannelConfig = {
  webhookToken?: string;
  telegramAccountId?: string;
  openclawAgentId?: string;
  telegramBotToken?: string;
  botUsername?: string;
  botName?: string;
  pausedReason?: 'insufficient_credits';
};

const STATUS_LABELS = {
  active: 'statusActive',
  sleeping: 'statusSleeping',
  pending: 'statusPending',
  terminated: 'statusTerminated',
} as const;

type AgentPlan = 'starter' | 'pro' | 'dedicated';

export default async function AgentPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect(Routes.Login);
  }

  const t = await getTranslations('AgentDashboard');
  const commonT = await getTranslations('Common');
  const db = await getDb();
  const userId = session.user.id;

  const [allInstances, currentCredits, paymentRecords] = await Promise.all([
    db
      .select()
      .from(agentInstance)
      .where(eq(agentInstance.userId, userId))
      .orderBy(desc(agentInstance.createdAt)),
    getUserCredits(userId),
    db
      .select({ priceId: payment.priceId })
      .from(payment)
      .where(
        and(
          eq(payment.userId, userId),
          eq(payment.paid, true),
          or(
            and(
              eq(payment.type, PaymentTypes.SUBSCRIPTION),
              or(eq(payment.status, 'active'), eq(payment.status, 'trialing'))
            ),
            and(
              eq(payment.type, PaymentTypes.ONE_TIME),
              eq(payment.scene, PaymentScenes.LIFETIME),
              eq(payment.status, 'completed')
            )
          )
        )
      )
      .orderBy(desc(payment.createdAt)),
  ]);

  const activeAgents = allInstances.filter((a) => a.status !== 'terminated');
  const hasCredits = currentCredits > 0;
  const currentPlan = resolveProvisionPlan(
    paymentRecords.map((record) => record.priceId),
    activeAgents[0]?.plan
  );

  const agentNeedingSetup = activeAgents.find((agent) => {
    const channelConfig = parseChannelConfig(agent.channelConfig);
    const hasTelegramConfig = Boolean(channelConfig.botUsername);
    return agent.status === 'active' && !hasTelegramConfig;
  });

  if (agentNeedingSetup) {
    return (
      <SetupWizardWithRefresh
        agentId={agentNeedingSetup.id}
        agentName={agentNeedingSetup.name}
      />
    );
  }

  const [taskStatsResult, creditsResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(agentTask)
      .where(
        and(eq(agentTask.userId, userId), eq(agentTask.status, 'completed'))
      ),
    db
      .select({ total: sum(agentTask.creditsUsed) })
      .from(agentTask)
      .where(eq(agentTask.userId, userId)),
  ]);

  const completedTasks = taskStatsResult[0]?.count || 0;
  const totalCreditsUsed = Number(creditsResult[0]?.total) || 0;

  return (
    <div className="space-y-6">
      {/* Header with title + Hire button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <HireAgentButton
          hasCredits={hasCredits}
          plan={currentPlan}
          translations={{
            hireAgent: activeAgents.length > 0 ? t('hireAnother') : t('getStarted'),
            processing: t('processing'),
            buyCredits: t('buyCredits'),
          }}
        />
      </div>

      {/* Credits summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('credits')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">
              {t('creditsRemaining')}
            </span>
            <span className="text-lg font-semibold">
              {currentCredits.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">
              {t('creditsUsed')}
            </span>
            <span className="text-lg font-semibold">{totalCreditsUsed}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">
              {t('tasksCompleted')}
            </span>
            <span className="text-lg font-semibold">{completedTasks}</span>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {activeAgents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground text-center text-lg">
              {hasCredits ? t('hasCreditsReady') : t('noCreditsCta')}
            </p>
          </CardContent>
        </Card>
      )}

      {activeAgents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          currentCredits={currentCredits}
          t={t}
          cancelLabel={commonT('cancel')}
        />
      ))}
    </div>
  );
}

async function AgentCard({
  agent,
  currentCredits,
  t,
  cancelLabel,
}: {
  agent: typeof agentInstance.$inferSelect;
  currentCredits: number;
  t: Awaited<ReturnType<typeof getTranslations<'AgentDashboard'>>>;
  cancelLabel: string;
}) {
  const channelConfig = parseChannelConfig(agent.channelConfig);
  const telegramBotUsername = channelConfig.botUsername ?? null;
  const hasTelegramConfiguration = Boolean(telegramBotUsername);
  const openTelegramUrl = telegramBotUsername
    ? `https://t.me/${telegramBotUsername}`
    : null;
  const statusLabel =
    agent.status === 'sleeping' &&
    channelConfig.pausedReason === 'insufficient_credits'
      ? t('pausedInsufficientCredits')
      : t(getStatusLabelKey(agent.status));
  const planLabel = formatAgentValue(agent.plan);
  const channelLabel = agent.channel ? formatAgentValue(agent.channel) : null;

  const db = await getDb();
  const [tasks, projects] = await Promise.all([
    db
      .select()
      .from(agentTask)
      .where(eq(agentTask.agentId, agent.id))
      .orderBy(desc(agentTask.createdAt))
      .limit(5),
    db
      .select()
      .from(agentProject)
      .where(eq(agentProject.agentId, agent.id)),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{agent.name}</span>
          <StatusBadge status={agent.status} label={statusLabel} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-muted-foreground">{t('plan')}</span>
            <span className="font-medium">{planLabel}</span>
          </div>
          {channelLabel && (
            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
              <span className="text-muted-foreground">{t('channel')}</span>
              <span className="font-medium">{channelLabel}</span>
            </div>
          )}
          {telegramBotUsername && (
            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
              <span className="text-muted-foreground">{t('telegramBot')}</span>
              <span className="font-medium">@{telegramBotUsername}</span>
            </div>
          )}
          {agent.lastActiveAt && (
            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
              <span className="text-muted-foreground">{t('lastActive')}</span>
              <span className="font-medium">
                {agent.lastActiveAt.toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {agent.status === 'active' && hasTelegramConfiguration && openTelegramUrl && (
            <Button asChild size="sm">
              <a href={openTelegramUrl} target="_blank" rel="noreferrer">
                {t('openTelegram')}
              </a>
            </Button>
          )}
          <AgentActions
            agentId={agent.id}
            status={agent.status}
            canWake={currentCredits > 0}
            translations={{
              sleep: t('sleep'),
              wake: t('wake'),
              terminate: t('terminate'),
              confirmTerminate: t('confirmTerminate'),
              terminateDescription: t('terminateDescription'),
              cancel: cancelLabel,
              processing: t('processing'),
            }}
          />
        </div>

        {/* Recent tasks (collapsed) */}
        {tasks.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {t('recentTasks')}
            </p>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{task.description || '—'}</p>
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

        {/* Projects */}
        {projects.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {t('projects')}
            </p>
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded border p-2"
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
  );
}

function parseChannelConfig(channelConfig: string | null): AgentChannelConfig {
  if (!channelConfig) {
    return {};
  }

  try {
    const parsedConfig = JSON.parse(channelConfig) as unknown;

    if (!parsedConfig || typeof parsedConfig !== 'object') {
      return {};
    }

    return parsedConfig as AgentChannelConfig;
  } catch {
    return {};
  }
}

function getStatusLabelKey(status: string) {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || 'statusPending';
}

function resolveProvisionPlan(
  priceIds: string[],
  fallbackPlan?: string | null
): AgentPlan {
  for (const priceId of priceIds) {
    const planId = findPlanByPriceId(priceId)?.id;
    const normalizedPlan = normalizeAgentPlan(planId);

    if (normalizedPlan) {
      return normalizedPlan;
    }
  }

  return normalizeAgentPlan(fallbackPlan) ?? 'starter';
}

function normalizeAgentPlan(plan?: string | null): AgentPlan | null {
  if (plan === 'starter' || plan === 'pro' || plan === 'dedicated') {
    return plan;
  }

  return null;
}

function formatAgentValue(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
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
    blocked: 'outline',
    failed: 'destructive',
  };

  return (
    <Badge variant={variantMap[status] || 'outline'}>{status}</Badge>
  );
}
