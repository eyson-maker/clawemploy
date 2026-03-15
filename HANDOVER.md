# ClawEmploy 项目交接文档

> 交接人：Eyson（通过 Claude Code）→ DevForge（小吕）
> 日期：2026-03-13

---

## 一、项目概况

**ClawEmploy** 是一个 AI Agent 即服务（AaaS）的落地页 + SaaS 平台，目标用户是独立开发者和超级个体。核心理念：**"雇佣 AI 专家，而非员工"**。

用户可以浏览、选择、部署预配置的 AI Agent（调研、SEO、测试、运维、内容、项目管理），按需付费，无需自己搭建。底层基于开源的 OpenClaw 框架。

---

## 二、技术架构

### 基础模板
- 基于 **MkSaaS** 模板（Next.js 全栈 SaaS 启动器）
- 模板源码压缩包：`/Users/eyson/.openclaw/workspace-devhelper/Documents/mksaas_template-main.zip`

### 核心技术栈
| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 语言 | TypeScript |
| UI | TailwindCSS + Radix UI + shadcn/ui |
| 动画 | Framer Motion (tailark 封装) |
| 国际化 | next-intl (en/zh 双语) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | Better Auth (Google/GitHub OAuth) |
| 支付 | Stripe (订阅 + 一次性 + 积分) |
| 内容 | MDX + Fumadocs |
| 包管理 | pnpm |
| 代码规范 | Biome |

### 代码位置
- **Eyson 本机主仓库**：`/Users/eyson/Documents/mksaas_clawemploy/`
- **DevForge workspace 副本**：`/Users/eyson/.openclaw/workspace-devhelper/Documents/mksaas_clawemploy/`
- 翻译文件：`messages/en.json` + `messages/zh.json`
- 组件目录：`src/components/blocks/`

### 常用命令
```bash
pnpm dev -p 3001    # 启动开发服务器（3000 端口通常被占用，用 3001）
pnpm build          # 构建
pnpm lint           # Biome 检查
pnpm format         # Biome 格式化
pnpm db:generate    # 生成 Drizzle 迁移
pnpm db:migrate     # 执行迁移
pnpm db:studio      # 数据库可视化
```

---

## 三、已完成的工作

### 阶段 1：初始搭建（已完成）
- 从 MkSaaS 模板 fork
- 品牌配置（ClawEmploy 名称、Logo、配色）
- 全部文案替换（en/zh 双语）
- 6 个 Agent 定义（调研、SEO、测试、DevOps、内容、PM）
- 博客系统搭建
- Waitlist 页面
- FAQ、Testimonials、Stats 等区块

### 阶段 2：视觉重构 — Gumloop 风格（已完成）
参考网站：**https://www.gumloop.com/**

Gumloop 的核心设计特征：
- Hero 纯文字 + 渐变光晕背景，无产品截图
- Agent/功能卡片有标签、hover 效果、更丰富视觉层次
- 大量渐变背景分隔区块
- 左对齐大标题更有冲击力
- Features 无图片，简洁网格

**修改的 7 个文件：**

1. **`src/components/blocks/hero/hero.tsx`**
   - 删除产品截图 / Ripple / Image import
   - 紫色 indigo/violet 渐变光晕背景（radial-gradient）
   - 标题 xl:text-7xl + leading-tight
   - padding pt-24 pb-32
   - CTA 按钮保持 indigo-600 风格

2. **`src/components/blocks/agents/agent-grid.tsx`**
   - 删除 HeaderSection，改为左对齐标题（font-mono uppercase tracking-wider）
   - 独立圆角卡片 rounded-xl border bg-card/30
   - hover:border-primary/40 hover:bg-card/80 transition
   - 图标 size-10 + 彩色背景圆圈
   - 每个 agent 顶部显示 tag badge（如 "Research"/"调研"）
   - grid gap-4，3 列布局

3. **`src/components/blocks/features/features.tsx`**
   - 删除 Accordion + Image 切换（去掉截图依赖）
   - 2x2 网格卡片：Zap, DollarSign, Globe, Code 图标
   - 背景 bg-gradient-to-b from-muted/30 to-background

4. **`src/components/blocks/logo-cloud/logo-cloud.tsx`**
   - Logo opacity-50 hover:opacity-100 transition
   - 标题 text-sm
   - 背景改为透明

5. **`src/components/blocks/calltoaction/calltoaction.tsx`**
   - 背景 bg-gradient-to-br from-indigo-950/40 via-background to-violet-950/30
   - 按钮 href → /waitlist
   - 标题 md:text-5xl

6. **`src/components/blocks/how-it-works/how-it-works.tsx`**
   - 背景 bg-muted/20
   - 步骤间 ChevronRight 箭头连接（md 以上显示）

7. **`messages/en.json` + `messages/zh.json`**
   - 每个 agent item 增加 `tag` 字段
   - EN: Research, SEO, QA, DevOps, Content, Management
   - ZH: 调研, SEO, 测试, 运维, 内容, 管理

---

## 四、首页区块顺序（当前）

1. Hero（纯文字 + 渐变背景）
2. Logo Cloud（Telegram/Discord/Slack/GitHub/X/OpenAI）
3. Agent Grid（6 个 Agent 卡片）
4. Features（4 个优势卡片）
5. How It Works（3 步流程）
6. Stats
7. Testimonials
8. FAQ
9. Call to Action
10. Newsletter

---

## 五、设计规范

### 配色（暗色主题为主）
- 主色调：Indigo/Violet 渐变系
- 按钮：bg-indigo-600 hover:bg-indigo-500
- 卡片：bg-card/30，hover 时 bg-card/60 或 bg-card/80
- 边框：border-border/50，hover 时 border-primary/40
- 文字：text-foreground / text-muted-foreground

### 卡片风格
- 圆角：rounded-xl
- 内边距：p-6 ~ p-8
- hover transition-all duration-300

### 标题风格（Gumloop 左对齐风格）
```
<span> — font-mono text-sm uppercase tracking-wider text-primary（小标题/标签）
<h2> — text-3xl md:text-4xl font-bold tracking-tight（主标题）
<p> — text-lg text-muted-foreground（描述）
```

### 图标
- 使用 lucide-react
- 带彩色背景圆圈：`bg-{color}-400/10 text-{color}-400`
- 尺寸：size-10 ~ size-12 容器，size-5 ~ size-6 图标

---

## 六、待开发事项（后续由你接手）

以下是可能的后续任务方向（具体 PRD 由 Eyson 确定后会同步给你）：

- [ ] 响应式细节优化（移动端适配）
- [ ] 暗色/亮色主题切换验证
- [ ] Agent 详情页（每个 Agent 的独立落地页）
- [ ] Waitlist 表单对接后端
- [ ] 定价页面具体方案填充
- [ ] 博客内容填充
- [ ] SEO meta 优化
- [ ] 部署到 Vercel

---

## 七、注意事项

1. **端口**：dev server 用 `pnpm dev -p 3001`，3000 通常被其他应用占用
2. **双语**：所有用户可见文案必须同时更新 `messages/en.json` 和 `messages/zh.json`
3. **不要引用截图**：Features 等区块已去掉对 `/blocks/*.png` 的依赖，保持无图片设计
4. **风格参考**：有疑问时参考 https://www.gumloop.com/ 的设计语言
5. **代码规范**：提交前跑 `pnpm lint`，遵循 Biome 规则
6. **CLAUDE.md**：项目根目录有完整的开发指南，务必阅读

---

*本文档由 Claude Code 自动生成，如有疑问请联系 Eyson。*
