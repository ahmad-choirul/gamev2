<?php
/**
 * Clash of Birthday - Multi-User Persistent Session & Storage Endpoint
 * Menyimpan status permainan masing-masing user ke dalam $_SESSION, Cookies (30 hari), dan game_save.json multi-user
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

// Ambil username dari Cookie, GET parameter, atau POST JSON
$username = '';
if (!empty($_COOKIE['cob_username'])) {
    $username = trim($_COOKIE['cob_username']);
}
if (empty($username) && !empty($_GET['username'])) {
    $username = trim($_GET['username']);
}

// Helper: Membaca file database multi-user
function getAllUsersData($file) {
    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $json = json_decode($raw, true);
        if (is_array($json)) {
            // Jika format lama (single object tanpa key user), konversi ke struktur multi-user
            if (isset($json['completedGames']) && !isset($json['users'])) {
                return [
                    'users' => [
                        'default' => $json
                    ]
                ];
            }
            if (isset($json['users'])) {
                return $json;
            }
        }
    }
    return ['users' => []];
}

// Helper: Menyimpan file database multi-user
function saveAllUsersData($file, $allData) {
    file_put_contents($file, json_encode($allData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 1. SET USERNAME / LOGIN SESSION
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $req = json_decode($rawInput, true);
    $newUsername = !empty($req['username']) ? trim($req['username']) : '';

    if (empty($newUsername)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Username tidak boleh kosong!'
        ]);
        exit;
    }

    // Set cookie 30 hari
    setcookie('cob_username', $newUsername, time() + (60 * 60 * 24 * 30), '/');
    $_SESSION['cob_username'] = $newUsername;

    // Cek apakah user sudah punya save sebelumnya
    $allData = getAllUsersData($saveFile);
    $userSave = isset($allData['users'][$newUsername]) ? $allData['users'][$newUsername] : null;

    echo json_encode([
        'status' => 'success',
        'username' => $newUsername,
        'has_save' => $userSave !== null,
        'data' => $userSave
    ]);
    exit;
}

// 2. GET CURRENT USER STATE
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    if (empty($username)) {
        echo json_encode([
            'status' => 'no_user',
            'has_save' => false,
            'message' => 'Belum ada user yang login.'
        ]);
        exit;
    }

    $allData = getAllUsersData($saveFile);
    $userSave = isset($allData['users'][$username]) ? $allData['users'][$username] : null;

    echo json_encode([
        'status' => 'success',
        'username' => $username,
        'has_save' => $userSave !== null,
        'data' => $userSave
    ]);
    exit;
}

// 3. LOGOUT / SWITCH USER
if ($action === 'logout') {
    setcookie('cob_username', '', time() - 3600, '/');
    unset($_SESSION['cob_username']);
    echo json_encode([
        'status' => 'success',
        'message' => 'Berhasil logout.'
    ]);
    exit;
}

// 4. RESET CURRENT USER STATE
if ($action === 'reset') {
    if (!empty($username)) {
        $allData = getAllUsersData($saveFile);
        if (isset($allData['users'][$username])) {
            unset($allData['users'][$username]);
            saveAllUsersData($saveFile, $allData);
        }
    }
    echo json_encode([
        'status' => 'success',
        'message' => 'Riwayat progres untuk user ini berhasil di-reset.'
    ]);
    exit;
}

// 5. POST / SAVE USER STATE
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    $targetUser = !empty($data['username']) ? trim($data['username']) : $username;

    if (empty($targetUser)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Username tidak ditemukan.'
        ]);
        exit;
    }

    if ($data !== null) {
        $saveData = [
            'username'       => $targetUser,
            'completedGames' => isset($data['completedGames']) ? array_values(array_unique((array)$data['completedGames'])) : [],
            'gateUnlocked'   => !empty($data['gateUnlocked']),
            'lastUpdated'    => date('Y-m-d H:i:s')
        ];

        // Simpan ke file multi-user
        $allData = getAllUsersData($saveFile);
        $allData['users'][$targetUser] = $saveData;
        saveAllUsersData($saveFile, $allData);

        // Update cookie jika belum ada
        if (empty($_COOKIE['cob_username']) || $_COOKIE['cob_username'] !== $targetUser) {
            setcookie('cob_username', $targetUser, time() + (60 * 60 * 24 * 30), '/');
        }

        echo json_encode([
            'status' => 'success',
            'message' => "Progres untuk {$targetUser} berhasil disimpan.",
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
    'current_user' => $username ?: null,
    'message' => 'Endpoint Persistent Multi-User Clash of Birthday aktif.'
]);
