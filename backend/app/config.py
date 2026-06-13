from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    aliyun_api_key: str = ""
    aliyun_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    aliyun_vision_model: str = "qwen3.7-plus"
    aliyun_tts_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    aliyun_tts_model: str = "qwen3-tts-flash"
    aliyun_tts_voice: str = "Cherry"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
