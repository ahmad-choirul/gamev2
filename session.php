<?php
/**
 * Clash of Champions - Persistent Session & Storage Endpoint
 * Menyimpan status permainan ke dalam $_SESSION dan file persisten game_save.json
 * Sehingga saat browser ditutup & dibuka kembali, progres game yang selesai TIDAK HILANG.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Mulai session PHP dengan cookie lifetime panjang (30 hari)
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_lifetime', 60 * 60 * 24 * 30); // 30 hari
    ini_set('session.gc_maxlifetime', 60 * 60 * 24 * 30);
    session_start();
}

$saveFile = __DIR__ . '/game_save.json';
$action = isset($_GET['action']) ? trim($_GET['action']) : '';

// 1. GET PERSISTENT STATE
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    $data = null;
    if (isset($_SESSION['coc_game_state'])) {
        $data = $_SESSION['coc_game_state'];
    } elseif (file_exists($saveFile)) {
        $raw = file_get_contents($saveFile);
        $data = json_decode($raw, true);
        if ($data) {
            $_SESSION['coc_game_state'] = $data;
        }
    }

    if ($data !== null) {
        echo json_encode([
            'status' => 'success',
            'has_save' => true,
            'data' => $data
        ]);
    } else {
        echo json_encode([
            'status' => 'success',
            'has_save' => false,
            'data' => null
        ]);
    }
    exit;
}

// 2. RESET PERSISTENT STATE
if ($action === 'reset') {
    unset($_SESSION['coc_game_state']);
    if (file_exists($saveFile)) {
        @unlink($saveFile);
    }
    echo json_encode([
        'status' => 'success',
        'message' => 'Seluruh riwayat penyimpanan progres berhasil di-reset.'
    ]);
    exit;
}

// 3. POST / SAVE PERSISTENT STATE
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if ($data !== null) {
        $saveData = [
            'completedGames' => isset($data['completedGames']) ? array_values(array_unique((array)$data['completedGames'])) : [],
            'gateUnlocked'   => !empty($data['gateUnlocked']),
            'lastUpdated'    => date('Y-m-d H:i:s')
        ];

        // Simpan ke PHP Session
        $_SESSION['coc_game_state'] = $saveData;

        // Simpan juga ke file JSON lokal agar tidak hilang saat browser/sesi ditutup
        file_put_contents($saveFile, json_encode($saveData, JSON_PRETTY_PRINT));

        echo json_encode([
            'status' => 'success',
            'message' => 'Status permainan berhasil disimpan secara permanen.',
            'data' => $saveData
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Format JSON tidak valid.'
        ]);
    }
    exit;
}

// Default response
echo json_encode([
    'status' => 'active',
    'session_id' => session_id(),
    'message' => 'Endpoint Persistent Session Clash of Champions aktif.'
]);
