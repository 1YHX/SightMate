# SightMate

SightMate 是一个 Web 端 AI 视觉对话助手。用户点击一次“开始通话”后，系统会同时开启摄像头和麦克风，通过后端 WebSocket 代理把麦克风 PCM 流和低帧率压缩画面发送给阿里云 Qwen-Omni-Realtime，由模型流式生成文字与语音回答。

SightMate 的实时模式不直接上传原始连续视频流，而是发送约 1fps 的压缩 JPEG 画面；实时模型不可用时保留按需锁帧视觉问答回退。

## 演示视频

[Bilibili 演示视频](https://www.bilibili.com/video/BV1jPJP6REoY/?vd_source=7647988dfa6fcd4a1c6f6042248bd18f)

## 项目需求

开发一款 AI 视觉对话助手：打开摄像头与麦克风后，让 AI 能够看到摄像头中的视频内容、听到用户说的话，并给予恰当回应。实现时需要综合考虑视觉内容理解准确性、语音交互自然度与流畅性，以及端云协同下的运营成本控制策略。

项目同时提交设计文档：[docs/DESIGN.md](docs/DESIGN.md)。设计文档包含计划实现和最终实现的用户故事，以及计划考虑和实际采用的成本控制技巧。

## 功能列表

- 摄像头实时预览。
- 实时麦克风音频流输入。
- 视频对话模式：一个按钮同时开启摄像头、麦克风和实时模型连接。
- 实时视频帧压缩为 JPEG base64，最长边约 480px；回退截图最长边不超过 1024px。
- 前端通过 WebSocket 发送麦克风 PCM 流和低帧率摄像头帧，回退模式发送语音文本、锁定截图和最近上下文。
- 后端通过阿里云百炼 OpenAI 兼容接口调用千问视觉模型。
- 后端通过 Qwen-Omni-Realtime WebSocket 代理支持实时音视频对话。
- 前端展示 AI 回答。
- 阿里云 Qwen-TTS 专业语音播报 AI 回答，失败时回退浏览器播报。
- 支持停止播报和重新播放。
- 使用 SQLite 保存全部历史对话会话，每个会话包含多轮问答。
- 实时模式通过后端 Qwen-Omni-Realtime WebSocket 代理发送麦克风 PCM 流和 1fps 视频帧。
- 请求模型时只传最近 3 轮上下文。
- 支持删除单个会话和清空历史记录。
- 提供 loading、错误提示和隐私提示。

## 技术栈

- 前端：Vue 3、Vite、TypeScript
- 后端：FastAPI、Python
- 模型服务：阿里云百炼视觉理解模型，默认 `qwen3.7-plus`
- 语音能力：Qwen-Omni-Realtime 流式语音、阿里云 Qwen-TTS、浏览器 Web Speech API、`speechSynthesis` 回退
- 历史存储：SQLite

## 启动方式

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

编辑 `backend/.env`，填入阿里云百炼 API Key：

```env
ALIYUN_API_KEY=your_api_key_here
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_VISION_MODEL=qwen3.7-plus
ALIYUN_TTS_BASE_URL=https://dashscope.aliyuncs.com/api/v1
ALIYUN_TTS_MODEL=qwen3-tts-flash
ALIYUN_TTS_VOICE=Cherry
ALIYUN_REALTIME_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
ALIYUN_REALTIME_MODEL=qwen3.5-omni-plus-realtime
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DATABASE_PATH=data/sightmate.sqlite3
```

启动后端：

```bash
uvicorn app.main:app --reload
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认前端会请求：

```text
http://127.0.0.1:8000
```

如需修改后端地址，可以设置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## 环境变量配置

真实 API Key 未提交到 GitHub，仅保存在本地 `backend/.env`；仓库中保留 `.env.example` 作为配置示例。

| 变量 | 说明 |
| --- | --- |
| `ALIYUN_API_KEY` | 阿里云百炼 API Key |
| `ALIYUN_BASE_URL` | 阿里云百炼 OpenAI 兼容接口地址 |
| `ALIYUN_VISION_MODEL` | 视觉模型名称，默认 `qwen3.7-plus` |
| `ALIYUN_TTS_BASE_URL` | 阿里云百炼 DashScope API 地址 |
| `ALIYUN_TTS_MODEL` | 语音合成模型名称，默认 `qwen3-tts-flash` |
| `ALIYUN_TTS_VOICE` | 语音合成音色，默认 `Cherry` |
| `ALIYUN_REALTIME_WS_URL` | 阿里云百炼实时模型 WebSocket 地址 |
| `ALIYUN_REALTIME_MODEL` | 实时多模态模型名称 |
| `BACKEND_HOST` | 后端监听地址 |
| `BACKEND_PORT` | 后端监听端口 |
| `DATABASE_PATH` | SQLite 数据库文件路径，默认 `data/sightmate.sqlite3` |

## 第三方依赖

### 前端

- `vue`
- `vite`
- `typescript`
- `@vitejs/plugin-vue`
- `vue-tsc`

### 后端

- `fastapi`
- `uvicorn[standard]`
- `pydantic-settings`
- `python-dotenv`
- `httpx`
- `websockets`

## 阿里云模型说明

后端通过阿里云百炼 OpenAI 兼容接口调用视觉模型：

```text
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

多模态请求中，图片通过 `image_url.url` 传入 Base64 Data URL。语音合成通过后端 `/api/speech/synthesize` 调用阿里云 Qwen-TTS。前端不会直接请求阿里云 API，也不会暴露 `ALIYUN_API_KEY`。

实时音视频模式通过后端代理连接 Qwen-Omni-Realtime：

```text
WS /api/realtime/ws
```

浏览器通过该代理发送麦克风 PCM 流和低帧率摄像头画面，不会直接暴露阿里云 API Key。

## 隐私说明

SightMate 默认优先使用实时模式：麦克风音频持续发送给实时模型，摄像头画面按低帧率抽帧发送。为了控制成本和保护隐私，视频不是原始连续视频流，而是约 1fps 的压缩 JPEG 帧。实时模式不可用时，系统保留按需锁帧视觉问答回退能力。

历史记录以“对话会话”的形式完整保存在后端 SQLite 中，每个会话包含多轮问答，不上传到云数据库。SQLite 文件默认位于 `backend/data/sightmate.sqlite3`，不会提交到 GitHub。删除单个会话或点击清空历史会删除本地 SQLite 中的对应记录。

## 成本控制说明

- 实时模式不上传原始高帧率视频流，只发送约 1fps 的压缩 JPEG 帧。
- 回退模式在用户开始说话时锁定当前帧，截图最长边限制为 1024px，JPEG 质量约 0.8。
- 实时模式使用模型流式语音；回退模式语音识别使用浏览器能力，语音播报优先使用阿里云 Qwen-TTS，失败时回退浏览器能力。
- 历史记录保存在 SQLite，不引入云数据库。
- 请求模型时只带最近 3 轮上下文。
- loading 期间禁用发送按钮，避免重复调用模型。

## 当前状态

SightMate 已实现可运行的本地视频对话流程：

- 一个按钮开启摄像头、麦克风和实时模型连接。
- 实时模式持续发送麦克风 PCM 音频和约 1fps 压缩画面，并播放模型返回的流式语音。
- 回退模式会在用户说话时自动锁定当前画面，避免说完后画面变化导致视觉上下文不一致。
- 后端调用阿里云百炼视觉模型或 Qwen-Omni-Realtime 生成回答。
- 回答优先使用阿里云 Qwen-TTS 播报。
- 多轮对话按会话保存在 SQLite。
- 左侧可查看、新建、删除和清空历史会话。
