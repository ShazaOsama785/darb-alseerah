# Darb Al-Seerah - one container: FastAPI backend + built React frontend + pre-generated audio.
# Used by the Hugging Face Space (see deploy/README.md). It builds from the GitHub repo,
# so the Space itself only needs this file and README.md.

# ---- 1. build the website
FROM node:20-slim AS web
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG REPO=https://github.com/ShazaOsama785/darb-alseerah.git
ARG BRANCH=main
WORKDIR /src
RUN git clone --depth 1 -b ${BRANCH} ${REPO} app
WORKDIR /src/app/frontend
RUN npm ci && npm run build && rm -rf node_modules

# ---- 2. the server
FROM python:3.12-slim
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
COPY --from=web --chown=user /src/app /home/user/app

# CPU-only torch is far smaller than the default build
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt -r requirements-rag.txt

USER user
ENV HF_HOME=/home/user/.cache/huggingface \
    HF_HUB_DISABLE_SYMLINKS_WARNING=1 \
    PYTHONUNBUFFERED=1
# Download the RAG embedding model at BUILD time, so starts are fast
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"

WORKDIR /home/user/app/backend
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
