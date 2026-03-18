import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderAgentWorkspace } from './agent-template';
import type {
  AgentTemplateVars,
  HealthStatus,
  ProvisionParams,
  ProvisionResult,
} from './agent-template';

const OPENCLAW_BIN = '/opt/homebrew/bin/openclaw';
const DEFAULT_MODEL = 'dashscope/qwen3.5-plus';
const AGENTS_BASE = path.join(os.homedir(), '.clawemploy', 'agents');
const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/agent-task';
const LOCAL_CLI_BRIDGE_URL = 'http://127.0.0.1:9090';
const TELEGRAM_BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

function runOpenclaw(args: string[]): string {
  return execFileSync(OPENCLAW_BIN, args, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
}

function normalizeNonEmptyValue(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  if (/[\0\r\n]/.test(trimmed)) {
    throw new Error(`${fieldName} contains invalid control characters.`);
  }
  return trimmed;
}

function normalizeOpenclawAgentId(value: string): string {
  const normalized = normalizeNonEmptyValue(value, 'OpenClaw agent ID');
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error('OpenClaw agent ID contains unsupported characters.');
  }
  return normalized;
}

function normalizeTelegramAccountId(value: string): string {
  const normalized = normalizeNonEmptyValue(value, 'Telegram account ID');
  if (!/^[A-Za-z0-9_@-]+$/.test(normalized)) {
    throw new Error('Telegram account ID contains unsupported characters.');
  }
  return normalized;
}

function normalizeTelegramBotToken(value: string): string {
  const normalized = normalizeNonEmptyValue(value, 'Telegram bot token');

  if (!TELEGRAM_BOT_TOKEN_PATTERN.test(normalized)) {
    throw new Error('Telegram bot token format is invalid.');
  }

  return normalized;
}

function normalizeModel(value: string): string {
  return normalizeNonEmptyValue(value, 'Model');
}

function resolveManagedAgentBase(workspacePath: string): string {
  const resolvedAgentsBase = path.resolve(AGENTS_BASE);
  const resolvedWorkspacePath = path.resolve(workspacePath);
  const relativeWorkspacePath = path.relative(
    resolvedAgentsBase,
    resolvedWorkspacePath
  );

  if (
    !relativeWorkspacePath ||
    relativeWorkspacePath.startsWith('..') ||
    path.isAbsolute(relativeWorkspacePath)
  ) {
    throw new Error(
      'Workspace path must be inside the managed agents directory.'
    );
  }

  const segments = relativeWorkspacePath.split(path.sep);
  if (segments.length !== 2 || segments[1] !== 'workspace') {
    throw new Error('Workspace path must point to a managed agent workspace.');
  }

  return path.join(resolvedAgentsBase, segments[0]);
}

function parseOpenclawJson(output: string): unknown {
  const lines = output.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.endsWith(']') || line.endsWith('}')) {
      const jsonStart = lines.findIndex(
        (l) => l.trim().startsWith('[') || l.trim().startsWith('{')
      );
      if (jsonStart >= 0) {
        const jsonStr = lines.slice(jsonStart).join('\n');
        return JSON.parse(jsonStr);
      }
    }
  }
  return JSON.parse(output);
}

export async function provisionAgent(
  params: ProvisionParams
): Promise<ProvisionResult> {
  const agentId = crypto.randomUUID();
  const openclawAgentId = `ce_${agentId.replace(/-/g, '').slice(0, 8)}`;
  const model = normalizeModel(params.model ?? DEFAULT_MODEL);

  const agentBase = path.join(AGENTS_BASE, agentId);
  const workspacePath = path.join(agentBase, 'workspace');
  const agentDir = path.join(agentBase, 'agent');

  fs.mkdirSync(workspacePath, { recursive: true });
  fs.mkdirSync(agentDir, { recursive: true });

  const webhookToken = crypto.randomBytes(32).toString('hex');

  const vars: AgentTemplateVars = {
    agent_name: params.agentName,
    agent_id: openclawAgentId,
    user_name: params.userName,
    user_id: params.userId,
    plan: params.plan,
    webhook_url: LOCAL_WEBHOOK_URL,
    webhook_token: webhookToken,
    cli_bridge_url: LOCAL_CLI_BRIDGE_URL,
  };

  const renderedFiles = renderAgentWorkspace('developer', vars);

  for (const [relativePath, content] of renderedFiles) {
    const outputPath = path.join(workspacePath, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  runOpenclaw([
    'agents',
    'add',
    openclawAgentId,
    '--workspace',
    workspacePath,
    '--agent-dir',
    agentDir,
    '--model',
    model,
    '--non-interactive',
    '--json',
  ]);

  let telegramBotLink: string | undefined;
  if (params.telegramAccountId) {
    const telegramAccountId = normalizeTelegramAccountId(
      params.telegramAccountId
    );
    const bindOutput = runOpenclaw([
      'agents',
      'bind',
      '--agent',
      openclawAgentId,
      '--bind',
      `telegram:${telegramAccountId}`,
    ]);
    const linkMatch = bindOutput.match(/https:\/\/t\.me\/\S+/);
    if (linkMatch) {
      telegramBotLink = linkMatch[0];
    }
  }

  return {
    agentId,
    openclawAgentId,
    workspacePath,
    webhookToken,
    status: 'active',
    telegramBotLink,
  };
}

export async function sleepAgent(openclawAgentId: string): Promise<void> {
  runOpenclaw([
    'agents',
    'delete',
    normalizeOpenclawAgentId(openclawAgentId),
    '--force',
    '--json',
  ]);
}

export async function configureAgentChannel(
  openclawAgentId: string,
  telegramAccountId: string,
  botToken: string
): Promise<void> {
  const normalizedAgentId = normalizeOpenclawAgentId(openclawAgentId);
  const normalizedTelegramAccountId = normalizeTelegramAccountId(
    telegramAccountId
  );
  const normalizedBotToken = normalizeTelegramBotToken(botToken);

  try {
    runOpenclaw([
      'channels',
      'add',
      '--channel',
      'telegram',
      '--account',
      normalizedTelegramAccountId,
      '--token',
      normalizedBotToken,
    ]);

    runOpenclaw([
      'agents',
      'bind',
      '--agent',
      normalizedAgentId,
      '--bind',
      `telegram:${normalizedTelegramAccountId}`,
    ]);
  } catch {
    throw new Error('Failed to configure Telegram channel.');
  }
}

export async function wakeAgent(
  openclawAgentId: string,
  workspacePath: string,
  agentDir: string,
  model?: string,
  telegramAccountId?: string
): Promise<void> {
  const normalizedAgentId = normalizeOpenclawAgentId(openclawAgentId);
  const resolvedModel = model ?? DEFAULT_MODEL;

  runOpenclaw([
    'agents',
    'add',
    normalizedAgentId,
    '--workspace',
    workspacePath,
    '--agent-dir',
    agentDir,
    '--model',
    normalizeModel(resolvedModel),
    '--non-interactive',
    '--json',
  ]);

  if (telegramAccountId) {
    runOpenclaw([
      'agents',
      'bind',
      '--agent',
      normalizedAgentId,
      '--bind',
      `telegram:${normalizeTelegramAccountId(telegramAccountId)}`,
    ]);
  }
}

export async function terminateAgent(
  openclawAgentId: string,
  workspacePath?: string,
  cleanup?: boolean
): Promise<void> {
  const normalizedAgentId = normalizeOpenclawAgentId(openclawAgentId);

  try {
    runOpenclaw(['agents', 'delete', normalizedAgentId, '--force', '--json']);
  } catch {
    // Agent may already be deleted
  }

  if (cleanup && workspacePath) {
    const agentBase = resolveManagedAgentBase(workspacePath);
    fs.rmSync(agentBase, { recursive: true, force: true });
  }
}

export async function healthCheckAgent(
  openclawAgentId: string,
  workspacePath: string
): Promise<HealthStatus> {
  const normalizedAgentId = normalizeOpenclawAgentId(openclawAgentId);
  let openclawRegistered = false;
  try {
    const output = runOpenclaw(['agents', 'list', '--json']);
    const agents = parseOpenclawJson(output) as Array<{ id?: string }>;
    openclawRegistered = agents.some((a) => a.id === normalizedAgentId);
  } catch {
    openclawRegistered = false;
  }

  const workspaceExists = fs.existsSync(workspacePath);

  let status: HealthStatus['status'];
  if (openclawRegistered && workspaceExists) {
    status = 'healthy';
  } else if (openclawRegistered || workspaceExists) {
    status = 'degraded';
  } else {
    status = 'down';
  }

  return {
    agentId: normalizedAgentId,
    openclawRegistered,
    workspaceExists,
    status,
  };
}
