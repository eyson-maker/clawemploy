---
name: web-scrape
description: "网页抓取工具 - 读取任意网页内容。当用户发送链接、要求读网页、或提到微信/小红书/知乎文章时自动触发。触发词：读网页、抓取、scrape、打开链接、读一下这个链接、帮我看看这个网页、fetch this page、看下这篇文章、读取网页内容、微信文章、微信公众号、小红书、知乎、weixin、mp.weixin.qq.com、xiaohongshu、xhslink、zhihu、bilibili、读一下、帮我看看、看看这个、这篇文章。URL域名匹配：mp.weixin.qq.com、weixin.qq.com、xhslink.com、xiaohongshu.com、zhihu.com、zhuanlan.zhihu.com、bilibili.com、b23.tv、juejin.cn、36kr.com、sspai.com、toutiao.com"
---

# Web Scrape - 网页抓取

通过 scrapling 引擎抓取任意网页内容，返回 markdown/text/html 格式。

## ⚠️ 重要：何时使用此 skill

**必须使用此 skill 而非内置 web_fetch 的场景：**

1. **微信公众号文章** (`mp.weixin.qq.com`) — 内置 web_fetch/Readability 无法获取内容，此 skill 可以
2. **小红书** (`xiaohongshu.com`, `xhslink.com`) — 有反爬保护
3. **知乎专栏/回答** (`zhihu.com`, `zhuanlan.zhihu.com`) — 需要完整渲染
4. **B站专栏** (`bilibili.com`) — 动态加载内容
5. **任何用户提到"读不到"、"打不开"、"看不了"的网页** — 说明内置工具失败了

**URL 自动检测规则：**
如果用户发送的消息中包含以下域名的链接，直接使用此 skill，不要先尝试 web_fetch：
- `mp.weixin.qq.com` / `weixin.qq.com`
- `xhslink.com` / `xiaohongshu.com`
- `zhihu.com` / `zhuanlan.zhihu.com`
- `bilibili.com` / `b23.tv`
- `juejin.cn` / `36kr.com` / `sspai.com`

**用户意图检测：**
当用户说以下话时，使用此 skill：
- "帮我读一下这个微信文章"
- "看看这个链接"
- "这篇文章说了什么"
- "帮我抓取这个网页"
- 发送了任何 URL 并期望你阅读内容

## 使用方式

```bash
# 基础抓取（默认 markdown 格式，推荐）
bash {baseDir}/scripts/scrape.sh "URL"

# 纯文本格式（更简洁）
bash {baseDir}/scripts/scrape.sh "URL" text

# JS 渲染模式（SPA 页面、内容需要 JS 加载时）
bash {baseDir}/scripts/scrape.sh "URL" markdown fetch

# 反爬模式（被 Cloudflare 等拦截时使用）
bash {baseDir}/scripts/scrape.sh "URL" markdown stealthy
```

## 参数

| 参数 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| URL | $1 | 必填 | 目标网页地址 |
| format | $2 | markdown | 输出格式：markdown/text/html |
| mode | $3 | get | 抓取模式：get(快速)/fetch(JS渲染)/stealthy(反爬) |
| css | $4 | 无 | CSS 选择器，提取页面特定部分 |

## 模式选择

- **get**（默认）：最快，适合大多数页面（包括微信公众号）
- **fetch**：浏览器渲染，适合 SPA / JS 动态加载页面
- **stealthy**：反爬绕过，仅在 get/fetch 被拦截时使用
