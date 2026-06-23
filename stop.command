#!/bin/bash
cd "$(dirname "$0")"
echo "→ Stopping Daspowear..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✓ Server stopped" || echo "  (nothing running)"
rm -f .pids
echo ""
sleep 2
