'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type SetupWizardProps = {
  agentId: string;
  agentName: string;
  onConfigured: () => void;
};

type StepState = 'done' | 'active' | 'pending';

type ConfigureAgentResponse = {
  success?: boolean;
  botUsername?: string;
  botName?: string;
  error?: string;
};

const TELEGRAM_BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

function isConfigureAgentResponse(
  value: unknown
): value is ConfigureAgentResponse {
  return Boolean(value) && typeof value === 'object';
}

export function SetupWizard({
  agentId,
  agentName,
  onConfigured,
}: SetupWizardProps) {
  const t = useTranslations('AgentDashboard');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botName, setBotName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = useMemo(
    () => [
      {
        label: t('setupStep1'),
        state: 'done' as StepState,
      },
      {
        label: t('setupStep2'),
        state: botUsername ? ('done' as StepState) : ('active' as StepState),
      },
      {
        label: t('setupStep3'),
        state: botUsername ? ('active' as StepState) : ('pending' as StepState),
      },
    ],
    [botUsername, t]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedToken = telegramBotToken.trim();

    if (!trimmedToken) {
      setError(t('botTokenRequired'));
      return;
    }

    if (!TELEGRAM_BOT_TOKEN_PATTERN.test(trimmedToken)) {
      setError(t('botTokenInvalid'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramBotToken: trimmedToken }),
      });

      const data = (await response.json().catch(() => null)) as unknown;
      const responseData = isConfigureAgentResponse(data) ? data : null;

      if (
        !response.ok ||
        !responseData?.success ||
        !responseData.botUsername
      ) {
        throw new Error(responseData?.error || t('configureError'));
      }

      setBotUsername(responseData.botUsername);
      setBotName(responseData.botName || responseData.botUsername);
      onConfigured();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('configureError')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{agentName}</CardTitle>
        <CardDescription>{t('telegramRequired')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className="rounded-lg border p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={[
                    'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
                    step.state === 'done'
                      ? 'bg-primary text-primary-foreground'
                      : step.state === 'active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {index + 1}
                </div>
                <p className="text-sm font-medium">{step.label}</p>
              </div>
              <Badge
                variant={
                  step.state === 'done'
                    ? 'default'
                    : step.state === 'active'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {step.state === 'done'
                  ? t('connected')
                  : step.state === 'active'
                    ? t('configureTelegram')
                    : t('firstTaskHint')}
              </Badge>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-lg border p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('configureTelegram')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('botTokenInstructions')}
            </p>
          </div>

          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>{t('botFatherStep1')}</li>
            <li>{t('botFatherStep2')}</li>
            <li>{t('botFatherStep3')}</li>
            <li>{t('botFatherStep4')}</li>
            <li>{t('botFatherStep5')}</li>
          </ol>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="telegramBotToken">{t('botTokenLabel')}</Label>
              <Input
                id="telegramBotToken"
                name="telegramBotToken"
                type="password"
                value={telegramBotToken}
                onChange={(event) => setTelegramBotToken(event.target.value)}
                placeholder={t('botTokenPlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('processing') : t('saveAndConnect')}
            </Button>
          </form>
        </div>

        {botUsername ? (
          <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t('agentReady')}</h2>
                <p className="text-muted-foreground text-sm">
                  {botName || agentName} · @{botUsername}
                </p>
              </div>
              <Badge>{t('connected')}</Badge>
            </div>

            <p className="text-sm text-muted-foreground">{t('firstTaskHint')}</p>

            <Button asChild>
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('openTelegram')}
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SetupWizardWithRefresh({
  agentId,
  agentName,
}: Omit<SetupWizardProps, 'onConfigured'>) {
  const router = useRouter();

  return (
    <SetupWizard
      agentId={agentId}
      agentName={agentName}
      onConfigured={() => router.refresh()}
    />
  );
}
