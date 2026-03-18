import fs from 'node:fs';
import path from 'node:path';
import type { AgentTemplateVars } from './types';

const TEMPLATES_DIR = path.join(
  process.cwd(),
  'src/lib/agent-template/templates'
);

export function renderTemplate(
  content: string,
  vars: AgentTemplateVars
): string {
  return content.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => {
    const value = vars[key as keyof AgentTemplateVars];
    return typeof value === 'string' ? value : match;
  });
}

export function readTemplate(templateName: string, fileName: string): string {
  const filePath = path.join(TEMPLATES_DIR, templateName, fileName);
  return fs.readFileSync(filePath, 'utf-8');
}

export function renderAgentWorkspace(
  templateName: string,
  vars: AgentTemplateVars
): Map<string, string> {
  const templateDir = path.join(TEMPLATES_DIR, templateName);
  const result = new Map<string, string>();
  const renderableExtensions = new Set(['.md', '.txt', '.yaml']);

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(templateDir, fullPath);
        const ext = path.extname(entry.name);
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (renderableExtensions.has(ext)) {
          result.set(relativePath, renderTemplate(content, vars));
        } else {
          result.set(relativePath, content);
        }
      }
    }
  }

  walk(templateDir);
  return result;
}
