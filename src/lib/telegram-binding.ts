export function generateTelegramAccountId(agentId: string): string {
  return `clawemploy_${agentId.replace(/-/g, '').slice(0, 8)}`;
}

export function getTelegramBotLink(accountId: string): string | null {
  void accountId;
  return null;
}
