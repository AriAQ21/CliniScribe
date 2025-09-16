# syntax=docker/dockerfile:1.4
FROM python:3.9-slim

ENV HF_HOME=/models/huggingface_cache

WORKDIR /app

# Install system packages
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy code and install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir accelerate==0.25.0   # ✅ Pin accelerate here

COPY app/ ./app/

ENV HF_TOKEN=${HF_TOKEN}
EXPOSE 5005
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "5005"]
