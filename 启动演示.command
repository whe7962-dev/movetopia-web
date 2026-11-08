#!/bin/zsh
cd "${0:A:h}" || exit 1
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
if curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then
  open http://127.0.0.1:5173/
else
  (sleep 2; open http://127.0.0.1:5173/) &
  npm run dev -- --port 5173 --strictPort
fi
