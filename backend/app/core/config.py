from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "GraphCody API"
    debug: bool = False

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # OpenAI
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "gpt-4-turbo-preview"

    # GitHub
    github_client_id: str = ""
    github_client_secret: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Indexing
    max_file_size: int = 500_000  # 500KB
    supported_extensions: list[str] = [
        ".py", ".js", ".ts", ".tsx", ".jsx", ".rs", ".go", ".java",
        ".rb", ".cpp", ".c", ".h", ".hpp", ".cs", ".swift", ".kt",
        ".php", ".vue", ".svelte", ".html", ".css", ".scss",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
