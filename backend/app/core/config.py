"""
Core settings and environment configuration
"""
import os

API_V1_STR = "/api/v1"
PROJECT_NAME = "SportX"
SECRET_KEY = os.getenv("SECRET_KEY", "sportx-super-secret-key-for-dev")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sportx.db")
