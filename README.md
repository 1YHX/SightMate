# SightMate

SightMate 是一个 Web 端 AI 视觉对话助手。用户点击一次“开始视频对话”后，系统会同时开启摄像头和连续语音识别；用户说完一句话后自动截取当前画面，将问题和截图发送到后端，由阿里云百炼视觉模型生成回答，并使用专业语音合成播报。

SightMate 不会持续上传视频流，仅在用户主动提问时截取当前画面。

## 题目方向

AI 视觉对话助手。

## 功能列表

- 摄像头实时预览。
- 浏览器语音识别输入。
- 视频对话模式：一个按钮同时开启摄像头和连续语音识别。
- 图片压缩为 JPEG base64，最长边不超过 1024px。
- 前端将语音识别到的问题、截图和最近上下文发送到后端。
- 后端通过阿里云百炼 OpenAI 兼容接口调用千问视觉模型。
- 前端展示 AI 回答。
- 阿里云 Qwen-TTS 专业语音播报 AI 回答，失败时回退浏览器播报。
- 支持停止播报和重新播放。
- 使用 SQLite 保存最近 20 个对话会话，每个会话包含多轮问答。
- 请求模型时只传最近 3 轮上下文。
- 支持清空历史记录。
- 提供 loading、错误提示和隐私提示。

## 技术栈

- 前端：Vue 3、Vite、TypeScript
- 后端：FastAPI、Python
- 模型服务：阿里云百炼视觉理解模型，默认 `qwen3.7-plus`
- 语音能力：阿里云 Qwen-TTS、浏览器 Web Speech API、`speechSynthesis` 回退
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

真实 API Key 只放在 `backend/.env`，不要提交到 GitHub。仓库中只提交 `.env.example`。

| 变量 | 说明 |
| --- | --- |
| `ALIYUN_API_KEY` | 阿里云百炼 API Key |
| `ALIYUN_BASE_URL` | 阿里云百炼 OpenAI 兼容接口地址 |
| `ALIYUN_VISION_MODEL` | 视觉模型名称，默认 `qwen3.7-plus` |
| `ALIYUN_TTS_BASE_URL` | 阿里云百炼 DashScope API 地址 |
| `ALIYUN_TTS_MODEL` | 语音合成模型名称，默认 `qwen3-tts-flash` |
| `ALIYUN_TTS_VOICE` | 语音合成音色，默认 `Cherry` |
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

## 阿里云模型说明

后端通过阿里云百炼 OpenAI 兼容接口调用视觉模型：

```text
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

多模态请求中，图片通过 `image_url.url` 传入 Base64 Data URL。语音合成通过后端 `/api/speech/synthesize` 调用阿里云 Qwen-TTS。前端不会直接请求阿里云 API，也不会暴露 `ALIYUN_API_KEY`。

## 隐私说明

SightMate 不上传连续视频流。摄像头画面只在浏览器中实时预览，只有用户说完一句话触发连续对话请求，或点击发送问题时，系统才截取当前帧并发送给后端模型服务。前端不会向用户展示截图预览，体验上更接近视频对话，但底层仍是按需单帧上传。

历史记录以“对话会话”的形式保存在后端 SQLite 中，每个会话包含多轮问答，不上传到云数据库。SQLite 文件默认位于 `backend/data/sightmate.sqlite3`，不会提交到 GitHub。点击清空历史会删除本地 SQLite 中的历史记录。

## 成本控制说明

- 不上传连续视频流，只在提问触发时无感截取当前帧。
- 截图最长边限制为 1024px，JPEG 质量约 0.8。
- 语音识别使用浏览器能力；语音播报优先使用阿里云 Qwen-TTS，失败时回退浏览器能力。
- 历史记录保存在 SQLite，不引入云数据库。
- 请求模型时只带最近 3 轮上下文。
- loading 期间禁用发送按钮，避免重复调用模型。

## Demo 视频链接

待补充：录制完成后将 demo 视频链接放在这里。

## 项目截图

待补充：录制 demo 或最终验收时补充界面截图。

## PR 开发记录

- PR 1：`chore: initialize SightMate project`
- PR 2：`feat: add camera preview`
- PR 3：`feat: add voice input`
- PR 4：`feat: add frame capture`
- PR 5：`feat: add vision chat mock API`
- PR 6：`feat: connect frontend chat flow`
- PR 7：`feat: integrate Qwen-VL model`
- PR 8：`feat: add speech output`
- PR 9：`feat: add chat history and context trimming`
- PR 10：`style: polish UI and error states`
- PR 11：`docs: complete README and design document`
