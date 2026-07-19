# InteractiveNovel

> An AI-powered interactive novel web app — read and write at the same time, everyone is a novelist.

English | [中文](#中文文档)

InteractiveNovel is an open-source web application that lets you co-create stories with large language models. Set a theme and style, then drive the plot chapter by chapter through branching choices. It also supports publishing finished works to a public "Novel Square", AI-generated anime-style covers, and a fully bilingual (English / Chinese) interface.

## ✨ Features

- **Chapter-by-chapter co-creation** — Configure theme, style, expected chapter count, and words per chapter, then steer the story via 3 plot choices after each chapter (or write your own custom direction).
- **Rich creation options** — Multiple genres (Fantasy, Suspense, Romance, Sci-Fi, etc.), narrative perspectives (first person / third-person limited / omniscient), and selectable LLMs (Qwen Plus/Max/Turbo, DeepSeek V3/R1).
- **Auto character & world building** — If you don't provide character/world settings, chapter 1 auto-generates them to keep the story consistent.
- **Smart ending flow** — Manually end early, or let the story auto-wrap-up as it approaches the expected chapter count.
- **Novel Square** — Publish completed novels for everyone to read, with AI-generated anime-style covers (via DashScope image models).
- **Bilingual UI** — One-tap switch between English and Chinese; defaults to Chinese.
- **Reading experience** — Font-size adjustment, day/night themes, flip/scroll paging, and automatic reading-position persistence.
- **Web-based API Key configuration** — Configure your LLM API Key directly from the in-app Settings page; no manual file editing required.

## 🛠 Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Vue 3 (Composition API), Vite, Pinia, Vue Router, Tailwind CSS |
| Backend | Node.js, Express |
| LLM | Alibaba Cloud DashScope (Qwen) OpenAI-compatible mode; DeepSeek |
| Image | DashScope Wan text-to-image models |

## 📦 Prerequisites

- Node.js >= 18
- An LLM API Key (Alibaba Cloud DashScope recommended). Get one at:
  https://bailian.console.aliyun.com/cn-beijing?tab=model#/api-key

## 🚀 Getting Started

### 1. Clone & install dependencies

```bash
git clone https://github.com/<your-name>/InteractiveNovel.git
cd InteractiveNovel

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Configure the API Key

You have two options:

**Option A — Web UI (recommended)**

Start the app first (see step 3), then open the **Settings** page (gear icon at the top-right of the "Mine" page) and paste your API Key. It is saved to `.env` automatically and takes effect immediately.

**Option B — Manual**

```bash
cp .env.example .env
# Edit .env and fill in your QWEN_API_KEY
```

### 3. Run in development

```bash
# Terminal 1 — backend (port 3000)
cd server && node index.js

# Terminal 2 — frontend dev server (port 5274)
npm run dev
```

Open http://localhost:5274 in your browser.

### 4. Build for production

```bash
npm run build          # outputs to dist/
cd server && node index.js   # server also serves the built dist/
```

In production the Express server hosts both the API and the static frontend, so a single `http://localhost:3000` is enough.

## ⚙️ Configuration

All server configuration lives in the root `.env` file (never committed):

| Variable | Required | Description |
| --- | --- | --- |
| `QWEN_API_KEY` | Yes | Your LLM API Key |
| `QWEN_ENDPOINT` | No | OpenAI-compatible chat endpoint. Defaults to DashScope |
| `IMAGE_MODEL` | No | Text-to-image model for covers |
| `PORT` | No | Server port (default `3000`) |

## 🔐 Security Notes

- **Never commit your `.env`** — it contains your real API Key and is already listed in `.gitignore`.
- The frontend only ever displays a masked key (e.g. `sk-5****a731`); the full key stays server-side.
- Deployment scripts, server logs, and user-generated data are excluded from version control via `.gitignore`.

## 📄 License

Released under the MIT License. See [LICENSE](LICENSE) for details.

---

<a name="中文文档"></a>

# InteractiveNovel（中文文档）

> 一款由 AI 驱动的互动小说 Web 应用 —— 边读边写，人人都是小说家。

[English](#interactivenovel) | 中文

InteractiveNovel 是一个开源 Web 应用，让你与大语言模型共同创作故事。设定主题与风格后，通过分支选项逐章推进剧情。同时支持将完结作品发表到公共「小说广场」、AI 生成日系动漫风格封面，以及完整的中英文双语界面。

## ✨ 功能特性

- **逐章共创** —— 配置主题、风格、预计章节数与每章字数，每章结束后通过 3 个剧情选项推进故事（也可自定义剧情走向）。
- **丰富的创作选项** —— 多种体裁（玄幻、悬疑、言情、科幻等）、叙事视角（第一人称 / 第三人称限知 / 全知）、可选大模型（Qwen Plus/Max/Turbo、DeepSeek V3/R1）。
- **角色与世界观自动生成** —— 未填写角色/世界观时，第一章会自动生成，保证故事连贯。
- **智能完结流程** —— 可手动提前结束，也可在接近预计章节数时自动收尾。
- **小说广场** —— 将完结小说发表供所有人阅读，并由 AI 生成日系动漫风格封面（基于 DashScope 图像模型）。
- **双语界面** —— 一键切换中英文，默认中文。
- **阅读体验** —— 字号调节、白天/夜间主题、翻页/滚动模式，以及自动保存阅读位置。
- **网页端配置 API Key** —— 直接在应用内「设置」页面配置大模型 API Key，无需手动改文件。

## 🛠 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3（组合式 API）、Vite、Pinia、Vue Router、Tailwind CSS |
| 后端 | Node.js、Express |
| 大模型 | 阿里云 DashScope（通义千问）OpenAI 兼容模式；DeepSeek |
| 图像 | DashScope 通义万相文生图模型 |

## 📦 环境要求

- Node.js >= 18
- 大模型 API Key（推荐阿里云 DashScope）。获取地址：
  https://bailian.console.aliyun.com/cn-beijing?tab=model#/api-key

## 🚀 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/<your-name>/InteractiveNovel.git
cd InteractiveNovel

# 前端依赖
npm install

# 后端依赖
cd server && npm install && cd ..
```

### 2. 配置 API Key

两种方式任选其一：

**方式 A —— 网页配置（推荐）**

先启动应用（见第 3 步），打开「设置」页面（「我的」页面右上角齿轮图标），粘贴你的 API Key。系统会自动写入 `.env` 并立即生效。

**方式 B —— 手动配置**

```bash
cp .env.example .env
# 编辑 .env，填入你的 QWEN_API_KEY
```

### 3. 开发模式运行

```bash
# 终端 1 —— 后端（端口 3000）
cd server && node index.js

# 终端 2 —— 前端开发服务器（端口 5274）
npm run dev
```

浏览器打开 http://localhost:5274 。

### 4. 生产构建

```bash
npm run build          # 输出到 dist/
cd server && node index.js   # 后端同时托管构建后的 dist/
```

生产环境下 Express 服务同时提供 API 与静态前端，只需访问 `http://localhost:3000` 即可。

## ⚙️ 配置说明

所有服务端配置位于根目录 `.env` 文件（不会被提交）：

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `QWEN_API_KEY` | 是 | 你的大模型 API Key |
| `QWEN_ENDPOINT` | 否 | OpenAI 兼容对话端点，默认 DashScope |
| `IMAGE_MODEL` | 否 | 封面文生图模型 |
| `PORT` | 否 | 服务端口（默认 `3000`） |

## 🔐 安全须知

- **切勿提交 `.env`** —— 其中包含你的真实 API Key，已在 `.gitignore` 中排除。
- 前端仅显示掩码后的 Key（如 `sk-5****a731`），完整 Key 始终保留在服务端。
- 部署脚本、服务器日志、用户生成数据均已通过 `.gitignore` 排除，不纳入版本控制。

## 📄 许可证

基于 MIT 许可证发布，详见 [LICENSE](LICENSE)。
