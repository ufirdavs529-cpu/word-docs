const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data', 'documents');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Seed initial default document if empty
const defaultDocId = 'doc-default';
const defaultDocPath = path.join(DATA_DIR, `${defaultDocId}.json`);
if (!fs.existsSync(defaultDocPath)) {
  const initialDoc = {
    id: defaultDocId,
    title: 'Hujjat 1 - Microsoft Word Namuna',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: 'dark',
    settings: {
      orientation: 'portrait',
      pageSize: 'a4',
      margins: 'normal',
      pageColor: '#ffffff',
      watermark: ''
    },
    content: `
      <h1 style="text-align: center; color: #1f4e79; margin-bottom: 8px;">Microsoft Word - Professional Hujjat Namunasi</h1>
      <p style="text-align: center; color: #595959; font-style: italic; margin-bottom: 24px;">Frontend va Backend bilan to'liq integratsiya qilingan veb-muharrir</p>
      <hr style="border: none; border-top: 2px solid #2b579a; margin-bottom: 24px;" />
      
      <h2>1. Kirish va Umumiy Ma'lumot</h2>
      <p>Ushbu ilova <b>Microsoft Word 365</b> dasturining barcha asosiy bo'limlari (Home, Insert, Design, Layout, References, Review, View) va imkoniyatlarini 1-ga-1 shaklda brauzerda taqdim etadi. Matn terish, formatlash, jadvallar yaratish, rasmlar qo'shish va hujjatni saqlash imkoniyatlari mavjud.</p>
      
      <h2>2. Asosiy Xususiyatlar va Bo'limlar</h2>
      <p>Ilova quyidagi professional vositalarni o'z ichiga oladi:</p>
      <ul>
        <li><b>Home (Bosh sahifa):</b> Matn shrifti, o'lchami, qalin (B), qiya (I), tagiga chizish (U), ro'yxatlar, matnni tekislash va ranglar.</li>
        <li><b>Insert (Qo'yish):</b> Jadvallar, rasmlar, sarlavha va snoskalar, maxsus belgilar (Ω, π, ∑, ©).</li>
        <li><b>Design (Dizayn):</b> Sahifa foni, suv belgilari (Watermark) va mavzular.</li>
        <li><b>Layout (Sahifa tartibi):</b> Sahifa yo'nalishi (Portret / Albom), hoshiyalar (Margins) va A4 o'lchamlari.</li>
        <li><b>Review (Taqriz):</b> So'zlar sonini hisoblash, ovoz chiqarib o'qish (Read Aloud) va xatolarni tekshirish.</li>
      </ul>

      <h2>3. Ma'lumotlar Jadvali Namunasi</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #2b579a; color: white;">
            <th style="border: 1px solid #ddd; padding: 8px 12px; text-align: left;">№</th>
            <th style="border: 1px solid #ddd; padding: 8px 12px; text-align: left;">Bo'lim Nomi</th>
            <th style="border: 1px solid #ddd; padding: 8px 12px; text-align: left;">Vazifasi</th>
            <th style="border: 1px solid #ddd; padding: 8px 12px; text-align: center;">Holati</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">1</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">Frontend Ribbon Bar</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">1:1 Microsoft Word lenta tugmalari va menyusi</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px; text-align: center; color: #2e7d32; font-weight: bold;">Faol ✓</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="border: 1px solid #ddd; padding: 8px 12px;">2</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">Node.js Backend API</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">Hujjatlarni saqlash, yuklash, avtosaqlash (Autosave)</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px; text-align: center; color: #2e7d32; font-weight: bold;">Faol ✓</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">3</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">Haqiqiy A4 Sahifa</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px;">Hoshiyali varaq, lineyka (ruler) va sahifalar ko'rinishi</td>
            <td style="border: 1px solid #ddd; padding: 8px 12px; text-align: center; color: #2e7d32; font-weight: bold;">Faol ✓</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Xulosa</h2>
      <p>Siz ushbu matnni istalgancha o'zgartirishingiz, yangi sahifa qo'shishingiz yoki yuqoridagi <b>Fayl &rarr; Saqlash</b> tugmasi orqali o'zgartirishlarni to'g'ridan-to'g'ri backend serveriga saqlashingiz mumkin.</p>
    `
  };
  fs.writeFileSync(defaultDocPath, JSON.stringify(initialDoc, null, 2), 'utf-8');
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Read body helper
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // 25MB max size limit for document with embedded images
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ---------------- API ROUTES ----------------

  // GET /api/documents - list all documents
  if (pathname === '/api/documents' && method === 'GET') {
    try {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
      const docs = files.map(file => {
        try {
          const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
          const doc = JSON.parse(raw);
          return {
            id: doc.id,
            title: doc.title || 'Nomsiz hujjat',
            updatedAt: doc.updatedAt || doc.createdAt,
            createdAt: doc.createdAt,
            wordCount: doc.wordCount || 0
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

      docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return sendJson(res, 200, { success: true, documents: docs });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/documents/:id - get single document
  if (pathname.startsWith('/api/documents/') && method === 'GET') {
    const id = pathname.replace('/api/documents/', '').trim();
    const docPath = path.join(DATA_DIR, `${id}.json`);
    if (!fs.existsSync(docPath)) {
      return sendJson(res, 404, { success: false, error: 'Hujjat topilmadi' });
    }
    try {
      const content = fs.readFileSync(docPath, 'utf-8');
      return sendJson(res, 200, { success: true, document: JSON.parse(content) });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/documents - create new document
  if (pathname === '/api/documents' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const newId = 'doc-' + Date.now();
      const doc = {
        id: newId,
        title: body.title || 'Yangi Hujjat - Word',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: body.settings || {
          orientation: 'portrait',
          pageSize: 'a4',
          margins: 'normal',
          pageColor: '#ffffff',
          watermark: ''
        },
        content: body.content || '<p>Yangi hujjat matnini bu yerga yozing...</p>'
      };

      fs.writeFileSync(path.join(DATA_DIR, `${newId}.json`), JSON.stringify(doc, null, 2), 'utf-8');
      return sendJson(res, 201, { success: true, document: doc });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // PUT /api/documents/:id - update / autosave document
  if (pathname.startsWith('/api/documents/') && method === 'PUT') {
    const id = pathname.replace('/api/documents/', '').trim();
    const docPath = path.join(DATA_DIR, `${id}.json`);
    try {
      const body = await readJsonBody(req);
      let existing = {};
      if (fs.existsSync(docPath)) {
        existing = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
      }

      const updated = {
        ...existing,
        id: id,
        title: body.title !== undefined ? body.title : (existing.title || 'Nomsiz hujjat'),
        content: body.content !== undefined ? body.content : existing.content,
        settings: body.settings !== undefined ? body.settings : existing.settings,
        wordCount: body.wordCount !== undefined ? body.wordCount : existing.wordCount,
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString()
      };

      fs.writeFileSync(docPath, JSON.stringify(updated, null, 2), 'utf-8');
      return sendJson(res, 200, { success: true, document: updated });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // DELETE /api/documents/:id - delete document
  if (pathname.startsWith('/api/documents/') && method === 'DELETE') {
    const id = pathname.replace('/api/documents/', '').trim();
    const docPath = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(docPath)) {
      try {
        fs.unlinkSync(docPath);
        return sendJson(res, 200, { success: true, message: 'Hujjat o\'chirildi' });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    } else {
      return sendJson(res, 404, { success: false, error: 'Hujjat topilmadi' });
    }
  }

  // POST /api/upload - image/file upload endpoint
  if (pathname === '/api/upload' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body.dataUrl || !body.filename) {
        return sendJson(res, 400, { success: false, error: 'dataUrl va filename kerak' });
      }

      const matches = body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return sendJson(res, 400, { success: false, error: 'Noto\'g\'ri rasm formati' });
      }

      const ext = path.extname(body.filename) || '.png';
      const safeFilename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeFilename);
      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(filePath, buffer);

      return sendJson(res, 200, {
        success: true,
        url: `/uploads/${safeFilename}`,
        filename: safeFilename
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ---------------- STATIC FILE SERVING ----------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Fayl topilmadi: ' + pathname);
  }
});

// Start listening
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`   MICROSOFT WORD WEB SERVER IS RUNNING!            `);
  console.log(`   Manzil: http://localhost:${PORT}                 `);
  console.log(`   Hujjatlar papkasi: ${DATA_DIR}                   `);
  console.log(`====================================================`);
});
