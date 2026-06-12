# SightMate

SightMate 是一个 Web 端 AI 视觉对话助手。用户打开摄像头和麦克风后，可以通过语音或文字向 AI 提问，系统在用户主动提问时截取当前画面并交给后端视觉模型处理。

当前进度：PR 1 初始化项目。

## 题目方向

AI 视觉对话助手。

## 技术栈

- 前端：Vue 3、Vite、TypeScript
- 后端：FastAPI、Python
- 视觉模型：阿里云百炼千问视觉模型，后续接入 `qwen-vl-plus` 等模型
- 语音能力：浏览器 Web Speech API 与 `speechSynthesis`

## 启动方式

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

## 环境变量

后端读取 `.env`，不要提交真实 API Key。示例见 `.env.example`。

## 第三方依赖

### 前端

- `@vitejs/plugin-vue`
- `vite`
- `vue`
- `typescript`

### 后端

- `fastapi`
- `uvicorn`
- `pydantic-settings`
- `python-dotenv`
- `httpx`

## 阿里云模型说明

后续 PR 会通过后端调用阿里云百炼千问视觉模型，前端不会直接请求阿里云 API。

## 隐私说明

SightMate 不会持续上传视频流，仅在用户主动提问时截取当前画面。

## 成本控制说明

后续实现会采用按需截图、图片压缩、上下文裁剪、本地历史存储和防重复提交等策略。

## Demo 视频链接

待补充。

## 项目截图

待补充。

## PR 开发记录

- PR 1：初始化项目。
