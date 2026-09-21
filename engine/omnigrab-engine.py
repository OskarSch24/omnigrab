#!/usr/bin/env python3
"""
OmniGrab Native Companion Engine
Ultra-fast, 100% reliable local media resolver using native yt-dlp and ffmpeg.
Runs on http://127.0.0.1:58921 with CORS enabled.
"""

import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
from uuid import uuid4

PORT = 58921
CACHE_DIR = os.path.expanduser('~/.omnigrab/cache')
DOWNLOADS_DIR = os.path.expanduser('~/Downloads')
os.makedirs(CACHE_DIR, exist_ok=True)

# Find binaries
YTDLP_BIN = '/opt/homebrew/bin/yt-dlp' if os.path.exists('/opt/homebrew/bin/yt-dlp') else shutil.which('yt-dlp')
FFMPEG_BIN = '/opt/homebrew/bin/ffmpeg' if os.path.exists('/opt/homebrew/bin/ffmpeg') else shutil.which('ffmpeg')

tasks = {}
tasks_lock = threading.Lock()

def get_ytdlp_version():
    try:
        out = subprocess.check_output([YTDLP_BIN, '--version'], text=True).strip()
        return out
    except Exception:
        return 'unknown'

FFPROBE_BIN = os.path.join(os.path.dirname(FFMPEG_BIN), 'ffprobe') if FFMPEG_BIN else None
QUICKTIME_VCODECS = {'h264', 'hevc'}


def ensure_quicktime_compatible(task_id, filepath):
    """Instagram & Co. liefern oft nur VP9/AV1 im MP4. QuickTime/macOS spielt davon nur den Ton ab,
    daher Videospur in H.264 umwandeln (Hardware-Encoder, Fallback libx264), Audio bleibt unangetastet."""
    if not (FFMPEG_BIN and FFPROBE_BIN and os.path.exists(FFPROBE_BIN) and os.path.exists(filepath)):
        return
    try:
        vcodec = subprocess.check_output([
            FFPROBE_BIN, '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', filepath
        ], text=True).strip()
    except Exception:
        return
    if not vcodec or vcodec in QUICKTIME_VCODECS:
        return

    with tasks_lock:
        tasks[task_id].update({
            'status': 'converting',
            'progress': 100,
            'text': f'Video wird für QuickTime konvertiert ({vcodec} → H.264)...'
        })

    tmp_path = filepath + '.h264.mp4'
    encoders = [
        ['-c:v', 'h264_videotoolbox', '-q:v', '65'],
        ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'],
    ]
    for enc in encoders:
        result = subprocess.run([
            FFMPEG_BIN, '-y', '-v', 'error', '-i', filepath,
            '-map', '0:v:0', '-map', '0:a?', *enc, '-pix_fmt', 'yuv420p', '-tag:v', 'avc1',
            '-c:a', 'copy', '-movflags', '+faststart', tmp_path
        ])
        if result.returncode == 0 and os.path.exists(tmp_path):
            os.replace(tmp_path, filepath)
            return
    if os.path.exists(tmp_path):
        os.remove(tmp_path)


def run_download(task_id, options):
    url = options.get('url')
    video_quality = options.get('videoQuality', '1080')
    audio_format = options.get('audioFormat', 'mp3')
    mode = options.get('downloadMode', 'auto')

    with tasks_lock:
        tasks[task_id] = {
            'status': 'starting',
            'progress': 0,
            'speed': '',
            'eta': '',
            'text': 'Download wird vorbereitet...',
            'filename': '',
            'download_url': '',
            'error': None
        }

    output_template = os.path.join(CACHE_DIR, '%(title)s.%(ext)s')
    cmd = [
        YTDLP_BIN,
        '--no-playlist',
        '--no-warnings',
        '--newline',
        # Sonst liefert yt-dlp bei gleichem Titel stillschweigend die alte Cache-Datei
        # (andere Qualität/Modus) aus, statt neu zu laden.
        '--force-overwrites',
        '-o', output_template
    ]

    if FFMPEG_BIN:
        cmd.extend(['--ffmpeg-location', os.path.dirname(FFMPEG_BIN)])

    if mode == 'audio':
        cmd.extend([
            '-x',
            '--audio-format', audio_format if audio_format in ['mp3', 'wav', 'opus', 'm4a', 'flac'] else 'mp3',
            '--audio-quality', '0'
        ])
    else:
        # "res" sortiert nach der kürzeren Bildseite -> Hochkant-Videos (Reels, Shorts, TikTok)
        # werden korrekt als 1080p erkannt statt über height<=1080 auf 540x960 zu fallen.
        # Bei gleicher Auflösung wird H.264/AAC bevorzugt (QuickTime-kompatibel).
        if video_quality == 'max':
            sort = 'res,vcodec:h264,acodec:aac'
        else:
            try:
                h = int(video_quality)
            except ValueError:
                h = 1080
            sort = f'res:{h},vcodec:h264,acodec:aac'
        cmd.extend([
            '-f', 'bv' if mode == 'mute' else 'bv*+ba/b',
            '-S', sort,
            '--merge-output-format', 'mp4'
        ])

    cmd.append(url)

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        final_filename = ''

        for line in proc.stdout:
            line_str = line.strip()
            if not line_str:
                continue

            # Capture destination filename
            dest_match = re.search(r'Destination:\s+(.+)$', line_str)
            if dest_match:
                final_filename = os.path.basename(dest_match.group(1))

            merge_match = re.search(r'Merging formats into "(.+)"', line_str)
            if merge_match:
                final_filename = os.path.basename(merge_match.group(1))

            # Progress regex: [download]  45.2% of ~  250.00MiB at  12.34MiB/s ETA 00:15
            prog_match = re.search(r'\[download\]\s+([0-9.]+)%\s+of\s+~?\s*([0-9.]+\w+)\s+at\s+([0-9.]+\w+/s)\s+ETA\s+([0-9:]+)', line_str)
            if prog_match:
                pct = float(prog_match.group(1))
                speed = prog_match.group(3)
                eta = prog_match.group(4)
                with tasks_lock:
                    tasks[task_id].update({
                        'status': 'downloading',
                        'progress': pct,
                        'speed': speed,
                        'eta': eta,
                        'text': f'{pct:.1f}% ({speed}, noch {eta})'
                    })
                continue

            if '[download] 100%' in line_str:
                with tasks_lock:
                    tasks[task_id].update({
                        'status': 'merging',
                        'progress': 100,
                        'text': 'Audio & Video werden final zusammengeführt...'
                    })

        proc.wait()

        if proc.returncode == 0:
            # If final_filename not captured, find latest file in CACHE_DIR
            if not final_filename:
                files = [os.path.join(CACHE_DIR, f) for f in os.listdir(CACHE_DIR)]
                if files:
                    latest = max(files, key=os.path.getmtime)
                    final_filename = os.path.basename(latest)

            if mode != 'audio' and final_filename:
                ensure_quicktime_compatible(task_id, os.path.join(CACHE_DIR, final_filename))

            download_url = f'http://127.0.0.1:{PORT}/file/{urllib.parse.quote(final_filename)}'
            with tasks_lock:
                tasks[task_id].update({
                    'status': 'complete',
                    'progress': 100,
                    'text': 'Download fertiggestellt!',
                    'filename': final_filename,
                    'download_url': download_url
                })
        else:
            with tasks_lock:
                tasks[task_id].update({
                    'status': 'error',
                    'error': f'yt-dlp Fehler (Code {proc.returncode})',
                    'text': 'Fehler beim Herunterladen'
                })
    except Exception as err:
        with tasks_lock:
            tasks[task_id].update({
                'status': 'error',
                'error': str(err),
                'text': f'Fehler: {str(err)}'
            })


class OmniGrabHandler(http.server.BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')

    def do_OPTIONS(self):
        self._set_cors_headers(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/health':
            self._set_cors_headers(200)
            self.end_headers()
            data = {
                'status': 'ok',
                'engine': 'yt-dlp',
                'version': get_ytdlp_version(),
                'ffmpeg': bool(FFMPEG_BIN)
            }
            self.wfile.write(json.dumps(data).encode())
            return

        if path == '/progress':
            task_id = query.get('id', [''])[0]
            with tasks_lock:
                task = tasks.get(task_id)

            if not task:
                self._set_cors_headers(404)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Task not found'}).encode())
                return

            self._set_cors_headers(200)
            self.end_headers()
            self.wfile.write(json.dumps(task).encode())
            return

        if path.startswith('/file/'):
            filename = urllib.parse.unquote(path[6:])
            filepath = os.path.join(CACHE_DIR, filename)
            # Fallback to Downloads dir
            if not os.path.exists(filepath):
                filepath = os.path.join(DOWNLOADS_DIR, filename)

            if os.path.exists(filepath):
                ext = filename.split('.')[-1].lower()
                mime = 'audio/mpeg' if ext == 'mp3' else ('audio/wav' if ext == 'wav' else 'video/mp4')
                safe_ascii = filename.encode('ascii', 'replace').decode('ascii').replace('?', '_')
                encoded_utf8 = urllib.parse.quote(filename)
                self._set_cors_headers(200, mime)
                self.send_header('Content-Disposition', f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded_utf8}')
                self.send_header('Content-Length', str(os.path.getsize(filepath)))
                self.end_headers()
                with open(filepath, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return

        self._set_cors_headers(404)
        self.end_headers()
        self.wfile.write(b'{"error": "Not Found"}')

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith('/file/'):
            filename = urllib.parse.unquote(path[6:])
            filepath = os.path.join(CACHE_DIR, filename)
            if not os.path.exists(filepath):
                filepath = os.path.join(DOWNLOADS_DIR, filename)

            if os.path.exists(filepath):
                ext = filename.split('.')[-1].lower()
                mime = 'audio/mpeg' if ext == 'mp3' else ('audio/wav' if ext == 'wav' else 'video/mp4')
                safe_ascii = filename.encode('ascii', 'replace').decode('ascii').replace('?', '_')
                encoded_utf8 = urllib.parse.quote(filename)
                self._set_cors_headers(200, mime)
                self.send_header('Content-Disposition', f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded_utf8}')
                self.send_header('Content-Length', str(os.path.getsize(filepath)))
                self.end_headers()
                return

        self._set_cors_headers(404)
        self.end_headers()

    def do_POST(self):
        if self.path == '/download':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode())
            except Exception:
                self._set_cors_headers(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid JSON"}')
                return

            url = data.get('url')
            if not url:
                self._set_cors_headers(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Missing URL"}')
                return

            task_id = str(uuid4())
            thread = threading.Thread(target=run_download, args=(task_id, data), daemon=True)
            thread.start()

            self._set_cors_headers(200)
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'task_id': task_id}).encode())
            return

        self._set_cors_headers(404)
        self.end_headers()
        self.wfile.write(b'{"error": "Not Found"}')

    def log_message(self, format, *args):
        pass


def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), OmniGrabHandler)
    print(f"OmniGrab Native Engine listening on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping OmniGrab Engine...")
        server.server_close()


if __name__ == '__main__':
    main()
