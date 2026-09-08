#!/usr/bin/env bash
# ccnotes control script. Aliased from ~/.zshrc as `ccnotes`.
# Usage: ccnotes {start|stop|restart|status|logs|open|new|validate|help}
set -euo pipefail

CCNOTES_DIR="${CCNOTES_DIR:-$HOME/dev/ccnotes}"
CCNOTES_PORT="${CCNOTES_PORT:-4319}"
PIDFILE="/tmp/ccnotes.pid"
LOGFILE="/tmp/ccnotes.log"
URL="http://localhost:${CCNOTES_PORT}"
JS_RUNNER="${JS_RUNNER:-$(command -v node 2>/dev/null || command -v bun 2>/dev/null || echo node)}"

_running() { [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

cmd_start() {
  if _running; then echo "ccnotes already running (pid $(cat "$PIDFILE")) — $URL"; return 0; fi
  cd "$CCNOTES_DIR"
  CCNOTES_PORT="$CCNOTES_PORT" nohup "$JS_RUNNER" server.mjs >"$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 0.7
  if _running; then echo "ccnotes up — $URL   (logs: ccnotes logs)"
  else echo "ccnotes failed to start:"; tail -n 20 "$LOGFILE"; rm -f "$PIDFILE"; return 1; fi
}

cmd_stop() {
  if _running; then kill "$(cat "$PIDFILE")" 2>/dev/null || true; rm -f "$PIDFILE"; echo "ccnotes stopped"
  else pkill -f "server.mjs" 2>/dev/null && echo "ccnotes stopped (stray process)" || echo "ccnotes not running"; rm -f "$PIDFILE"; fi
}

cmd_status() {
  if _running; then
    echo "running — pid $(cat "$PIDFILE") — $URL"
    curl -s "$URL/health" | grep -E '"ok"|"notebooks"' || true
  else echo "stopped"; fi
}

cmd_logs()     { tail -n "${1:-40}" -f "$LOGFILE"; }
cmd_open()     { open "$URL"; }
cmd_new()      { cd "$CCNOTES_DIR"; "$JS_RUNNER" tools/new-notebook.mjs "$@"; }
cmd_validate() { cd "$CCNOTES_DIR"; "$JS_RUNNER" tools/validate-all.mjs; }

cmd_help() {
cat <<EOF
ccnotes <command>

  start          start the server (background)  -> $URL
  stop           stop the server
  restart        stop + start
  status         show run state + /health
  logs [N]       tail -f the server log (default 40 lines)
  open           open $URL in the browser
  new "<Subject>" <unitNo> "<Title>"   scaffold a new notebook
  validate       validate every notebook
  help           this text

To build notes for a unit:
  1. cd $CCNOTES_DIR   (run Claude Code or Antigravity here)
  2. ccnotes new "Operating Systems" 4 "Virtual Memory"
  3. drop the unit's decks (.zip/.pptx/.pdf) in the inbox path it prints
  4. in your agent: run the ccnotes-build skill on that notebook + inbox folder
EOF
}

case "${1:-help}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_stop; sleep 0.3; cmd_start ;;
  status)   cmd_status ;;
  logs)     shift; cmd_logs "${1:-40}" ;;
  open)     cmd_open ;;
  new)      shift; cmd_new "$@" ;;
  validate) cmd_validate ;;
  help|-h|--help) cmd_help ;;
  *) echo "unknown command: $1"; echo; cmd_help; exit 1 ;;
esac
