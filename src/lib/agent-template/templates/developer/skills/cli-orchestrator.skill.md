---
name: cli-orchestrator
description: "调用 Claude Code/Codex/Gemini CLI 完成编程任务。触发词：让CC、让codex、让gemini、code review、代码评审、恢复codex会话、resume codex、接入codex"
---

# CLI Orchestrator

调用 Claude Code / Codex / Gemini CLI 完成编程任务。你可以同时维护多个引擎的持久会话，并在不同 CLI 之间传递结果。

## 引擎选择（强制规则）

| 引擎 | 职责 | 何时使用 |
|------|------|---------|
| `codex` | **主力** — 编码 + Code Review | 所有编码和 review 任务的默认引擎 |
| `claude-code` | **后备** — codex 不可用时的替代 | 仅当 codex 调用失败时启用 |
| `gemini` | **分析 + 文档 + 图片生成** | 非编码类任务、图片生成 |

**选择逻辑**：
1. 用户明确指定引擎 → 用指定的
2. 编码任务（写代码、改代码、修 bug）→ **必须用 `codex`**
3. Code Review → **必须用 `codex`**（用另一个 session，不复用编码 session）
4. 生成图片 → 用 `gemini`
5. 分析、文档、翻译 → 用 `gemini`

**Fallback 规则（强制）**：
- `claude-code` 是所有任务的后备引擎
- 当 codex 或 gemini 调用失败（502、超时、卡死、沙箱错误等），**必须**切换到 `claude-code`，**禁止**跳过或自审
- 特别是 **review 失败时**：codex review 卡死/失败 → **必须** fallback 到 claude-code review，**绝对不能**自己审自己的代码
- 切换时在汇报中说明原因（如"codex review 超时，已 fallback claude-code review"）

## 标准开发流程（强制）

每个编码任务**必须**走以下两步，不可跳过：

```
Step 1: codex 编码 → Step 2: codex review（另一个 session）
```

1. **Step 1 — codex 编码**：派发给 codex，带 `openclaw_hook`
2. **Step 2 — codex review**：收到回调后，用**新的 session**派发给 codex 做 code review（不复用编码 session，确保独立视角）
3. **汇报**：review 完成后，综合两步结果汇报用户

如果 review 发现问题 → 再派一轮 codex 修复 → 再 review → 直到通过。

**唯一例外**：用户明确说"不用 review" 或 "直接提交"时，可以跳过 Step 2。

## 完成标准（强制）

**没有通过以下标准的任务，禁止标记为"完成"或"✅"。**

### 测试分级

| 级别 | 内容 | 何时必须 |
|------|------|---------|
| **L1** | `tsc` / `pnpm build` 编译通过 | **每次改动** |
| **L2** | curl 测试 — 包含**带认证的正向流程**（不只是 401） | **后端 API 改动** |
| **L3** | 浏览器验证（手动或 Playwright 截图） | **UI / 前端改动** |

### 具体要求

1. **L1 编译通过** ≠ 代码质量 OK。`tsc` 通过只是最低门槛，不能以此为完成依据
2. **L2 认证测试**：后端改动必须测试完整的正向流程（创建→读取→更新→删除），不能只测 401 无认证拒绝
3. **L3 浏览器验证**：有 UI 的改动必须在浏览器里实际操作一遍，确认渲染正确、交互正常
4. **Review 必须完成**：没有 review 结果（codex 或 claude-code）的代码，禁止标记为完成。Review 失败/超时必须 fallback，不能跳过

### 完成汇报格式

汇报时必须列出各级别测试的结果：
```
✅ L1: tsc 编译通过
✅ L2: 认证正向测试通过（POST /api/xxx 200, GET /api/xxx 200）
✅ L3: 浏览器验证 — Dashboard 页面正常渲染，按钮交互正常
✅ Review: codex review 通过（session: xxx-review）
```

缺少任何必须级别的测试结果 → 任务状态为"进行中"，不是"完成"。

## API 端点

| 实例 | 地址 | 引擎 | 默认引擎 |
|------|------|------|---------|
| **本地** | `http://127.0.0.1:9090` | claude-code, codex, gemini | claude-code |

通过 `engine` 字段选择引擎。

## 基本用法

### 发送任务

```bash
curl -sN http://127.0.0.1:9090/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "session_id": "my-project-feature",
    "message": "具体的任务描述",
    "working_directory": "/path/to/project",
    "telegram_chat_id": "6564284621"
  }' 2>&1 | grep "^data:" | tail -20
```

> **完成通知**：加上 `telegram_chat_id` 后，任务完成时 CLI Bridge 会自动发 Telegram 消息（包含 session_id、引擎、exit code、耗时、输出预览）。无需 polling 或 cron。

**关键参数**：
- `engine` — 引擎名（可选，默认看实例配置）
- `session_id` — 用描述性 ID 保持上下文（如 `"alan-refactor-auth"`）。同 ID = 同一会话
- `message` — 详细的任务描述，包含文件路径、预期行为、约束
- `working_directory` — 项目根目录（首次消息必填）
- `model` — 可选，覆盖引擎默认模型
- `resume_thread_id` — 可选，恢复一个已有的 Codex 会话（仅 codex 引擎）
- `telegram_chat_id` — 可选，任务完成后 CLI Bridge 直接发 Telegram 通知到该 chat ID（通知人类）
- `openclaw_hook` — 可选，任务完成后 CLI Bridge 回调 OpenClaw bot 的 hooks/agent 端点（bot 编排用）。格式：`{"url": "http://host:port", "token": "hook-token"}`

### 查看会话

```bash
# 列出所有会话
curl -s http://127.0.0.1:9090/api/sessions

# 查看特定会话详情
curl -s http://127.0.0.1:9090/api/sessions/<session_id>

# 获取上一次响应的完整文本（用于 relay 给其他引擎）
curl -s http://127.0.0.1:9090/api/sessions/<session_id>/output
```

### 终止卡住的进程

```bash
curl -X POST http://127.0.0.1:9090/api/sessions/<session_id>/kill
```

## 恢复已有 Codex 会话

如果用户提供了一个已有的 Codex thread ID（UUID 格式），可以通过 `resume_thread_id` 接入该会话：

```bash
curl -sN http://127.0.0.1:9090/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "session_id": "resume-existing",
    "resume_thread_id": "019cc1fe-0e8f-70b0-beca-db452cd5a07f",
    "message": "查看当前进度，汇报状态",
    "working_directory": "/Users/eyson/project"
  }' 2>&1 | grep "^data:" | tail -20
```

**触发词**：用户说 "恢复codex会话"、"resume codex"、"接入codex xxx"、"继续那个codex" + 给出 thread ID

**注意**：
- `resume_thread_id` 仅支持 codex 引擎
- 首次 resume 需要提供 `working_directory`（Codex 需要在正确目录下运行）
- resume 后自动进入多轮模式，后续用相同 `session_id` 继续对话即可
- 可以同时 resume 多个不同的 Codex 会话（用不同的 `session_id`）

## 多轮对话

所有引擎都支持多轮。用相同的 `session_id` 发消息，引擎会自动 resume 上下文：

```bash
# 第一轮：分析代码
curl -sN http://127.0.0.1:9090/api/chat -d '{"engine":"codex","session_id":"fix-auth","message":"分析 src/auth/ 的代码结构"}'

# 第二轮：基于分析结果修改（自动 resume）
curl -sN http://127.0.0.1:9090/api/chat -d '{"engine":"codex","session_id":"fix-auth","message":"把 JWT 验证改为 session-based"}'
```

## 跨引擎协作（Relay 模式）

核心能力：把一个引擎的输出作为另一个引擎的输入。

### 模式 1：Review 循环

让 Codex 写代码，然后用另一个 Codex session 评审：

```bash
# Step 1: Codex 写代码
curl -sN http://127.0.0.1:9090/api/chat \
  -d '{"engine":"codex","session_id":"write-component","message":"写一个 React 表单组件 src/Form.tsx"}'

# Step 2: 获取输出
CODEX_OUTPUT=$(curl -s http://127.0.0.1:9090/api/sessions/write-component/output | jq -r '.output')

# Step 3: 新 Codex session 评审
curl -sN http://127.0.0.1:9090/api/chat \
  -d "{\"engine\":\"codex\",\"session_id\":\"review-component\",\"message\":\"Review this code and suggest improvements:\\n\\n${CODEX_OUTPUT}\"}"
```

### 模式 2：并行分析

让多个引擎同时分析同一问题，对比结果：

```bash
# 并行发给两个引擎（不同 session_id）
curl -sN http://127.0.0.1:9090/api/chat -d '{"engine":"codex","session_id":"analyze-codex","message":"分析这个性能瓶颈..."}' &
curl -sN http://127.0.0.1:9090/api/chat -d '{"engine":"gemini","session_id":"analyze-gemini","message":"分析这个性能瓶颈..."}' &
wait

# 收集两份分析
CODEX_RESULT=$(curl -s http://127.0.0.1:9090/api/sessions/analyze-codex/output | jq -r '.output')
GEMINI_RESULT=$(curl -s http://127.0.0.1:9090/api/sessions/analyze-gemini/output | jq -r '.output')

# 让 Claude Code 综合判断
curl -sN http://127.0.0.1:9090/api/chat -d "{\"engine\":\"claude-code\",\"session_id\":\"final-analysis\",\"message\":\"Codex 说:\\n${CODEX_RESULT}\\n\\nGemini 说:\\n${GEMINI_RESULT}\\n\\n请综合两份分析给出最终方案\"}"
```

### 模式 3：接力实现

一个引擎设计，另一个实现：

```bash
# Gemini 做架构设计
curl -sN http://127.0.0.1:9090/api/chat -d '{"engine":"gemini","session_id":"design-api","message":"设计一个 REST API 的架构..."}'
DESIGN=$(curl -s http://127.0.0.1:9090/api/sessions/design-api/output | jq -r '.output')

# Codex 实现
curl -sN http://127.0.0.1:9090/api/chat -d "{\"engine\":\"codex\",\"session_id\":\"impl-api\",\"message\":\"按照这个设计实现 API:\\n${DESIGN}\"}"
```

## 完成通知

CLI Bridge 支持两种自动通知机制，可同时使用：

### 1. Bot 回调（编排用）— `openclaw_hook`

任务完成后 CLI Bridge 自动 POST 到 bot 的 `/hooks/agent` 端点，bot 被唤醒并收到结果作为聊天消息。适合 bot-to-bot 编排（如阿凛调起 Codex A，完成后自动 relay 结果到 Codex B）。

```bash
curl -sN http://127.0.0.1:9090/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "session_id": "alan-refactor",
    "message": "重构 auth 模块",
    "working_directory": "/path/to/project",
    "openclaw_hook": {
      "url": "http://host.docker.internal:18789",
      "token": "cli-bridge-hook-alin-2026"
    }
  }'
```

**各 bot 的 hook 配置**：

| Bot | Gateway Port | Hook URL | Token |
|-----|-------------|----------|-------|
| devhelper（你） | 18789 | `http://127.0.0.1:18789` | `92d55392196bef7874edf1945ac0ffd95c2fb125b9b5a1fc` |

> Gateway hooks 已启用，认证复用 `gateway.auth.token`。

**默认 hook 配置**：每次调 CLI Bridge 时，**必须**带上 `openclaw_hook`，这样任务完成后 CLI Bridge 会自动回调唤醒你：

```json
"openclaw_hook": {
  "url": "http://127.0.0.1:18789",
  "token": "92d55392196bef7874edf1945ac0ffd95c2fb125b9b5a1fc",
  "channel": "telegram"
}
```

### 2. Telegram 通知（通知人类）— `telegram_chat_id`

```json
"telegram_chat_id": "6564284621"
```

### 3. 手动查询（调试用）

```bash
curl -s http://127.0.0.1:9090/api/sessions/big-refactor | jq -r '.active'
curl -s http://127.0.0.1:9090/api/sessions/big-refactor/output | jq -r '.output'
```

## Conversation API（推荐用于多轮交互）

比 `/api/chat` 更适合多轮任务的 API。SSE 事件流跨多轮保持连接，CLI 退出后进入 `awaiting_reply` 状态等待下一步指令，无需轮询。

### 状态机

```
POST /api/conversations → [running] → (CLI退出) → [awaiting_reply]
                                                      ├─ POST /reply → [running] (新一轮)
                                                      ├─ DELETE → [closed]
                                                      └─ timeout → [closed]
```

### 创建会话

```bash
curl -s -X POST http://127.0.0.1:9090/api/conversations \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "message": "分析 src/auth/ 的代码结构",
    "working_directory": "/path/to/project",
    "bot_id": "alin",
    "timeout": 300000
  }'
```

**返回**：
```json
{
  "conversation_id": "uuid",
  "session_id": "uuid",
  "status": "running",
  "events_url": "/api/conversations/<id>/events",
  "turn": 1,
  "job_id": "uuid"
}
```

**参数**：
- `engine` — 引擎名（默认看实例配置）
- `message` — 任务描述
- `working_directory` — 项目根目录
- `bot_id` — 队列身份标识（默认 `"conversation"`）。**不同 `bot_id` 各有 4 个并发槽，互不阻塞**
- `session_id` — 可选，自定义 session ID
- `callback_config` — 可选，同 `/api/chat` 的回调配置
- `timeout` — 可选，`awaiting_reply` 超时毫秒数（默认 600000 = 10分钟）

### 监听 SSE 事件流

```bash
curl -N http://127.0.0.1:9090/api/conversations/<id>/events
```

**事件类型**：
- `turn_started` — 新一轮开始 `{"turn":1,"job_id":"..."}`
- `output` — CLI 输出文本 `{"text":"...","turn":1}`
- `turn_complete` — 一轮结束 `{"turn":1,"exit_code":0,"output_preview":"...","status":"awaiting_reply"}`
- `closed` — 会话关闭 `{"reason":"timeout|explicit","turns_completed":2}`

**断线重连**：支持 `Last-Event-ID` header，服务端缓存最近 100 条事件。

### 发送后续消息

```bash
# 仅在 status="awaiting_reply" 时有效，否则返回 409
curl -s -X POST http://127.0.0.1:9090/api/conversations/<id>/reply \
  -H 'Content-Type: application/json' \
  -d '{"message": "把 JWT 验证改为 session-based"}'
```

### 关闭会话

```bash
curl -s -X DELETE http://127.0.0.1:9090/api/conversations/<id>
```

### 查看会话

```bash
# 列出所有
curl -s http://127.0.0.1:9090/api/conversations

# 按状态过滤
curl -s http://127.0.0.1:9090/api/conversations?status=awaiting_reply

# 单个详情
curl -s http://127.0.0.1:9090/api/conversations/<id>
```

### 典型使用流程

```bash
# 1. 创建会话
CONV=$(curl -s -X POST http://127.0.0.1:9090/api/conversations \
  -H 'Content-Type: application/json' \
  -d '{"engine":"codex","message":"分析代码结构","working_directory":"/path","bot_id":"local-cc"}')
CID=$(echo $CONV | jq -r .conversation_id)

# 2. 另一个终端监听事件（或用 Last-Event-ID 重连）
curl -N http://127.0.0.1:9090/api/conversations/$CID/events

# 3. 等 turn_complete 事件后发送后续指令
curl -s -X POST http://127.0.0.1:9090/api/conversations/$CID/reply \
  -H 'Content-Type: application/json' -d '{"message":"基于分析结果重构 auth 模块"}'

# 4. 完成后关闭
curl -s -X DELETE http://127.0.0.1:9090/api/conversations/$CID
```

### 与 `/api/chat` 的区别

| 特性 | `/api/chat` | `/api/conversations` |
|------|-------------|---------------------|
| 多轮交互 | 手动轮询 session 状态 | SSE 推送 + reply 端点 |
| 连接保持 | 每轮一个 SSE 连接 | 跨多轮保持 |
| 超时管理 | 无 | 内置 awaiting_reply 超时 |
| 状态机 | 无 | running → awaiting_reply → closed |
| 并发控制 | per-bot 共享 | per-bot_id 独立 |
| 向后兼容 | 原有 API | 纯增量，不影响 `/api/chat` |

## 故障处理

| 情况 | 处理 |
|------|------|
| 进程卡住（>5分钟无输出） | `POST /api/sessions/:id/kill`，然后重发任务 |
| 进程崩溃 | 自动重试最多 2 次，无需干预 |
| 连接断开 | 进程不会被杀，完成后可通过 `/output` 获取结果 |
| 引擎不可用 | 检查 `/health` 和 `/engines` 确认可用引擎 |

## 注意事项

1. **session_id 绑定引擎** — 一个 session 只能用一个引擎，切换引擎需要新 session_id
2. **一次一条消息** — 同一 session 不能并发，等上一条完成再发
3. **工作目录** — 首次消息必须指定 `working_directory`，后续可省略
4. **超时** — Claude Code 可能需要 30-120 秒，Codex 通常更快
5. **跨引擎 relay** — 用 `/api/sessions/:id/output` 获取文本，不要自己拼凑 SSE 流
6. **多轮任务优先用 Conversation API** — `/api/conversations` 比 `/api/chat` 更适合需要多轮交互的任务，自动管理状态和超时
7. **bot_id 隔离并发** — 不同 `bot_id` 各有 4 个并发槽（全局上限 16），建议每个调用者用自己的 `bot_id`

## 链式执行（回调自动驱动）

当你调 CLI Bridge 时带了 `openclaw_hook`，任务完成后 CLI Bridge 会自动回调唤醒你。你会收到一条包含任务结果的消息，格式如下：

```
✅/❌ CLI Bridge 任务完成
Job: ...
Engine: ...
Exit: 0/1
--- 摘要 ---
...
--- 你的下一步 ---
...
```

### 收到回调后的处理流程

1. **解析结果**：从回调消息中提取 `Exit code`、摘要、工作目录、conversation_id
2. **判断是否需要下一步**：
   - 回忆用户的原始指令，判断当前步骤是否满足了全部需求
   - 如果用户的指令包含多步（如"写代码然后 review"），当前步骤完成后自动派发下一步
   - 如果只有单步任务，直接汇报结果
3. **自动派发下一步**（如需要）：
   - 根据下一步的性质选择合适的引擎（代码用 claude-code/codex，分析用 gemini）
   - 将上一步的产出作为上下文传给下一步
   - **必须带上 `openclaw_hook`**，形成链条
4. **停止链条并汇报**：
   - 所有步骤完成后，向用户汇报最终结果
   - 如果某步失败且无法自动修复，停止链条并汇报失败原因
   - 如果不确定下一步该做什么，停止链条并询问用户

### 链式执行示例

用户说："在 ~/myproject 写一个 TODO API"

即使用户没提 review，你也**必须**自动走 codex 编码 → claude-code review 两步。

**第一步**：codex 编码
```bash
curl -sN http://127.0.0.1:9090/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "session_id": "todo-api-impl",
    "message": "在当前项目创建一个 TODO REST API...",
    "working_directory": "/Users/eyson/myproject",
    "openclaw_hook": {
      "url": "http://127.0.0.1:18789",
      "token": "92d55392196bef7874edf1945ac0ffd95c2fb125b9b5a1fc",
      "channel": "telegram"
    }
  }'
```

**第二步**：收到回调后 → codex review（新 session，自动触发，不需要用户要求）
```bash
curl -sN http://127.0.0.1:9090/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "engine": "codex",
    "session_id": "todo-api-review",
    "message": "Review /Users/eyson/myproject 中刚写的代码。检查：1) 安全性 2) 代码质量 3) 最佳实践 4) 是否有遗漏。如有问题请直接修复。",
    "working_directory": "/Users/eyson/myproject",
    "openclaw_hook": {
      "url": "http://127.0.0.1:18789",
      "token": "92d55392196bef7874edf1945ac0ffd95c2fb125b9b5a1fc",
      "channel": "telegram"
    }
  }'
```

**第三步**：收到第二次回调 → 汇报用户（编码 + review 结果）。

### 关键原则

- **每次调 CLI Bridge 都带 `openclaw_hook`**，否则链条断裂
- **Exit 0 不代表成功**，要看摘要内容判断实际结果
- **失败时先尝试一次自动修复**（通过 conversation reply），修复失败再汇报用户
- **最多 3 步链式**，超过 3 步停下来汇报中间结果，避免失控
