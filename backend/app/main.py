"""
SportX FastAPI Application Entrypoint
Group 2 (Person 3 + Person 4)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SportX API",
    description="AI-Powered Student Fitness Companion Backend",
    version="1.0.0"
)

# CORS configuration for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "SportX API", "version": "1.0.0"}
