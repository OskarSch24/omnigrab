#!/bin/bash
PLIST_PATH="$HOME/Library/LaunchAgents/com.omnigrab.engine.plist"
SCRIPT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )/omnigrab-engine.py"
PYTHON_BIN="/opt/homebrew/opt/python@3.11/bin/python3.11"
[ -f "$PYTHON_BIN" ] || PYTHON_BIN="/usr/bin/python3"

mkdir -p "$HOME/Library/LaunchAgents"

cat << PLIST > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.omnigrab.engine</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON_BIN</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/omnigrab-engine.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/omnigrab-engine.err</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"
echo "OmniGrab Native Engine installed on port 58921."
