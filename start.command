#!/bin/bash
# =============================================================
# DASPOWEAR — one-click launcher for macOS
# Double-click this file in Finder to start the shop.
# =============================================================

set -e
cd "$(dirname "$0")"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║              DASPOWEAR — Launcher              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ---------- 1. Python check ----------
if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 is not installed."
  echo "Install via: brew install python   (or python.org)"
  read -p "Press Enter to close..."
  exit 1
fi
echo "✓ Found $(python3 --version)"

# ---------- 2. Stop anything still running on our ports ----------
echo "→ Cleaning up old processes (if any)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1

# ---------- 3. Venv + dependencies ----------
cd backend

if [ ! -d "venv" ]; then
  echo "→ Creating Python virtual environment (one-time, ~30s)..."
  python3 -m venv venv
fi

source venv/bin/activate

# Hash of requirements — re-install if it changed
REQ_HASH=$(shasum requirements.txt | awk '{print $1}')
INSTALLED_HASH=""
[ -f "venv/.installed" ] && INSTALLED_HASH=$(cat venv/.installed)

if [ "$REQ_HASH" != "$INSTALLED_HASH" ]; then
  echo "→ Installing/updating dependencies (~1 min)..."
  pip install --quiet --upgrade pip
  if ! pip install -r requirements.txt; then
    echo ""
    echo "❌ pip install failed — see errors above."
    read -p "Press Enter to close..."
    exit 1
  fi
  echo "$REQ_HASH" > venv/.installed
  echo "✓ Dependencies installed"
else
  echo "✓ Dependencies up to date"
fi

# ---------- 4. Reset DB so seed runs fresh with current data ----------
rm -f daspowear.db

# ---------- 5. Start backend (serves BOTH the API and the frontend) ----------
echo "→ Starting server on http://localhost:8000 ..."
nohup uvicorn main:app --host 127.0.0.1 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!

# Wait until backend answers
BACKEND_UP=0
for i in {1..30}; do
  if curl -s http://localhost:8000/api/products > /dev/null 2>&1; then
    BACKEND_UP=1
    break
  fi
  sleep 0.5
done

if [ "$BACKEND_UP" -eq 0 ]; then
  echo ""
  echo "❌ Backend FAILED to start. Last lines of backend.log:"
  echo "─────────────────────────────────────────────"
  tail -n 30 ../backend.log
  echo "─────────────────────────────────────────────"
  read -p "Press Enter to close..."
  exit 1
fi

echo "✓ Server is up (PID: $BACKEND_PID)"

cd ..
echo "$BACKEND_PID" > .pids

# ---------- 6. Open browser ----------
sleep 0.5
open "http://localhost:8000"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   DASPOWEAR is running.                        ║"
echo "║                                                ║"
echo "║   Shop:    http://localhost:8000               ║"
echo "║   API:     http://localhost:8000/docs          ║"
echo "║                                                ║"
echo "║   To STOP, double-click stop.command           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Logs: backend.log"
echo ""
read -p "Press Enter to close this window..."
