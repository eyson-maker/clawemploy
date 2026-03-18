'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AgentActionsProps = {
  agentId: string;
  status: string;
  translations: {
    sleep: string;
    wake: string;
    terminate: string;
    confirmTerminate: string;
    terminateDescription: string;
    cancel: string;
    processing: string;
  };
};

type AgentAction = 'sleep' | 'wake' | 'terminate';

export function AgentActions({
  agentId,
  status,
  canWake = true,
  translations,
}: AgentActionsProps & { canWake?: boolean }) {
  const router = useRouter();
  const [processingAction, setProcessingAction] =
    useState<AgentAction | null>(null);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);

  const handleAction = async (action: AgentAction) => {
    setProcessingAction(action);

    try {
      const response = await fetch(`/api/agents/${agentId}/${action}`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      if (action === 'terminate') {
        setTerminateDialogOpen(false);
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setProcessingAction(null);
    }
  };

  const isProcessing = processingAction !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'active' && (
        <Button
          variant="outline"
          disabled={isProcessing}
          onClick={() => handleAction('sleep')}
        >
          {processingAction === 'sleep'
            ? translations.processing
            : translations.sleep}
        </Button>
      )}
      {status === 'sleeping' && (
        <Button
          disabled={isProcessing || !canWake}
          onClick={() => handleAction('wake')}
        >
          {processingAction === 'wake'
            ? translations.processing
            : translations.wake}
        </Button>
      )}
      {status !== 'terminated' && (
        <AlertDialog
          open={terminateDialogOpen}
          onOpenChange={(open) => {
            if (!isProcessing) {
              setTerminateDialogOpen(open);
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isProcessing}>
              {processingAction === 'terminate'
                ? translations.processing
                : translations.terminate}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{translations.confirmTerminate}</AlertDialogTitle>
              <AlertDialogDescription>
                {translations.terminateDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>
                {translations.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isProcessing}
                onClick={(event) => {
                  event.preventDefault();
                  void handleAction('terminate');
                }}
              >
                {processingAction === 'terminate'
                  ? translations.processing
                  : translations.terminate}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
