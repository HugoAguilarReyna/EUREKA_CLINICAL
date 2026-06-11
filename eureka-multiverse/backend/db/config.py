from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    mongo_uri: str = "mongodb://admin:password@localhost:27017/eureka_db?authSource=admin"
    mongo_db_name: str = "eureka_db"
    api_port: int = 8000
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
