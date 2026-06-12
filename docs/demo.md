# Demo 录制说明

建议录制 3 到 6 分钟视频，并在 README 中补充视频链接。

## 必须展示

1. 打开项目页面。
2. 打开摄像头并显示实时画面。
3. 使用麦克风语音提问，或展示文字输入兜底。
4. 点击发送，系统自动截取当前画面。
5. 后端调用千问视觉模型并返回回答。
6. 前端展示 AI 回答。
7. AI 回答后自动语音播报。
8. 查看历史记录。
9. 清空历史记录。
10. 展示隐私提示。
11. 展示 README 和 `docs/DESIGN.md`。

## 录制前检查

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

```bash
cd frontend
npm run dev
```

确认 `backend/.env` 中已配置：

```env
ALIYUN_API_KEY=your_api_key_here
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_VISION_MODEL=qwen-vl-plus
```

不要在视频中展示真实 API Key。
