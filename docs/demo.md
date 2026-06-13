# Demo 录制说明

建议录制 3 到 6 分钟视频，并在 README 中补充视频链接。

## 必须展示

1. 打开项目页面。
2. 点击“开始视频对话”，自动开启摄像头并显示实时画面。
3. 使用连续语音提问。
4. 展示说完一句话后系统自动分析当前画面，不需要手动点击截图。
5. 展示文字输入兜底，点击发送后系统自动分析当前画面。
6. 后端调用千问视觉模型并返回回答。
7. 前端展示 AI 回答。
8. AI 回答后使用专业语音自动播报。
9. 查看左侧对话历史，点开一个会话查看多轮聊天记录。
10. 清空历史记录。
11. 展示隐私提示。
12. 展示 README 和 `docs/DESIGN.md`。

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
ALIYUN_VISION_MODEL=qwen3.7-plus
ALIYUN_TTS_BASE_URL=https://dashscope.aliyuncs.com/api/v1
ALIYUN_TTS_MODEL=qwen3-tts-flash
ALIYUN_TTS_VOICE=Cherry
```

不要在视频中展示真实 API Key。
