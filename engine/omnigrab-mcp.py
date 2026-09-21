#!/usr/bin/env python3
"""MCP-Server vor der lokalen OmniGrab-Engine (http://127.0.0.1:58921).

Zeilenweises JSON-RPC 2.0 wie die anderen Cortex-Brücken. Kein Fremdpaket.
Die Chrome-Erweiterung bleibt unangetastet — dieser Prozess ruft nur die Engine.
Läuft die Engine nicht, wird sie hier gestartet.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

NAME = "omnigrab"
VERSION = "1.0.0"
ENGINE = "http://127.0.0.1:58921"
ENGINE_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "omnigrab-engine.py")
PROTOKOLLE = ("2025-06-18", "2025-03-26", "2024-11-05")

_engine_lock = threading.Lock()


def _http(method: str, path: str, body: dict | None = None, timeout: float = 8) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        ENGINE + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"error": raw[:400]}
        parsed["http"] = exc.code
        return parsed
    except urllib.error.URLError as exc:
        return {
            "error": (
                "OmniGrab-Engine nicht erreichbar auf 127.0.0.1:58921. "
                f"({exc.reason})"
            )
        }


def _engine_ok() -> bool:
    data = _http("GET", "/health", timeout=2)
    return "error" not in data and data.get("status") == "ok"


def _ensure_engine() -> dict | None:
    """None = Engine läuft. Sonst eine Fehlermeldung zum Zurückgeben."""
    if _engine_ok():
        return None
    with _engine_lock:
        if _engine_ok():
            return None
        if not os.path.isfile(ENGINE_PY):
            return {
                "error": (
                    f"OmniGrab-Engine fehlt unter {ENGINE_PY}. "
                    "Die Chrome-Erweiterung bleibt unangetastet — dieser Server startet nur die lokale Engine."
                )
            }
        log = os.path.join(os.path.dirname(ENGINE_PY), "engine.log")
        try:
            handle = open(log, "ab")
            subprocess.Popen(
                [sys.executable, ENGINE_PY],
                stdout=handle,
                stderr=handle,
                start_new_session=True,
                close_fds=True,
            )
        except OSError as exc:
            return {"error": f"OmniGrab-Engine ließ sich nicht starten: {exc}"}
        for _ in range(40):
            time.sleep(0.15)
            if _engine_ok():
                return None
        return {
            "error": (
                "OmniGrab-Engine startete nicht auf 127.0.0.1:58921. "
                "Prüfe engine.log neben omnigrab-engine.py."
            )
        }


def wz_health() -> str:
    fehl = _ensure_engine()
    if fehl:
        return json.dumps(fehl, ensure_ascii=False, indent=2)
    data = _http("GET", "/health")
    return json.dumps(data, ensure_ascii=False, indent=2)


def wz_download(url: str, modus: str = "video", qualitaet: str = "1080") -> str:
    fehl = _ensure_engine()
    if fehl:
        return json.dumps(fehl, ensure_ascii=False, indent=2)
    payload = {
        "url": url,
        "downloadMode": "audio" if modus == "audio" else "auto",
        "videoQuality": qualitaet,
        "audioFormat": "mp3",
    }
    data = _http("POST", "/download", payload, timeout=20)
    return json.dumps(data, ensure_ascii=False, indent=2)


def wz_progress(task_id: str) -> str:
    data = _http("GET", f"/progress?id={urllib.parse.quote(task_id)}")
    return json.dumps(data, ensure_ascii=False, indent=2)


WERKZEUGE = {
    "omnigrab_status": (
        wz_health,
        {
            "description": (
                "Prüft, ob die lokale OmniGrab-Engine läuft (yt-dlp, ffmpeg). "
                "Startet sie bei Bedarf."
            ),
            "properties": {},
            "required": [],
        },
    ),
    "omnigrab_download": (
        wz_download,
        {
            "description": (
                "Lädt ein Video oder Audio über OmniGrab herunter. "
                "YouTube, Instagram, TikTok, X. Gibt eine task_id zurück — "
                "danach omnigrab_progress aufrufen, bis status fertig ist."
            ),
            "properties": {
                "url": {"type": "string", "description": "YouTube-, Instagram- oder anderer Medien-Link"},
                "modus": {"type": "string", "enum": ["video", "audio"], "description": "video (Standard) oder audio"},
                "qualitaet": {
                    "type": "string",
                    "description": "Videoqualität, z.B. 1080, 720, 480. Standard 1080.",
                },
            },
            "required": ["url"],
        },
    ),
    "omnigrab_progress": (
        wz_progress,
        {
            "description": "Stand eines OmniGrab-Downloads anhand der task_id.",
            "properties": {
                "task_id": {"type": "string", "description": "ID aus omnigrab_download"},
            },
            "required": ["task_id"],
        },
    ),
}


def _schema(spec):
    return {"type": "object", "properties": spec["properties"], "required": spec["required"]}


def behandle(anfrage):
    methode, mid = anfrage.get("method"), anfrage.get("id")
    params = anfrage.get("params") or {}
    if mid is None:
        return None
    if methode == "initialize":
        gewuenscht = params.get("protocolVersion")
        return {
            "protocolVersion": gewuenscht if gewuenscht in PROTOKOLLE else PROTOKOLLE[0],
            "capabilities": {"tools": {}},
            "serverInfo": {"name": NAME, "version": VERSION},
            "instructions": (
                "OmniGrab auf diesem Mac. Schickt der Nutzer einen YouTube- oder "
                "Instagram-Link: omnigrab_download, dann omnigrab_progress bis fertig. "
                "Die Engine auf Port 58921 wird bei Bedarf selbst gestartet."
            ),
        }
    if methode == "ping":
        return {}
    if methode == "tools/list":
        return {
            "tools": [
                {"name": n, "description": s["description"], "inputSchema": _schema(s)}
                for n, (_, s) in WERKZEUGE.items()
            ]
        }
    if methode == "tools/call":
        name = params.get("name")
        if name not in WERKZEUGE:
            return {"content": [{"type": "text", "text": f"Unbekanntes Werkzeug: {name}"}], "isError": True}
        fn, spec = WERKZEUGE[name]
        args = params.get("arguments") or {}
        erlaubt = {k: v for k, v in args.items() if k in spec["properties"] and v is not None}
        fehlend = [k for k in spec["required"] if k not in erlaubt]
        if fehlend:
            return {"content": [{"type": "text", "text": f"Fehlt: {', '.join(fehlend)}"}], "isError": True}
        try:
            return {"content": [{"type": "text", "text": fn(**erlaubt)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"{type(e).__name__}: {e}"}], "isError": True}
    raise LookupError(methode)


def diene():
    for zeile in sys.stdin:
        zeile = zeile.strip()
        if not zeile:
            continue
        try:
            anfrage = json.loads(zeile)
        except json.JSONDecodeError:
            continue
        try:
            ergebnis = behandle(anfrage)
        except LookupError as e:
            antwort = {
                "jsonrpc": "2.0",
                "id": anfrage.get("id"),
                "error": {"code": -32601, "message": f"Methode unbekannt: {e}"},
            }
        except Exception as e:
            antwort = {
                "jsonrpc": "2.0",
                "id": anfrage.get("id"),
                "error": {"code": -32603, "message": f"{type(e).__name__}: {e}"},
            }
        else:
            if ergebnis is None:
                continue
            antwort = {"jsonrpc": "2.0", "id": anfrage.get("id"), "result": ergebnis}
        sys.stdout.write(json.dumps(antwort, ensure_ascii=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    diene()
