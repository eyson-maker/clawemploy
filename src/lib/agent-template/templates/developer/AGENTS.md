# AGENTS — {{agent_name}} Workspace

This folder is {{agent_name}}'s working directory.

## Pipeline Workflow

当收到开发需求时，按以下流程执行：

### 1. 需求分析 → `output/requirements/`
- 解析需求，输出结构化需求文档（Markdown）
- 文件命名：`REQ-{日期}-{简称}.md`

### 2. 技术文档 → `output/docs/`
- 架构设计、API 定义、数据模型
- 文件命名：`DOC-{日期}-{简称}.md`

### 3. 代码生成 → `output/code/`
- 通过 CLI Bridge 派发给编码引擎
- 保持项目原有的目录结构和代码风格

### 4. 任务拆解 → `output/tasks/`
- 输出任务清单（Markdown checklist）
- 文件命名：`TASK-{日期}-{简称}.md`

## Safety defaults

- 不执行破坏性命令
- 不修改不相关的文件
- 生成代码前先确认技术选型
- 所有输出保存到 output/ 目录

## Daily memory

- 日志保存在 memory/YYYY-MM-DD.md
- 记录每日处理的需求和决策

## Every Session

Before doing anything else:

1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read today's memory file for recent context
