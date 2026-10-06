#!/usr/bin/env bash
# Start the TTS server on Kaggle and expose it with a free Cloudflare quick tunnel.
# Requires: Notebook settings -> Internet ON, Accelerator = GPU T4 (or P100).
set -euo pipefail
cd "$(dirname "$0")/.."

pip install -q -r requirements.txt

if [ ! -x ./cloudflared ]; then
  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
  chmod +x cloudflared
fi

pkill -f "uvicorn seera_tts.server" || true
pkill -f "cloudflared tunnel" || true

nohup uvicorn seera_tts.server:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
echo "Loading model (first run downloads ~2GB)..."
until curl -sf localhost:8000/health > /dev/null; do
  if ! pgrep -f "uvicorn seera_tts.server" > /dev/null; then tail -30 server.log; exit 1; fi
  sleep 3
done
curl -s localhost:8000/health; echo

nohup ./cloudflared tunnel --url http://localhost:8000 > tunnel.log 2>&1 &
until grep -qo 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log; do sleep 1; done
URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | head -1)
echo "Public URL : $URL"
echo "WebSocket  : ${URL/https/wss}/ws/tts"
