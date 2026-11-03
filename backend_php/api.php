<?php
/**
 * MICROSOFT WORD WEB APPLICATION - PHP & MYSQL BACKEND REST API
 * Ushbu fayl barcha REST API so'rovlarni (GET, POST, PUT, DELETE)
 * qabul qiladi va MySQL ma'lumotlar bazasi bilan ishlaydi.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------------- DATABASE CONFIGURATION ----------------
$dbHost = '127.0.0.1';
$dbName = 'word_db';
$dbUser = 'root';
$dbPass = '';

$pdo = null;
try {
    // 1-urinish: MySQL
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    // MySQL ulanmasa, SQLite zaxira bazasini yaratadi
    $sqlitePath = __DIR__ . '/word_database.sqlite';
    $pdo = new PDO("sqlite:$sqlitePath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Jadval yaratish
    $pdo->exec("CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        settings TEXT,
        word_count INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
    )");
}

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
$requestUri = explode('/', trim($pathInfo, '/'));
$action = $requestUri[0] ?? '';
$id = $requestUri[1] ?? null;

// JSON body helper
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true) ?: [];

// ---------------- ROUTES ----------------

// 1. GET /api.php/documents - Ro'yxat
if ($action === 'documents' && $method === 'GET' && !$id) {
    $stmt = $pdo->query("SELECT id, title, word_count as wordCount, created_at as createdAt, updated_at as updatedAt FROM documents ORDER BY updated_at DESC");
    $docs = $stmt->fetchAll();
    echo json_encode(['success' => true, 'documents' => $docs], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. GET /api.php/documents/:id - Bitta hujjat
if ($action === 'documents' && $method === 'GET' && $id) {
    $stmt = $pdo->prepare("SELECT * FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();
    if ($doc) {
        $doc['settings'] = json_decode($doc['settings'] ?? '{}', true);
        $doc['wordCount'] = (int)($doc['word_count'] ?? 0);
        $doc['createdAt'] = $doc['created_at'];
        $doc['updatedAt'] = $doc['updated_at'];
        echo json_encode(['success' => true, 'document' => $doc], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Hujjat topilmadi'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 3. POST /api.php/documents - Yangi yaratish
if ($action === 'documents' && $method === 'POST') {
    $newId = 'doc-' . round(microtime(true) * 1000);
    $title = $data['title'] ?? 'Yangi Hujjat';
    $content = $data['content'] ?? '<p><br></p>';
    $settings = json_encode($data['settings'] ?? []);
    $now = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("INSERT INTO documents (id, title, content, settings, word_count, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)");
    $stmt->execute([$newId, $title, $content, $settings, $now, $now]);

    http_response_code(201);
    echo json_encode(['success' => true, 'document' => [
        'id' => $newId,
        'title' => $title,
        'content' => $content,
        'createdAt' => $now,
        'updatedAt' => $now
    ]], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. PUT /api.php/documents/:id - Saqlash / Autosave
if ($action === 'documents' && $method === 'PUT' && $id) {
    $title = $data['title'] ?? null;
    $content = $data['content'] ?? null;
    $settings = isset($data['settings']) ? json_encode($data['settings']) : null;
    $wordCount = $data['wordCount'] ?? 0;
    $now = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("UPDATE documents SET 
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        settings = COALESCE(?, settings),
        word_count = ?,
        updated_at = ?
        WHERE id = ?");
    $stmt->execute([$title, $content, $settings, $wordCount, $now, $id]);

    echo json_encode(['success' => true, 'updatedAt' => $now], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. DELETE /api.php/documents/:id - O'chirish
if ($action === 'documents' && $method === 'DELETE' && $id) {
    $stmt = $pdo->prepare("DELETE FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true, 'message' => "Hujjat o'chirildi"], JSON_UNESCAPED_UNICODE);
    exit;
}

// 6. POST /api.php/upload - Rasm yuklash
if ($action === 'upload' && $method === 'POST') {
    $dataUrl = $data['dataUrl'] ?? '';
    $filename = $data['filename'] ?? 'image.png';

    if (preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $type)) {
        $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $decoded = base64_decode($base64);

        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $safeName = 'img_' . time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '', $filename);
        file_put_contents($uploadDir . $safeName, $decoded);

        echo json_encode(['success' => true, 'url' => '/uploads/' . $safeName], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Noto\'g\'ri rasm formati'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Default fallback
echo json_encode(['status' => 'online', 'service' => 'Microsoft Word PHP Backend', 'version' => '1.0']);
