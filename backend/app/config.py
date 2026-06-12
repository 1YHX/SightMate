from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    aliyun_api_key: str = ""
    aliyun_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    aliyun_vision_model: str = "qwen-vl-plus"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
