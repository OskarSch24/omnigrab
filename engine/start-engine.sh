#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PYTHON_BIN="/opt/homebrew/opt/python@3.11/bin/python3.11"
[ -f "$PYTHON_BIN" ] || PYTHON_BIN="/usr/bin/python3"
nohup "$PYTHON_BIN" "$SCRIPT_DIR/omnigrab-engine.py" > "$SCRIPT_DIR/engine.log" 2>&1 &
echo "OmniGrab Native Engine started on port 58921 (PID: $!)."
