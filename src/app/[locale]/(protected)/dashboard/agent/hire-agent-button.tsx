'use client';

import { Button } from '@/components/ui/button';
import { useLocaleRouter } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { useState } from 'react';

type HireAgentButtonProps = {
  translations: {
    hireAgent: string;
    processing: string;
    buyCredits: string;
  };
  hasCredits: boolean;
  plan?: 'starter' | 'pro' | 'dedicated';
};

export function HireAgentButton({
  translations,
  hasCredits,
  plan = 'starter',
}: HireAgentButtonProps) {
  const router = useLocaleRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleHire = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/agents/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Developer Agent',
          plan,
          channel: 'telegram',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create agent');
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hasCredits) {
    return <Button onClick={() => router.push(Routes.Pricing)}>{translations.buyCredits}</Button>;
  }

  return (
    <Button onClick={handleHire} disabled={isProcessing}>
      {isProcessing ? translations.processing : translations.hireAgent}
    </Button>
  );
}
