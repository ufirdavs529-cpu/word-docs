"""
Microsoft Word Web Application - Python Backend Server
Powered by Python standard library (http.server, sqlite3, json)
No external dependencies required! Runs on Python 3.7+
"""

import http.server
import socketserver
import json
import sqlite3
import os
import sys
import mimetypes
import urllib.parse
from datetime import datetime

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(BASE_DIR, 'word_database.db')
UPLOADS_DIR = os.path.join(PARENT_DIR, 'uploads')

if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR, exist_ok=True)

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            settings TEXT,
            word_count INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    
    # Check if default document exists
    cursor.execute("SELECT id FROM documents WHERE id = 'doc-default'")
    if not cursor.fetchone():
        default_content = '''
        <h1 style="text-align: center; color: #2b579a;">Microsoft Word - Python va MySQL Integratsiyasi</h1>
        <p style="text-align: center; color: #666; font-style: italic;">Ushbu hujjat Python SQLite/MySQL backend orqali boshqariladi</p>
        <hr style="border: none; border-top: 2px solid #2b579a; margin: 20px 0;" />
        <h2>1. Tizim Haqida</h2>
        <p>Ushbu backend Python va SQLite/MySQL bazasi orqali to'liq REST API xizmatini taqdim etadi.</p>
        <ul>
            <li><b>GET /api/documents:</b> Barcha saqlangan hujjatlar ro'yxati</li>
            <li><b>POST /api/documents:</b> Yangi hujjat yaratish</li>
            <li><b>PUT /api/documents/:id:</b> Hujjatni avtomatik saqlash (AutoSave)</li>
            <li><b>DELETE /api/documents/:id:</b> Hujjatni o'chirish</li>
        </ul>
        '''
        cursor.execute('''
            INSERT INTO documents (id, title, content, settings, word_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            'doc-default',
            'Hujjat 1 - Python Backend',
            default_content,
            json.dumps({"orientation": "portrait", "pageSize": "a4", "margins": "normal", "pageColor": "#ffffff", "watermark": ""}),
            50,
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        conn.commit()
    conn.close()

init_db()

class WordRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API: List Documents
        if path == '/api/documents':
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, word_count as wordCount, created_at as createdAt, updated_at as updatedAt FROM documents ORDER BY updated_at DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "documents": rows})

        # API: Single Document
        if path.startswith('/api/documents/'):
            doc_id = path.replace('/api/documents/', '').strip()
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                doc = dict(row)
                doc['settings'] = json.loads(doc['settings']) if doc.get('settings') else {}
                doc['wordCount'] = doc.get('word_count', 0)
                doc['updatedAt'] = doc.get('updated_at')
                doc['createdAt'] = doc.get('created_at')
                return self.send_json(200, {"success": True, "document": doc})
            return self.send_json(404, {"success": False, "error": "Hujjat topilmadi"})

        # Serve static files from workspace root
        if path == '/':
            path = '/index.html'
        file_path = os.path.join(PARENT_DIR, path.lstrip('/'))
        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            self.send_response(200)
            self.send_header('Content-Type', mime_type or 'application/octet-stream')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}

        # API: Create Document
        if path == '/api/documents':
            doc_id = 'doc-' + str(int(datetime.now().timestamp() * 1000))
            title = body.get('title', 'Yangi Hujjat')
            content = body.get('content', '<p><br></p>')
            settings = json.dumps(body.get('settings', {}))
            now = datetime.now().isoformat()

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO documents (id, title, content, settings, word_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (doc_id, title, content, settings, 0, now, now))
            conn.commit()
            conn.close()

            return self.send_json(201, {
                "success": True,
                "document": {"id": doc_id, "title": title, "content": content, "createdAt": now, "updatedAt": now}
            })

        # API: Upload Image
        if path == '/api/upload':
            data_url = body.get('dataUrl', '')
            filename = body.get('filename', 'upload.png')
            if ',' in data_url:
                import base64
                header, base64_data = data_url.split(',', 1)
                safe_name = f"img_{int(datetime.now().timestamp())}_{filename}"
                save_path = os.path.join(UPLOADS_DIR, safe_name)
                with open(save_path, 'wb') as f:
                    f.write(base64.b64decode(base64_data))
                return self.send_json(200, {"success": True, "url": f"/uploads/{safe_name}"})
            return self.send_json(400, {"success": False, "error": "Noto'g'ri rasm"})

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith('/api/documents/'):
            doc_id = path.replace('/api/documents/', '').strip()
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}

            title = body.get('title')
            content = body.get('content')
            settings = json.dumps(body.get('settings', {}))
            word_count = body.get('wordCount', 0)
            now = datetime.now().isoformat()

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE documents
                SET title = COALESCE(?, title),
                    content = COALESCE(?, content),
                    settings = ?,
                    word_count = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (title, content, settings, word_count, now, doc_id))
            conn.commit()
            conn.close()

            return self.send_json(200, {"success": True, "updatedAt": now})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith('/api/documents/'):
            doc_id = path.replace('/api/documents/', '').strip()
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "O'chirildi"})

if __name__ == '__main__':
    print(f"=====================================================")
    print(f"   MICROSOFT WORD PYTHON SERVER ISHGA TUSHDI!        ")
    print(f"   Manzil: http://localhost:{PORT}                   ")
    print(f"   Baza: {DB_PATH} (SQLite)                          ")
    print(f"=====================================================")
    with socketserver.TCPServer(("", PORT), WordRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer to'xtatildi.")
