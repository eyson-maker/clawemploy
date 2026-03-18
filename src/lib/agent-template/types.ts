export interface AgentTemplateVars {
  agent_name: string
  agent_id: string
  user_name: string
  user_id: string
  plan: string
  webhook_url: string
  webhook_token: string
  cli_bridge_url: string
}

export interface ProvisionParams {
  userId: string
  userName: string
  agentName: string
  plan: 'starter' | 'pro' | 'dedicated'
  channel: 'telegram'
  telegramAccountId?: string
  model?: string
}

export interface ProvisionResult {
  agentId: string
  openclawAgentId: string
  workspacePath: string
  webhookToken: string
  status: 'active'
  telegramBotLink?: string
}

export interface HealthStatus {
  agentId: string
  openclawRegistered: boolean
  workspaceExists: boolean
  status: 'healthy' | 'degraded' | 'down'
}
