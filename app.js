/**
 * Clash of Champions - Single Player Brain Arena
 * Advanced Master-Level Game Engine & Logic
 * 
 * Rules:
 * 1. Tahap 1: Gerbang Matematika Cepat (10 soal 2-digit beruntun, 8 detik/soal, salah/timeout -> reset ke Soal #1, bypass cheat 'pintu').
 * 2. Tahap 2: 10 Mini-Games Arena (Tiap jenis game berisi 10 soal acak Master-Level, 10 detik/soal, jika salah/timeout -> reset ke Soal #1 untuk game tersebut).
 * 3. Tahap 3: Victory Screen (Unduh Sertifikat Gelar Otak Emas PNG beresolusi tinggi).
 */

// --- SOUND SYNTHESIZER (Web Audio API) ---
class SoundController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
        if (!this.enabled) return;
        try {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    click() {
        this.playTone(600, 'triangle', 0.06, 0.08);
    }

    correct() {
        if (!this.enabled) return;
        this.playTone(523.25, 'sine', 0.12, 0.12);
        setTimeout(() => this.playTone(659.25, 'sine', 0.12, 0.12), 70);
        setTimeout(() => this.playTone(783.99, 'sine', 0.22, 0.15), 140);
    }

    wrong() {
        if (!this.enabled) return;
        this.playTone(280, 'sawtooth', 0.2, 0.15);
        setTimeout(() => this.playTone(180, 'sawtooth', 0.35, 0.15), 100);
    }

    victory() {
        if (!this.enabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        const times = [0, 120, 240, 360, 500, 650];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.35, 0.2), times[idx]);
        });
    }
}

const Sound = new SoundController();

// --- CANVAS CONFETTI SYSTEM ---
class ConfettiEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.particles = [];
        this.animId = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    burst(count = 90) {
        if (!this.canvas || !this.ctx) return;
        const colors = ['#06b6d4', '#f59e0b', '#10b981', '#fbbf24', '#38bdf8', '#ffffff'];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight * 0.4,
                w: Math.random() * 8 + 4,
                h: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.8) * 14,
                gravity: 0.35,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }
        if (!this.animId) this.animate();
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.rotSpeed;
            p.opacity -= 0.008;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.opacity);
            this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            this.ctx.restore();

            if (p.opacity <= 0 || p.y > window.innerHeight + 20) {
                this.particles.splice(i, 1);
            }
        }
        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.animate());
        } else {
            this.animId = null;
        }
    }
}

let Confetti;

// --- 10 MINI-GAMES CONFIG ---
const MINI_GAMES_CONFIG = [
    {
        id: 'memory-madness',
        num: 1,
        title: 'Memory Madness',
        category: 'Visual Recall 16-Tile Matrix',
        icon: 'fa-brain',
        desc: 'Hafalkan posisi 16 simbol visual, lalu tebak lokasi atau isi koordinat dengan tepat!',
        render: renderMemoryMadness
    },
    {
        id: 'blind-shuffle',
        num: 2,
        title: 'Blind Shuffle',
        category: '5-Cup High-Velocity Shuffle',
        icon: 'fa-arrows-split-up-and-left',
        desc: 'Lacak 5 cangkir yang bergerak acak dan temukan letak cangkir yang menyimpan bola emas!',
        render: renderBlindShuffle
    },
    {
        id: 'pattern-memory-grid',
        num: 3,
        title: 'Pattern Memory Grid',
        category: '4-Step Spatial Light Sequence',
        icon: 'fa-table-cells',
        desc: 'Hafalkan urutan 4 ubin kilat yang menyala berurutan dan ulangi dengan presisi!',
        render: renderPatternMemory
    },
    {
        id: 'extreme-cryptarithm',
        num: 4,
        title: 'Cryptarithm Simbol',
        category: 'Penjumlahan Simbol Bergambar',
        icon: 'fa-shapes',
        desc: 'Tentukan nilai masing-masing simbol dari persamaan penjumlahan, lalu hitung jumlahnya!',
        render: renderExtremeCryptarithm
    },
    {
        id: 'number-chain-math',
        num: 5,
        title: 'Number Chain Math',
        category: '5-Number 4-Operator Pipeline',
        icon: 'fa-link',
        desc: 'Susun 4 operator (+, -, ×) di antara 5 angka untuk mencapai angka target yang ditentukan!',
        render: renderNumberChain
    },
    {
        id: 'math-grid-matrix',
        num: 6,
        title: 'Math Grid Matrix',
        category: 'Signed Integer Target Matrix',
        icon: 'fa-border-all',
        desc: 'Pilih kombinasi angka positif & negatif pada grid 3x3 yang tepat sama dengan angka target!',
        render: renderMathGridMatrix
    },
    {
        id: 'spatial-3d-rotation',
        num: 7,
        title: 'Spatial 3D Rotation',
        category: 'Multi-Axis 45° & Double Flip',
        icon: 'fa-cube',
        desc: 'Putar sudut 45° dan gunakan kombinasi Flip X / Flip Y untuk mencocokkan siluet target!',
        render: renderSpatialRotation
    },
    {
        id: 'hexagon-strategy',
        num: 8,
        title: 'Hexagon Strategy Board',
        category: '19-Cell Tactical Intercept Puzzle',
        icon: 'fa-draw-polygon',
        desc: 'Temukan 1 titik simpul heksagon kunci untuk memotong jalur ancaman AI pada papan 19 sel!',
        render: renderHexagonStrategy
    },
    {
        id: 'deduction-logic-grid',
        num: 9,
        title: 'Deduction Logic Grid',
        category: 'Procedural Einstein Logic Grid',
        icon: 'fa-clipboard-question',
        desc: 'Analisis petunjuk deduksi majemuk untuk menentukan universitas & medali 3 juara Clash of Champions!',
        render: renderDeductionGrid
    },
    {
        id: 'card-elimination',
        num: 10,
        title: 'Card Elimination Deduction',
        category: '4-Clue Modular Elimination (1-100)',
        icon: 'fa-dice-d20',
        desc: 'Deduksikan angka rahasia (1-100) berdasarkan 4 petunjuk modulo, paritas, dan sifat angka!',
        render: renderCardElimination
    }
];

// --- APP STATE ---
const GameState = {
    view: 'gate',
    activeGameId: null,
    completedGames: new Set(),
    
    // Tahap 1: Gate state (8s per question, 10 consecutive)
    gateStreak: 0,
    gateTargetStreak: 10,
    currentGateProblem: null,
    gateTimeLimit: 8.0,
    gateTimeRemaining: 8.0,
    gateTimerInterval: null,

    // Tahap 2: Mini-Game Arena state (10s per question, 10 consecutive rounds per game)
    miniGameRound: 1,
    miniGameTargetRounds: 10,
    miniGameTimeLimit: 10.0,
    miniGameTimeRemaining: 10.0,
    miniGameTimerInterval: null,

    storageKey: 'coc_gamev2_session_state'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    Confetti = new ConfettiEngine('confetti-canvas');
    loadSavedSession();
    setupGlobalEvents();
    renderStreakDots();
});

// --- PERSISTENT SESSION & STORAGE MANAGEMENT ---
function loadSavedSession() {
    // 1. Coba baca dari localStorage browser terlebih dahulu (instan saat buka browser baru)
    try {
        const rawLocal = localStorage.getItem(GameState.storageKey) || sessionStorage.getItem(GameState.storageKey);
        if (rawLocal) {
            const data = JSON.parse(rawLocal);
            applySessionData(data);
        }
    } catch (e) {
        console.warn('Could not read localStorage:', e);
    }

    // 2. Sinkronisasi dengan PHP Session & file persisten backend (jika via server PHP/XAMPP)
    fetch('session.php?action=get')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success' && res.has_save && res.data) {
                applySessionData(res.data);
            }
        })
        .catch(() => {
            console.log('Running in client-side persistence mode.');
        });
}

function applySessionData(data) {
    if (!data) return;
    if (data.completedGames && Array.isArray(data.completedGames)) {
        GameState.completedGames = new Set(data.completedGames);
    }
    if (data.gateUnlocked) {
        GameState.gateStreak = 10;
        switchView('dashboard');
        renderDashboard();
    }
}

function saveState() {
    const payload = {
        completedGames: Array.from(GameState.completedGames),
        gateUnlocked: GameState.gateStreak >= 10
    };

    // 1. Simpan permanen ke localStorage & sessionStorage browser
    try {
        localStorage.setItem(GameState.storageKey, JSON.stringify(payload));
        sessionStorage.setItem(GameState.storageKey, JSON.stringify(payload));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }

    // 2. Simpan permanen ke backend PHP Session & file game_save.json
    try {
        fetch('session.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
    } catch (e) {}
}

function setupGlobalEvents() {
    const soundBtn = document.getElementById('sound-toggle-btn');
    soundBtn.addEventListener('click', () => {
        Sound.enabled = !Sound.enabled;
        soundBtn.innerHTML = Sound.enabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        soundBtn.style.color = Sound.enabled ? 'var(--color-cyan)' : 'var(--text-muted)';
        if (Sound.enabled) Sound.click();
    });

    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
        Sound.click();
        stopMiniGameTimer();
        switchView('dashboard');
        renderDashboard();
    });

    const gateStartBtn = document.getElementById('gate-start-btn');
    if (gateStartBtn) {
        gateStartBtn.addEventListener('click', () => {
            Sound.click();
            document.getElementById('gate-start-card').style.display = 'none';
            document.getElementById('gate-active-content').style.display = 'block';
            GameState.gateStreak = 0;
            renderStreakDots();
            generateGateProblem();
        });
    }

    document.getElementById('gate-form').addEventListener('submit', (e) => {
        e.preventDefault();
        checkGateAnswer();
    });

    document.querySelectorAll('.np-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            Sound.click();
            const key = btn.getAttribute('data-key');
            const input = document.getElementById('gate-input');
            if (key === 'clear') {
                input.value = '';
            } else if (key === 'back') {
                input.value = input.value.slice(0, -1);
            } else {
                input.value += key;
            }
            input.focus();
        });
    });

    document.getElementById('modal-btn-ok').addEventListener('click', () => {
        Sound.click();
        closeModal();
    });

    document.getElementById('btn-download-cert').addEventListener('click', () => {
        Sound.click();
        downloadCertificatePNG();
    });

    document.getElementById('btn-restart-all').addEventListener('click', () => {
        Sound.click();
        showConfirmModal('Ulangi Semua Tantangan?', 'Apakah kamu yakin ingin me-reset seluruh riwayat progres permainan dari awal?', () => {
            stopQuestionTimer();
            stopMiniGameTimer();
            localStorage.removeItem(GameState.storageKey);
            sessionStorage.removeItem(GameState.storageKey);
            fetch('session.php?action=reset').catch(() => {});
            GameState.completedGames.clear();
            GameState.gateStreak = 0;
            const gateStartCard = document.getElementById('gate-start-card');
            const gateActiveContent = document.getElementById('gate-active-content');
            if (gateStartCard) gateStartCard.style.display = 'block';
            if (gateActiveContent) gateActiveContent.style.display = 'none';
            switchView('gate');
            renderStreakDots();
        });
    });

    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = today.toLocaleDateString('id-ID', options);
    const certDateElem = document.getElementById('cert-date-text');
    if (certDateElem) certDateElem.textContent = dateStr;
}

// --- VIEW NAVIGATION ---
function switchView(viewName) {
    GameState.view = viewName;
    if (viewName !== 'gate') {
        stopQuestionTimer();
    }
    if (viewName !== 'arena') {
        stopMiniGameTimer();
    }
    document.querySelectorAll('.game-view').forEach(view => {
        view.classList.remove('active');
    });

    let targetView;
    if (viewName === 'gate') targetView = document.getElementById('view-math-gate');
    else if (viewName === 'dashboard') targetView = document.getElementById('view-dashboard');
    else if (viewName === 'arena') targetView = document.getElementById('view-game-arena');
    else if (viewName === 'victory') targetView = document.getElementById('view-victory');

    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- MODAL DIALOG HELPER ---
function showModal(title, body, iconClass = 'fa-solid fa-circle-check', isSuccess = true) {
    const modal = document.getElementById('game-modal');
    const titleElem = document.getElementById('modal-title');
    const bodyElem = document.getElementById('modal-body');
    const iconElem = document.getElementById('modal-icon');
    const actionsElem = document.getElementById('modal-actions');

    titleElem.textContent = title;
    bodyElem.innerHTML = body;
    iconElem.innerHTML = `<i class="${iconClass}"></i>`;
    iconElem.style.color = isSuccess ? 'var(--color-emerald)' : 'var(--color-crimson)';

    actionsElem.innerHTML = `<button id="modal-btn-ok" class="btn-action primary">OK</button>`;
    document.getElementById('modal-btn-ok').onclick = () => {
        Sound.click();
        closeModal();
    };

    modal.classList.remove('hidden');
}

function showConfirmModal(title, body, onConfirm) {
    const modal = document.getElementById('game-modal');
    const titleElem = document.getElementById('modal-title');
    const bodyElem = document.getElementById('modal-body');
    const iconElem = document.getElementById('modal-icon');
    const actionsElem = document.getElementById('modal-actions');

    titleElem.textContent = title;
    bodyElem.innerHTML = body;
    iconElem.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
    iconElem.style.color = 'var(--color-gold)';

    actionsElem.innerHTML = `
        <button id="modal-btn-cancel" class="btn-action secondary">Batal</button>
        <button id="modal-btn-confirm" class="btn-action danger">Ya, Lanjutkan</button>
    `;

    document.getElementById('modal-btn-cancel').onclick = () => {
        Sound.click();
        closeModal();
    };
    document.getElementById('modal-btn-confirm').onclick = () => {
        Sound.click();
        closeModal();
        if (onConfirm) onConfirm();
    };

    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('game-modal');
    modal.classList.add('hidden');
}

// ==========================================================
// TAHAP 1: GERBANG MATEMATIKA CEPAT (8 DETIK PER SOAL)
// ==========================================================
function startQuestionTimer() {
    stopQuestionTimer();
    GameState.gateTimeRemaining = GameState.gateTimeLimit; // 8.0s

    const timerElem = document.getElementById('gate-timer');
    const timerBadge = document.getElementById('gate-timer-badge');
    const fillElem = document.getElementById('gate-countdown-fill');

    function renderTimerUI() {
        if (timerElem) timerElem.textContent = `${GameState.gateTimeRemaining.toFixed(1)}s`;
        if (fillElem) {
            const pct = Math.max(0, (GameState.gateTimeRemaining / GameState.gateTimeLimit) * 100);
            fillElem.style.width = `${pct}%`;
        }

        if (GameState.gateTimeRemaining <= 3.0) {
            if (timerBadge) timerBadge.classList.add('urgent');
            if (fillElem) fillElem.classList.add('urgent');
        } else {
            if (timerBadge) timerBadge.classList.remove('urgent');
            if (fillElem) fillElem.classList.remove('urgent');
        }
    }

    renderTimerUI();

    const intervalStep = 100;
    GameState.gateTimerInterval = setInterval(() => {
        GameState.gateTimeRemaining = Math.max(0, GameState.gateTimeRemaining - 0.1);
        renderTimerUI();

        if (GameState.gateTimeRemaining <= 0) {
            stopQuestionTimer();
            handleGateTimeout();
        }
    }, intervalStep);
}

function stopQuestionTimer() {
    if (GameState.gateTimerInterval) {
        clearInterval(GameState.gateTimerInterval);
        GameState.gateTimerInterval = null;
    }
}

function handleGateTimeout() {
    Sound.wrong();
    const problemBox = document.getElementById('gate-problem-box');
    problemBox.classList.remove('shake-anim');
    void problemBox.offsetWidth;
    problemBox.classList.add('shake-anim');

    GameState.gateStreak = 0;
    renderStreakDots();

    showGateFeedback(
        `Waktu 8 Detik Habis! (Jawaban: ${GameState.currentGateProblem.answer}). Progres di-reset kembali ke Soal #1!`,
        'error'
    );

    setTimeout(() => {
        if (GameState.view === 'gate') {
            generateGateProblem();
        }
    }, 1000);
}

function renderStreakDots() {
    const container = document.getElementById('streak-dots');
    container.innerHTML = '';
    for (let i = 0; i < GameState.gateTargetStreak; i++) {
        const dot = document.createElement('div');
        dot.className = 'streak-dot';
        if (i < GameState.gateStreak) {
            dot.classList.add('completed');
        } else if (i === GameState.gateStreak) {
            dot.classList.add('current');
        }
        container.appendChild(dot);
    }
    const streakCountElem = document.getElementById('gate-streak-count');
    streakCountElem.textContent = `${GameState.gateStreak} / ${GameState.gateTargetStreak} Soal`;
    const qNumElem = document.getElementById('gate-q-number');
    qNumElem.textContent = `Soal #${GameState.gateStreak + 1}`;
}

function generateGateProblem() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1, num2, answer;

    if (op === '+') {
        num1 = Math.floor(Math.random() * 80) + 15;
        num2 = Math.floor(Math.random() * 80) + 12;
        answer = num1 + num2;
    } else if (op === '-') {
        num1 = Math.floor(Math.random() * 70) + 30;
        num2 = Math.floor(Math.random() * (num1 - 10)) + 10;
        answer = num1 - num2;
    } else {
        num1 = Math.floor(Math.random() * 30) + 11;
        num2 = Math.floor(Math.random() * 7) + 3;
        answer = num1 * num2;
    }

    GameState.currentGateProblem = { num1, num2, op, answer };

    document.getElementById('gate-num1').textContent = num1;
    document.getElementById('gate-num2').textContent = num2;
    document.getElementById('gate-op').textContent = op;
    const input = document.getElementById('gate-input');
    input.value = '';
    input.focus();

    startQuestionTimer();
}

function checkGateAnswer() {
    const input = document.getElementById('gate-input');
    const rawVal = input.value.trim();

    if (!rawVal) {
        showGateFeedback('Silakan masukkan angka jawaban!', 'error');
        return;
    }

    // Bypass cheat code 'pintu'
    if (rawVal.toLowerCase() === 'pintu') {
        stopQuestionTimer();
        Sound.victory();
        Confetti.burst(150);
        GameState.gateStreak = 10;
        renderStreakDots();
        saveState();

        showModal(
            'KUNCI PINTU TERBUKA!',
            'Kode sandi <strong>"pintu"</strong> berhasil diaktifkan! Gerbang Matematika Cepat dilewati secara instan. Selamat datang di Dashboard Arena!',
            'fa-solid fa-door-open',
            true
        );

        setTimeout(() => {
            switchView('dashboard');
            renderDashboard();
        }, 1000);
        return;
    }

    const userVal = parseInt(rawVal, 10);
    if (isNaN(userVal)) {
        showGateFeedback('Silakan masukkan angka yang valid!', 'error');
        return;
    }

    stopQuestionTimer();

    if (userVal === GameState.currentGateProblem.answer) {
        Sound.correct();
        GameState.gateStreak++;
        renderStreakDots();

        if (GameState.gateStreak >= GameState.gateTargetStreak) {
            Sound.victory();
            Confetti.burst(100);
            saveState();
            showModal(
                'GERBANG TERBUKA!',
                'Selamat! Kamu berhasil menjawab 10 soal matematika cepat secara berturut-turut dalam batas waktu 8 detik. Dashboard Arena 10 Tantangan telah dibuka!',
                'fa-solid fa-lock-open',
                true
            );
            setTimeout(() => {
                switchView('dashboard');
                renderDashboard();
            }, 1200);
        } else {
            showGateFeedback(`Benar! Lanjut ke Soal #${GameState.gateStreak + 1}`, 'success');
            generateGateProblem();
        }
    } else {
        Sound.wrong();
        const problemBox = document.getElementById('gate-problem-box');
        problemBox.classList.remove('shake-anim');
        void problemBox.offsetWidth;
        problemBox.classList.add('shake-anim');

        GameState.gateStreak = 0;
        renderStreakDots();
        showGateFeedback(
            `Jawaban Salah! (Jawaban yang benar: ${GameState.currentGateProblem.answer}). Progres kamu di-reset kembali ke Soal #1!`,
            'error'
        );
        setTimeout(() => {
            if (GameState.view === 'gate') {
                generateGateProblem();
            }
        }, 1000);
    }
}

function showGateFeedback(msg, type) {
    const feedback = document.getElementById('gate-feedback');
    feedback.textContent = msg;
    feedback.className = `gate-feedback ${type}`;
    feedback.classList.remove('hidden');
}

// ==========================================================
// TAHAP 2: DASHBOARD GAME
// ==========================================================
function renderDashboard() {
    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';

    const completedCount = GameState.completedGames.size;
    document.getElementById('dash-progress-text').textContent = `${completedCount} / 10 Selesai`;
    const percentage = (completedCount / 10) * 100;
    document.getElementById('dash-progress-fill').style.width = `${percentage}%`;

    if (completedCount === 10) {
        setTimeout(() => {
            triggerGrandVictory();
        }, 600);
    }

    MINI_GAMES_CONFIG.forEach(game => {
        const isCompleted = GameState.completedGames.has(game.id);
        const card = document.createElement('div');
        card.className = `game-card ${isCompleted ? 'locked' : ''}`;

        card.innerHTML = `
            <div class="card-top">
                <div class="card-icon-box">
                    <i class="fa-solid ${isCompleted ? 'fa-circle-check' : game.icon}"></i>
                </div>
                <div class="card-status-badge ${isCompleted ? 'completed' : 'available'}">
                    ${isCompleted ? '<i class="fa-solid fa-check"></i> SELESAI' : 'TERSEDIA'}
                </div>
            </div>
            <div>
                <div class="card-num">TANTANGAN #${game.num}</div>
                <h3 class="card-title">${game.title}</h3>
                <div class="card-category"><i class="fa-solid fa-tag"></i> ${game.category}</div>
                <p class="card-desc">${game.desc}</p>
            </div>
            <button class="card-btn-play ${isCompleted ? 'locked-btn' : 'active-btn'}" data-game-id="${game.id}">
                ${isCompleted ? '<i class="fa-solid fa-lock"></i> Terkunci (Selesai)' : '<i class="fa-solid fa-play"></i> Mainkan (10 Soal)'}
            </button>
        `;

        const playBtn = card.querySelector('.card-btn-play');
        playBtn.addEventListener('click', () => {
            if (isCompleted) {
                Sound.playTone(400, 'sine', 0.1);
                showModal('Sudah Selesai', 'Game ini telah berhasil kamu selesaikan dan terkunci. Pilih game lain yang belum selesai!', 'fa-solid fa-check-double', true);
            } else {
                Sound.click();
                launchMiniGame(game);
            }
        });

        grid.appendChild(card);
    });
}

// ==========================================================
// ARENA ROUND & 10-SECOND TIMER MANAGER
// ==========================================================
function launchMiniGame(game) {
    GameState.activeGameId = game.id;
    GameState.miniGameRound = 1;
    document.getElementById('arena-game-name').textContent = `${game.num}. ${game.title}`;
    switchView('arena');
    renderMiniGameTracker();
    renderCurrentMiniGameRound();
}

function renderMiniGameTracker() {
    const roundText = document.getElementById('arena-round-text');
    roundText.textContent = `Soal ${GameState.miniGameRound} / ${GameState.miniGameTargetRounds}`;

    const dotsContainer = document.getElementById('arena-streak-dots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < GameState.miniGameTargetRounds; i++) {
        const dot = document.createElement('div');
        dot.className = 'arena-dot';
        if (i < GameState.miniGameRound - 1) {
            dot.classList.add('completed');
        } else if (i === GameState.miniGameRound - 1) {
            dot.classList.add('current');
        }
        dotsContainer.appendChild(dot);
    }
}

function startMiniGameTimer() {
    stopMiniGameTimer();
    // Mode Edukasi: Waktu menjawab santai & unlimited (tanpa batas waktu)
}

function stopMiniGameTimer() {
    if (GameState.miniGameTimerInterval) {
        clearInterval(GameState.miniGameTimerInterval);
        GameState.miniGameTimerInterval = null;
    }
}

function handleMiniGameSuccess() {
    stopMiniGameTimer();
    Sound.correct();

    if (GameState.miniGameRound >= GameState.miniGameTargetRounds) {
        completeActiveGame();
    } else {
        GameState.miniGameRound++;
        renderMiniGameTracker();
        renderCurrentMiniGameRound();
    }
}

function handleMiniGameFailure(reason = 'Jawaban Salah! Progres game ini di-reset kembali ke Soal #1!') {
    stopMiniGameTimer();
    Sound.wrong();

    const board = document.getElementById('game-board-container');
    board.classList.remove('shake-anim');
    void board.offsetWidth;
    board.classList.add('shake-anim');

    GameState.miniGameRound = 1; // Strict reset to Question 1
    renderMiniGameTracker();

    showModal('GAGAL DI ARENA', reason, 'fa-solid fa-circle-xmark', false);

    setTimeout(() => {
        if (GameState.view === 'arena') {
            renderCurrentMiniGameRound();
        }
    }, 1200);
}

function renderCurrentMiniGameRound() {
    const game = MINI_GAMES_CONFIG.find(g => g.id === GameState.activeGameId);
    if (!game) return;
    const container = document.getElementById('game-board-container');
    container.innerHTML = '';
    game.render(container);
}

function completeActiveGame() {
    if (!GameState.activeGameId) return;
    GameState.completedGames.add(GameState.activeGameId);
    saveState();
    Sound.victory();
    Confetti.burst(120);

    const game = MINI_GAMES_CONFIG.find(g => g.id === GameState.activeGameId);
    showModal(
        'KEMENANGAN SEMPURNA (10/10)!',
        `Luar biasa! Kamu berhasil menuntaskan seluruh <strong>10 Soal Acak Tingkat Tinggi</strong> pada game <strong>${game.title}</strong>. Kartu tantangan ini resmi DIKUNCI!`,
        'fa-solid fa-trophy',
        true
    );

    setTimeout(() => {
        switchView('dashboard');
        renderDashboard();
    }, 1500);
}

// ==========================================================
// MINI GAME 1: MEMORY MADNESS (CLUE AWAL -> TOMBOL MULAI -> 2.5s HAFALAN -> 10s TEBAK)
// ==========================================================
function renderMemoryMadness(container) {
    stopMiniGameTimer();

    const iconPool = ['🧠', '⚡', '🏆', '💎', '🚀', '🎯', '🔮', '🔑', '⭐', '🧬', '🔥', '🛡️', '👑', '🪐', '💡', '⚓', '⚛️', '🎲', '☄️', '🌌'];
    const shuffled = [...iconPool].sort(() => Math.random() - 0.5).slice(0, 16);
    const targetIdx = Math.floor(Math.random() * 16);
    const targetIcon = shuffled[targetIdx];

    const targetRow = Math.floor(targetIdx / 4) + 1;
    const targetCol = (targetIdx % 4) + 1;

    // Randomize between 2 question types:
    // Type A: Locate target icon
    // Type B: Identify icon at (targetRow, targetCol)
    const questionType = Math.random() > 0.5 ? 'locate' : 'identify';

    // 4 options for type B
    const distractorOptions = [targetIcon];
    while (distractorOptions.length < 4) {
        const randI = iconPool[Math.floor(Math.random() * iconPool.length)];
        if (!distractorOptions.includes(randI)) distractorOptions.push(randI);
    }
    distractorOptions.sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <!-- 4x4 Grid (Awalnya terbuka penuh untuk dihafal tanpa batas waktu) -->
        <div class="memory-grid-container" id="mm-grid" style="grid-template-columns: repeat(4, 1fr); max-width: 400px; margin: 1rem auto;">
            ${shuffled.map((icon, idx) => `
                <div class="memory-tile revealed" data-idx="${idx}" data-icon="${icon}">
                    <span class="tile-icon" style="display: block;">${icon}</span>
                    <span class="tile-mask" style="display: none; font-family: var(--font-orbitron); font-size: 1.4rem; color: var(--text-muted);">?</span>
                </div>
            `).join('')}
        </div>

        <!-- Tombol Selesai Menghafal (Waktu Unlimited) -->
        <div id="mm-start-wrapper" style="text-align: center; margin: 1.5rem 0;">
            <button id="mm-ready-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2.2rem;">
                <i class="fa-solid fa-check"></i> Selesai Menghafal (Mulai Jawab)
            </button>
        </div>

        <!-- Question Answer Area (Aktif setelah tombol ditekan) -->
        <div id="mm-question-box" style="text-align: center; display: none; margin-top: 1rem;">
            ${questionType === 'locate' ? `
                <h3 style="font-family: var(--font-orbitron); color: var(--color-gold); font-size: 1.1rem; margin-bottom: 0.3rem;">
                    DI MANA POSISI SIMBOL BERIKUT?
                </h3>
                <div style="font-size: 2.8rem; margin-bottom: 0.4rem;">${targetIcon}</div>
                <p style="color: var(--color-cyan); font-size: 0.9rem;">Klik kotak 4x4 di atas yang menyimpan simbol ini!</p>
            ` : `
                <h3 style="font-family: var(--font-orbitron); color: var(--color-gold); font-size: 1.1rem; margin-bottom: 0.3rem;">
                    SIMBOL APA YANG BERADA DI BARIS ${targetRow}, KOLOM ${targetCol}?
                </h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; max-width: 380px; margin: 0.75rem auto;">
                    ${distractorOptions.map(opt => `
                        <button class="btn-action secondary mm-choice-btn" data-icon="${opt}" style="font-size: 2rem; padding: 0.5rem;">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            `}
        </div>
    `;

    const readyBtn = document.getElementById('mm-ready-btn');
    const startWrapper = document.getElementById('mm-start-wrapper');
    const questionBox = document.getElementById('mm-question-box');
    const tiles = container.querySelectorAll('.memory-tile');
    let phase = 'memorizing'; // 'memorizing' -> 'answering' -> 'done'

    readyBtn.addEventListener('click', () => {
        Sound.click();
        phase = 'answering';
        startWrapper.style.display = 'none';

        // Tutup semua kartu kembali menjadi '?'
        tiles.forEach(tile => {
            tile.classList.remove('revealed');
            tile.querySelector('.tile-icon').style.display = 'none';
            tile.querySelector('.tile-mask').style.display = 'block';
        });

        questionBox.style.display = 'block';

        // Mulai hitung mundur 10 detik menjawab
        startMiniGameTimer();

        if (questionType === 'locate') {
            tiles.forEach(tile => {
                tile.addEventListener('click', () => {
                    if (phase !== 'answering') return;
                    phase = 'done';
                    const clickedIdx = parseInt(tile.getAttribute('data-idx'), 10);
                    tile.classList.add('revealed');
                    tile.querySelector('.tile-icon').style.display = 'block';
                    tile.querySelector('.tile-mask').style.display = 'none';

                    if (clickedIdx === targetIdx) {
                        tile.classList.add('selected');
                        handleMiniGameSuccess();
                    } else {
                        handleMiniGameFailure(`Posisi salah! Simbol ${targetIcon} sebenarnya ada di Baris ${targetRow}, Kolom ${targetCol}. Progres di-reset ke Soal #1!`);
                    }
                });
            });
        } else {
            container.querySelectorAll('.mm-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (phase !== 'answering') return;
                    phase = 'done';
                    const chosen = btn.getAttribute('data-icon');
                    if (chosen === targetIcon) {
                        handleMiniGameSuccess();
                    } else {
                        handleMiniGameFailure(`Jawaban keliru! Simbol di Baris ${targetRow}, Kolom ${targetCol} adalah ${targetIcon}. Progres di-reset ke Soal #1!`);
                    }
                });
            });
        }
    });
}

// ==========================================================
// MINI GAME 2: BLIND SHUFFLE (5 CANGKIR BERKECEPATAN TINGGI)
// ==========================================================
function renderBlindShuffle(container) {
    stopMiniGameTimer();

    const ballPosition = Math.floor(Math.random() * 5); // 0 to 4

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-arrows-split-up-and-left banner-icon"></i>
            <div class="banner-text">
                <h4>Blind Shuffle (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="bs-status">Perhatikan cangkir yang menyimpan bola emas, lalu tekan tombol <strong>"Tutup & Acak"</strong>!</p>
            </div>
        </div>

        <div class="shuffle-stage" id="bs-stage">
            ${[0, 1, 2, 3, 4].map(idx => `
                <div class="cup-container ${idx === ballPosition ? 'lifted' : ''}" id="cup-${idx}" data-index="${idx}">
                    <div class="cup-icon-box">
                        <i class="fa-solid fa-trophy"></i>
                    </div>
                    ${idx === ballPosition ? '<div class="cup-ball" id="bs-ball"></div>' : ''}
                </div>
            `).join('')}
        </div>

        <div style="text-align: center; margin-top: 1.5rem;" id="bs-btn-wrapper">
            <button id="bs-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Tutup & Acak Cangkir
            </button>
        </div>
    `;

    const cupElems = [
        document.getElementById('cup-0'),
        document.getElementById('cup-1'),
        document.getElementById('cup-2'),
        document.getElementById('cup-3'),
        document.getElementById('cup-4')
    ];

    let canGuess = false;

    document.getElementById('bs-start-btn').addEventListener('click', () => {
        Sound.click();
        document.getElementById('bs-btn-wrapper').style.display = 'none';
        
        // Tutup cangkir (menghilangkan class lifted sehingga bola 100% tersembunyi)
        cupElems.forEach(c => c.classList.remove('lifted'));
        document.getElementById('bs-status').textContent = 'Mengacak posisi cangkir... Perhatikan baik-baik!';

        let currentPos = [0, 1, 2, 3, 4];
        let shuffleCount = 0;
        const totalShuffles = 10;

        const interval = setInterval(() => {
            if (shuffleCount >= totalShuffles || GameState.activeGameId !== 'blind-shuffle') {
                clearInterval(interval);
                canGuess = true;
                document.getElementById('bs-status').textContent = 'PILIH CANGKIR! Di mana bola emas berada? (Batas 10 Detik)';
                startMiniGameTimer();
                return;
            }

            let i = Math.floor(Math.random() * 5);
            let j = (i + 1 + Math.floor(Math.random() * 4)) % 5;

            Sound.playTone(390 + shuffleCount * 25, 'sine', 0.04);

            const cupI = cupElems[currentPos[i]];
            const cupJ = cupElems[currentPos[j]];

            cupI.style.transform = `translateX(${(j - i) * 98}px)`;
            cupJ.style.transform = `translateX(${(i - j) * 98}px)`;

            setTimeout(() => {
                cupI.style.transform = 'none';
                cupJ.style.transform = 'none';
                const temp = currentPos[i];
                currentPos[i] = currentPos[j];
                currentPos[j] = temp;
            }, 600);

            shuffleCount++;
        }, 900);
    });

    cupElems.forEach((cup, idx) => {
        cup.addEventListener('click', () => {
            if (!canGuess) return;
            canGuess = false;
            cup.classList.add('lifted');

            if (idx === ballPosition) {
                handleMiniGameSuccess();
            } else {
                cupElems.forEach(c => c.classList.add('lifted'));
                handleMiniGameFailure(`Tebakan salah! Bola emas tidak berada di cangkir tersebut. Progres di-reset ke Soal #1!`);
            }
        });
    });
}

// ==========================================================
// MINI GAME 3: PATTERN MEMORY GRID (4-STEP - TOMBOL MULAI -> POLA -> 10s TEBAK)
// ==========================================================
function renderPatternMemory(container) {
    stopMiniGameTimer();

    const sequenceLength = 4;
    const pattern = [];
    while (pattern.length < sequenceLength) {
        const r = Math.floor(Math.random() * 16);
        if (pattern.length === 0 || pattern[pattern.length - 1] !== r) {
            pattern.push(r);
        }
    }

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-table-cells banner-icon"></i>
            <div class="banner-text">
                <h4>Pattern Memory (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="pm-status">Siapkan fokusmu, lalu tekan tombol <strong>"Mulai Pola"</strong> untuk melihat 4 ubin yang menyala!</p>
            </div>
        </div>

        <div class="pattern-grid-4x4" id="pm-grid">
            ${Array.from({ length: 16 }, (_, i) => `
                <div class="pattern-tile" data-idx="${i}"></div>
            `).join('')}
        </div>

        <div style="text-align: center; margin-top: 1rem;" id="pm-btn-wrapper">
            <button id="pm-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Pola (4 Langkah)
            </button>
        </div>

        <div style="text-align: center; margin-top: 0.5rem;">
            <span id="pm-step-indicator" class="streak-badge">Siap Dimulai...</span>
        </div>
    `;

    const tiles = container.querySelectorAll('.pattern-tile');
    const startBtn = document.getElementById('pm-start-btn');
    const btnWrapper = document.getElementById('pm-btn-wrapper');
    let userStep = 0;
    let isShowingPattern = false;
    let isGameActive = false;

    function playPattern() {
        isShowingPattern = true;
        document.getElementById('pm-status').innerHTML = '<span class="gold-color"><i class="fa-solid fa-lightbulb"></i> PERHATIKAN URUTAN 4 KOTAK YANG MENYALA!</span>';
        document.getElementById('pm-step-indicator').textContent = 'Memutar Pola...';

        let idx = 0;
        const interval = setInterval(() => {
            if (idx >= pattern.length || GameState.activeGameId !== 'pattern-memory-grid') {
                clearInterval(interval);
                isShowingPattern = false;
                isGameActive = true;
                startMiniGameTimer();
                document.getElementById('pm-status').textContent = `ULANGI URUTAN 4 KOTAK SEKARANG DALAM 10 DETIK!`;
                document.getElementById('pm-step-indicator').textContent = `Langkah: 0 / ${sequenceLength}`;
                return;
            }

            const tileIdx = pattern[idx];
            const tile = tiles[tileIdx];
            Sound.playTone(320 + idx * 90, 'sine', 0.18);
            tile.classList.add('highlight');
            setTimeout(() => {
                tile.classList.remove('highlight');
            }, 200);

            idx++;
        }, 340);
    }

    startBtn.addEventListener('click', () => {
        Sound.click();
        btnWrapper.style.display = 'none';
        playPattern();
    });

    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            if (!isGameActive || isShowingPattern) return;
            const clickedIdx = parseInt(tile.getAttribute('data-idx'), 10);

            if (clickedIdx === pattern[userStep]) {
                Sound.playTone(450 + userStep * 60, 'sine', 0.08);
                tile.classList.add('user-correct');
                setTimeout(() => tile.classList.remove('user-correct'), 180);
                userStep++;
                document.getElementById('pm-step-indicator').textContent = `Langkah: ${userStep} / ${sequenceLength}`;

                if (userStep === sequenceLength) {
                    isGameActive = false;
                    handleMiniGameSuccess();
                }
            } else {
                isGameActive = false;
                tile.classList.add('user-wrong');
                handleMiniGameFailure(`Urutan salah pada langkah ke-${userStep + 1}! Progres di-reset ke Soal #1!`);
            }
        });
    });
}

// ==========================================================
// MINI GAME 4: CRYPTARITHM (PENJUMLAHAN SIMBOL KLASIK)
// ==========================================================
function renderExtremeCryptarithm(container) {
    stopMiniGameTimer();

    // 3 emoji simbol yang jelas & menarik
    const emojiSets = [
        ['🍎', '🍌', '🍇'],
        ['💎', '⭐', '🔥'],
        ['🐱', '🐶', '🐼'],
        ['🚗', '🚀', '🚁'],
        ['🌸', '🍀', '🌻']
    ];
    const selectedSet = emojiSets[Math.floor(Math.random() * emojiSets.length)];
    const [sA, sB, sC] = selectedSet;

    // Nilai integer positif (A: 2-9, B: 1-8, C: 1-7)
    const valA = Math.floor(Math.random() * 8) + 2;
    const valB = Math.floor(Math.random() * 8) + 1;
    const valC = Math.floor(Math.random() * 7) + 1;

    // Sistem persamaan penjumlahan klasik:
    // Baris 1: A + A + A = 3 * A
    // Baris 2: A + B + B = A + 2 * B
    // Baris 3: B + C + C = B + 2 * C
    // Target Pertanyaan: A + B + C = ?
    const eq1 = valA + valA + valA;
    const eq2 = valA + valB + valB;
    const eq3 = valB + valC + valC;
    const targetAns = valA + valB + valC;

    // Buat 4 pilihan jawaban pilihan ganda
    const options = [
        targetAns,
        targetAns + Math.floor(Math.random() * 4) + 1,
        Math.max(1, targetAns - (Math.floor(Math.random() * 3) + 1)),
        targetAns + Math.floor(Math.random() * 5) + 5
    ];
    // Pastikan 4 opsi unik
    const uniqueOptions = Array.from(new Set(options));
    while (uniqueOptions.length < 4) {
        const randOpt = targetAns + Math.floor(Math.random() * 15) - 7;
        if (randOpt > 0 && !uniqueOptions.includes(randOpt)) {
            uniqueOptions.push(randOpt);
        }
    }
    uniqueOptions.sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-shapes banner-icon"></i>
            <div class="banner-text">
                <h4>Cryptarithm Simbol (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="ec-status">Tentukan nilai masing-masing simbol dari penjumlahan di bawah ini, lalu tekan tombol <strong>"Mulai Jawab"</strong>!</p>
            </div>
        </div>

        <div class="crypt-equation-list" style="font-size: 1.35rem; max-width: 440px; margin: 1rem auto; padding: 1.25rem 1.5rem; background: rgba(15, 23, 42, 0.85);">
            <div class="crypt-row" style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <span>${sA} + ${sA} + ${sA}</span>
                <span class="gold-color" style="font-weight: 700;">= ${eq1}</span>
            </div>
            <div class="crypt-row" style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <span>${sA} + ${sB} + ${sB}</span>
                <span class="gold-color" style="font-weight: 700;">= ${eq2}</span>
            </div>
            <div class="crypt-row" style="display: flex; justify-content: space-between; padding: 0.6rem 0;">
                <span>${sB} + ${sC} + ${sC}</span>
                <span class="gold-color" style="font-weight: 700;">= ${eq3}</span>
            </div>
        </div>

        <div class="crypt-target" style="font-size: 1.45rem; text-align: center; margin: 1.25rem 0; font-family: var(--font-orbitron);">
            Berapakah: <strong style="color: var(--color-gold);">${sA} + ${sB} + ${sC}</strong> = <span style="color: var(--color-cyan);">?</span>
        </div>

        <div style="text-align: center; margin: 1.25rem 0;" id="ec-start-wrapper">
            <button id="ec-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Jawab
            </button>
        </div>

        <div id="ec-options-grid" style="display: none; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; max-width: 380px; margin: 1rem auto;">
            ${uniqueOptions.map(opt => `
                <button class="btn-action secondary crypt-opt-btn" data-val="${opt}" style="font-size: 1.4rem; padding: 0.75rem 1rem; font-family: var(--font-orbitron); font-weight: 700;">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;

    const startBtn = document.getElementById('ec-start-btn');
    const startWrap = document.getElementById('ec-start-wrapper');
    const optionsGrid = document.getElementById('ec-options-grid');

    startBtn.addEventListener('click', () => {
        Sound.click();
        startWrap.style.display = 'none';
        optionsGrid.style.display = 'grid';
        document.getElementById('ec-status').textContent = `Pilih hasil dari ${sA} + ${sB} + ${sC}!`;
        startMiniGameTimer();
    });

    container.querySelectorAll('.crypt-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const selected = parseInt(btn.getAttribute('data-val'), 10);
            if (selected === targetAns) {
                handleMiniGameSuccess();
            } else {
                handleMiniGameFailure(`Kalkulasi belum tepat! (${sA}=${valA}, ${sB}=${valB}, ${sC}=${valC} → ${sA} + ${sB} + ${sC} = ${targetAns}). Progres di-reset ke Soal #1!`);
            }
        });
    });
}

// ==========================================================
// MINI GAME 5: NUMBER CHAIN MATH (5 NUMBERS, 4 OPERATORS)
// ==========================================================
function renderNumberChain(container) {
    stopMiniGameTimer();

    const n1 = Math.floor(Math.random() * 12) + 3;
    const n2 = Math.floor(Math.random() * 8) + 2;
    const n3 = Math.floor(Math.random() * 8) + 2;
    const n4 = Math.floor(Math.random() * 7) + 2;
    const n5 = Math.floor(Math.random() * 6) + 2;

    const opList = ['+', '-', '×'];
    const chosen1 = opList[Math.floor(Math.random() * opList.length)];
    const chosen2 = opList[Math.floor(Math.random() * opList.length)];
    const chosen3 = opList[Math.floor(Math.random() * opList.length)];
    const chosen4 = opList[Math.floor(Math.random() * opList.length)];

    function calc5(a, o1, b, o2, c, o3, d, o4, e) {
        let s1 = o1 === '+' ? a + b : o1 === '-' ? a - b : a * b;
        let s2 = o2 === '+' ? s1 + c : o2 === '-' ? s1 - c : s1 * c;
        let s3 = o3 === '+' ? s2 + d : o3 === '-' ? s2 - d : s2 * d;
        let s4 = o4 === '+' ? s3 + e : o4 === '-' ? s3 - e : s3 * e;
        return s4;
    }

    const targetVal = calc5(n1, chosen1, n2, chosen2, n3, chosen3, n4, chosen4, n5);

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-link banner-icon"></i>
            <div class="banner-text">
                <h4>Number Chain (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="nc-status">Perhatikan angka dan target di bawah ini, lalu tekan tombol <strong>"Mulai Susun"</strong>!</p>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 0.75rem;">
            <span class="stage-tag"><i class="fa-solid fa-bullseye"></i> TARGET: ${targetVal}</span>
        </div>

        <div class="chain-board" style="gap: 0.35rem; flex-wrap: wrap;">
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem;">${n1}</div>
            <select id="nc-op1" class="chain-op-select" style="padding: 0.3rem;" disabled><option value="+">+</option><option value="-">-</option><option value="×">×</option></select>
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem;">${n2}</div>
            <select id="nc-op2" class="chain-op-select" style="padding: 0.3rem;" disabled><option value="+">+</option><option value="-">-</option><option value="×">×</option></select>
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem;">${n3}</div>
            <select id="nc-op3" class="chain-op-select" style="padding: 0.3rem;" disabled><option value="+">+</option><option value="-">-</option><option value="×">×</option></select>
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem;">${n4}</div>
            <select id="nc-op4" class="chain-op-select" style="padding: 0.3rem;" disabled><option value="+">+</option><option value="-">-</option><option value="×">×</option></select>
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem;">${n5}</div>
            <div class="chain-num-box" style="width: 50px; height: 50px; font-size: 1.2rem; border-color: var(--color-gold); color: var(--color-gold);">=</div>
            <div class="chain-num-box" id="nc-result" style="width: 70px; height: 50px; font-size: 1.2rem; color: var(--color-cyan);">?</div>
        </div>

        <div style="text-align: center; margin-top: 1.5rem;" id="nc-start-wrapper">
            <button id="nc-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Susun Operator
            </button>
        </div>

        <div style="text-align: center; margin-top: 1.5rem; display: none;" id="nc-submit-wrapper">
            <button id="nc-submit-btn" class="btn-action primary">
                <i class="fa-solid fa-check"></i> Uji Rangkaian
            </button>
        </div>
    `;

    const op1 = document.getElementById('nc-op1');
    const op2 = document.getElementById('nc-op2');
    const op3 = document.getElementById('nc-op3');
    const op4 = document.getElementById('nc-op4');
    const resBox = document.getElementById('nc-result');
    const startBtn = document.getElementById('nc-start-btn');
    const startWrap = document.getElementById('nc-start-wrapper');
    const submitWrap = document.getElementById('nc-submit-wrapper');

    function updatePreview() {
        const val = calc5(n1, op1.value, n2, op2.value, n3, op3.value, n4, op4.value, n5);
        resBox.textContent = val;
    }
    op1.addEventListener('change', updatePreview);
    op2.addEventListener('change', updatePreview);
    op3.addEventListener('change', updatePreview);
    op4.addEventListener('change', updatePreview);

    startBtn.addEventListener('click', () => {
        Sound.click();
        startWrap.style.display = 'none';
        submitWrap.style.display = 'block';
        op1.disabled = false;
        op2.disabled = false;
        op3.disabled = false;
        op4.disabled = false;
        updatePreview();
        document.getElementById('nc-status').textContent = `Susun 4 operator dari kiri ke kanan untuk mencapai target ${targetVal} dalam 10 detik!`;
        startMiniGameTimer();
    });

    document.getElementById('nc-submit-btn').addEventListener('click', () => {
        const curResult = calc5(n1, op1.value, n2, op2.value, n3, op3.value, n4, op4.value, n5);
        if (curResult === targetVal) {
            handleMiniGameSuccess();
        } else {
            handleMiniGameFailure(`Hasil susunanmu (${curResult}) belum sama dengan target ${targetVal}. Progres di-reset ke Soal #1!`);
        }
    });
}

// ==========================================================
// MINI GAME 6: MATH GRID MATRIX (SIGNED INTEGERS)
// ==========================================================
function renderMathGridMatrix(container) {
    stopMiniGameTimer();

    const numbers = [
        Math.floor(Math.random() * 45) + 15,
        -(Math.floor(Math.random() * 35) + 8),
        Math.floor(Math.random() * 50) + 18,
        -(Math.floor(Math.random() * 25) + 6),
        Math.floor(Math.random() * 55) + 20,
        Math.floor(Math.random() * 40) + 10,
        -(Math.floor(Math.random() * 30) + 5),
        Math.floor(Math.random() * 45) + 12,
        -(Math.floor(Math.random() * 20) + 4)
    ];

    const pickCount = Math.random() > 0.5 ? 3 : 4;
    const combo = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, pickCount);
    const targetSum = combo.reduce((acc, idx) => acc + numbers[idx], 0);
    const selectedSet = new Set();
    let isGameActive = false;

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-border-all banner-icon"></i>
            <div class="banner-text">
                <h4>Math Grid Matrix (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="mg-status">Perhatikan angka kisi di bawah ini, lalu tekan tombol <strong>"Mulai Pilih"</strong>!</p>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 0.5rem;">
            <span class="stage-tag"><i class="fa-solid fa-bullseye"></i> TARGET SUM: ${targetSum}</span>
        </div>

        <div class="matrix-3x3" id="matrix-grid">
            ${numbers.map((num, idx) => `
                <div class="matrix-cell" data-idx="${idx}">${num > 0 ? `+${num}` : num}</div>
            `).join('')}
        </div>

        <div class="matrix-sum-display" style="font-size: 1.1rem; margin: 0.5rem 0;">
            Total Terpilih: <strong id="matrix-cur-sum" class="gold-color">0</strong> / <strong>${targetSum}</strong>
        </div>

        <div style="text-align: center; margin-top: 1rem;" id="mg-start-wrapper">
            <button id="mg-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Pilih Angka
            </button>
        </div>

        <div style="text-align: center; margin-top: 1rem; display: none;" id="mg-submit-wrapper">
            <button id="matrix-submit-btn" class="btn-action primary">
                <i class="fa-solid fa-check"></i> Konfirmasi Pilihan
            </button>
        </div>
    `;

    const cells = container.querySelectorAll('.matrix-cell');
    const curSumElem = document.getElementById('matrix-cur-sum');
    const startBtn = document.getElementById('mg-start-btn');
    const startWrap = document.getElementById('mg-start-wrapper');
    const submitWrap = document.getElementById('mg-submit-wrapper');

    startBtn.addEventListener('click', () => {
        Sound.click();
        isGameActive = true;
        startWrap.style.display = 'none';
        submitWrap.style.display = 'block';
        document.getElementById('mg-status').textContent = `Pilih kombinasi angka agar total sama persis dengan ${targetSum} dalam 20 detik!`;
        startMiniGameTimer();
    });

    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            if (!isGameActive) return;
            Sound.click();
            const idx = parseInt(cell.getAttribute('data-idx'), 10);
            if (selectedSet.has(idx)) {
                selectedSet.delete(idx);
                cell.classList.remove('selected');
            } else {
                selectedSet.add(idx);
                cell.classList.add('selected');
            }

            let total = 0;
            selectedSet.forEach(i => total += numbers[i]);
            curSumElem.textContent = total;
        });
    });

    document.getElementById('matrix-submit-btn').addEventListener('click', () => {
        if (!isGameActive) return;
        let total = 0;
        selectedSet.forEach(i => total += numbers[i]);

        if (total === targetSum && selectedSet.size > 0) {
            handleMiniGameSuccess();
        } else {
            handleMiniGameFailure(`Total yang kamu pilih (${total}) tidak sama dengan target ${targetSum}. Progres di-reset ke Soal #1!`);
        }
    });
}

// ==========================================================
// MINI GAME 7: SPATIAL 3D ROTATION (45° STEPS & DOUBLE FLIP)
// ==========================================================
function renderSpatialRotation(container) {
    stopMiniGameTimer();

    const angleList = [45, 90, 135, 180, 225, 270, 315];
    const targetAngle = angleList[Math.floor(Math.random() * angleList.length)];
    const targetFlipX = Math.random() > 0.5;
    const targetFlipY = Math.random() > 0.5;

    let curAngle = 0;
    let curFlipX = false;
    let curFlipY = false;

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-cube banner-icon"></i>
            <div class="banner-text">
                <h4>Spatial Rotation (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="sp-status">Perhatikan siluet target di bawah, lalu tekan tombol <strong>"Mulai Putar"</strong>!</p>
            </div>
        </div>

        <div class="spatial-showcase" style="gap: 2rem;">
            <div class="spatial-box">
                <h5 style="color: var(--color-cyan); margin-bottom: 0.3rem;">Objek Interaktif</h5>
                <div class="spatial-frame">
                    <svg id="sp-active-shape" class="spatial-shape" viewBox="0 0 100 100">
                        <polygon points="50,8 92,72 20,95" fill="#06b6d4" stroke="#67e8f9" stroke-width="3" />
                        <circle cx="50" cy="38" r="10" fill="#f59e0b" />
                        <polygon points="35,60 55,50 65,75" fill="#ffffff" />
                        <rect x="25" y="80" width="12" height="12" fill="#ef4444" />
                    </svg>
                </div>
                <div id="sp-angle-label" style="font-family: var(--font-orbitron); color: var(--text-secondary); font-size: 0.8rem;">0° | Normal</div>
            </div>

            <div class="spatial-box">
                <h5 style="color: var(--color-gold); margin-bottom: 0.3rem;">Siluet Target</h5>
                <div class="spatial-frame target">
                    <svg class="spatial-shape" viewBox="0 0 100 100" style="transform: rotate(${targetAngle}deg) scale(${targetFlipX ? -1 : 1}, ${targetFlipY ? -1 : 1});">
                        <polygon points="50,8 92,72 20,95" fill="#f59e0b" stroke="#fef08a" stroke-width="3" />
                        <circle cx="50" cy="38" r="10" fill="#06b6d4" />
                        <polygon points="35,60 55,50 65,75" fill="#ffffff" />
                        <rect x="25" y="80" width="12" height="12" fill="#10b981" />
                    </svg>
                </div>
                <div style="font-family: var(--font-orbitron); color: var(--color-gold); font-size: 0.8rem;">Target Orientasi</div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 1.25rem;" id="sp-start-wrapper">
            <button id="sp-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Putar Objek
            </button>
        </div>

        <div class="spatial-controls" id="sp-controls" style="gap: 0.5rem; flex-wrap: wrap; display: none; margin-top: 1rem;">
            <button id="sp-left-btn" class="btn-action secondary" style="padding: 0.6rem 1rem;"><i class="fa-solid fa-rotate-left"></i> -45°</button>
            <button id="sp-right-btn" class="btn-action secondary" style="padding: 0.6rem 1rem;"><i class="fa-solid fa-rotate-right"></i> +45°</button>
            <button id="sp-flipx-btn" class="btn-action secondary" style="padding: 0.6rem 1rem;"><i class="fa-solid fa-left-right"></i> Flip X</button>
            <button id="sp-flipy-btn" class="btn-action secondary" style="padding: 0.6rem 1rem;"><i class="fa-solid fa-up-down"></i> Flip Y</button>
            <button id="sp-match-btn" class="btn-action primary" style="padding: 0.6rem 1.25rem;"><i class="fa-solid fa-check"></i> Cocokkan</button>
        </div>
    `;

    const shape = document.getElementById('sp-active-shape');
    const label = document.getElementById('sp-angle-label');
    const startBtn = document.getElementById('sp-start-btn');
    const startWrap = document.getElementById('sp-start-wrapper');
    const controls = document.getElementById('sp-controls');

    function update() {
        shape.style.transform = `rotate(${curAngle}deg) scale(${curFlipX ? -1 : 1}, ${curFlipY ? -1 : 1})`;
        label.textContent = `${curAngle}° | FX:${curFlipX ? '1' : '0'} FY:${curFlipY ? '1' : '0'}`;
    }

    startBtn.addEventListener('click', () => {
        Sound.click();
        startWrap.style.display = 'none';
        controls.style.display = 'flex';
        document.getElementById('sp-status').textContent = 'Putar sudut (45°) dan gunakan kombinasi Flip agar orientasi cocok dalam 10 detik!';
        startMiniGameTimer();
    });

    document.getElementById('sp-right-btn').addEventListener('click', () => {
        Sound.click();
        curAngle = (curAngle + 45) % 360;
        update();
    });
    document.getElementById('sp-left-btn').addEventListener('click', () => {
        Sound.click();
        curAngle = (curAngle - 45 + 360) % 360;
        update();
    });
    document.getElementById('sp-flipx-btn').addEventListener('click', () => {
        Sound.click();
        curFlipX = !curFlipX;
        update();
    });
    document.getElementById('sp-flipy-btn').addEventListener('click', () => {
        Sound.click();
        curFlipY = !curFlipY;
        update();
    });

    document.getElementById('sp-match-btn').addEventListener('click', () => {
        if (curAngle === targetAngle && curFlipX === targetFlipX && curFlipY === targetFlipY) {
            handleMiniGameSuccess();
        } else {
            handleMiniGameFailure(`Orientasi sudut/cermin belum cocok! Progres di-reset ke Soal #1!`);
        }
    });
}

// ==========================================================
// MINI GAME 8: HEXAGON STRATEGY BOARD (19-CELL TACTICAL INTERCEPT)
// ==========================================================
function renderHexagonStrategy(container) {
    stopMiniGameTimer();

    // 19 Hex Layout (Center + 6 Ring 1 + 12 Ring 2)
    const hexLayout = [
        { id: 0, x: 240, y: 150, name: 'Pusat Arena', ring: 0, sector: 'Pusat' },
        // Ring 1 (radius ~50)
        { id: 1, x: 240, y: 100, name: 'Ring 1 Utara', ring: 1, sector: 'Utara' },
        { id: 2, x: 283, y: 125, name: 'Ring 1 Timur Laut', ring: 1, sector: 'Timur' },
        { id: 3, x: 283, y: 175, name: 'Ring 1 Tenggara', ring: 1, sector: 'Timur' },
        { id: 4, x: 240, y: 200, name: 'Ring 1 Selatan', ring: 1, sector: 'Selatan' },
        { id: 5, x: 197, y: 175, name: 'Ring 1 Barat Daya', ring: 1, sector: 'Barat' },
        { id: 6, x: 197, y: 125, name: 'Ring 1 Barat Laut', ring: 1, sector: 'Barat' },
        // Ring 2 (radius ~100)
        { id: 7, x: 240, y: 50, name: 'Ring 2 Puncak Utara', ring: 2, sector: 'Utara' },
        { id: 8, x: 283, y: 75, name: 'Ring 2 Timur Laut Atas', ring: 2, sector: 'Timur' },
        { id: 9, x: 326, y: 100, name: 'Ring 2 Ujung Timur Atas', ring: 2, sector: 'Timur' },
        { id: 10, x: 326, y: 150, name: 'Ring 2 Timur Tengah', ring: 2, sector: 'Timur' },
        { id: 11, x: 326, y: 200, name: 'Ring 2 Tenggara Luar', ring: 2, sector: 'Timur' },
        { id: 12, x: 283, y: 225, name: 'Ring 2 Selatan-Timur', ring: 2, sector: 'Timur' },
        { id: 13, x: 240, y: 250, name: 'Ring 2 Puncak Selatan', ring: 2, sector: 'Selatan' },
        { id: 14, x: 197, y: 225, name: 'Ring 2 Selatan-Barat', ring: 2, sector: 'Barat' },
        { id: 15, x: 154, y: 200, name: 'Ring 2 Barat Daya Luar', ring: 2, sector: 'Barat' },
        { id: 16, x: 154, y: 150, name: 'Ring 2 Barat Tengah', ring: 2, sector: 'Barat' },
        { id: 17, x: 154, y: 100, name: 'Ring 2 Ujung Barat Atas', ring: 2, sector: 'Barat' },
        { id: 18, x: 197, y: 75, name: 'Ring 2 Barat Laut Atas', ring: 2, sector: 'Barat' }
    ];

    // Helper: calculate distance between two hex centers
    function getDistance(c1, c2) {
        const dx = c1.x - c2.x;
        const dy = c1.y - c2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Neighbors in 19-hex grid are ~50px apart
    function getNeighbors(cellId) {
        const source = hexLayout[cellId];
        return hexLayout
            .filter(c => c.id !== cellId && getDistance(source, c) < 60)
            .map(c => c.id);
    }

    // Pick a target cell
    const targetCellId = Math.floor(Math.random() * 19);
    const targetCell = hexLayout[targetCellId];
    const neighbors = getNeighbors(targetCellId);

    // Pick 3 AI threat cells that are adjacent to or surround target, plus 1 decoy
    let aiCells = [...neighbors].sort(() => Math.random() - 0.5).slice(0, 2);
    const otherNonTarget = hexLayout
        .filter(c => c.id !== targetCellId && !aiCells.includes(c.id))
        .map(c => c.id)
        .sort(() => Math.random() - 0.5);

    while (aiCells.length < 4 && otherNonTarget.length > 0) {
        aiCells.push(otherNonTarget.pop());
    }

    function hexPoints(cx, cy, r = 26) {
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return pts.join(' ');
    }

    // Generate tactical clues based on properties without revealing the exact name
    let ringDescription = targetCell.ring === 0 
        ? 'berada tepat di <strong>Pusat Lingkaran Inti (Ring 0)</strong>' 
        : targetCell.ring === 1 
            ? 'berada di <strong>Lingkaran Dalam (Ring 1)</strong>' 
            : 'berada di <strong>Lingkaran Luar (Ring 2)</strong>';

    let sectorDescription = targetCell.ring === 0 
        ? 'menghubungkan seluruh sektor arah' 
        : `menghadap ke <strong>Sektor ${targetCell.sector}</strong>`;

    let canClickHex = false;

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-draw-polygon banner-icon"></i>
            <div class="banner-text">
                <h4>Hexagon Tactical 19-Cell (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="hex-status">Analisis petunjuk taktis di bawah ini, lalu tekan tombol <strong>"Mulai Pilih Simpul"</strong>!</p>
            </div>
        </div>

        <div class="deduction-clues-box" style="margin-bottom: 0.5rem;">
            <h5 style="color: var(--color-gold); margin-bottom: 0.2rem;"><i class="fa-solid fa-radar"></i> PETUNJUK TAKTIS SIMPUL SASARAN:</h5>
            <ul style="font-size: 0.85rem;">
                <li><i class="fa-solid fa-crosshairs gold-color"></i> Posisi Orbit: Simpul kunci ${ringDescription}.</li>
                <li><i class="fa-solid fa-compass gold-color"></i> Orientasi Wilayah: Terletak ${sectorDescription}.</li>
                <li><i class="fa-solid fa-shield-halved gold-color"></i> Status: Merupakan sel kosong (bukan sel merah AI) yang memblokir titik konvergensi!</li>
            </ul>
        </div>

        <div class="hex-board-container" style="max-width: 500px; margin: 0.25rem auto;">
            <svg class="hex-svg" viewBox="130 30 220 240" style="max-height: 260px;">
                ${hexLayout.map(h => `
                    <polygon class="hex-cell ${aiCells.includes(h.id) ? 'ai' : ''}" id="hx-${h.id}" data-id="${h.id}" points="${hexPoints(h.x, h.y)}" />
                `).join('')}
            </svg>
        </div>

        <div style="text-align: center; margin-top: 0.75rem;" id="hex-start-wrapper">
            <button id="hex-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Analisis & Pilih Simpul
            </button>
        </div>

        <div id="hex-prompt-active" style="text-align: center; color: var(--color-cyan); font-weight: 700; font-size: 0.85rem; display: none;">
            <i class="fa-solid fa-hand-pointer"></i> Klik 1 sel heksagon sasaran taktis pada peta 19 sel di atas!
        </div>
    `;

    const startBtn = document.getElementById('hex-start-btn');
    const startWrap = document.getElementById('hex-start-wrapper');
    const promptActive = document.getElementById('hex-prompt-active');

    startBtn.addEventListener('click', () => {
        Sound.click();
        canClickHex = true;
        startWrap.style.display = 'none';
        promptActive.style.display = 'block';
        document.getElementById('hex-status').textContent = 'Temukan 1 simpul heksagon kunci untuk mencegat formasi AI dalam 10 detik!';
        startMiniGameTimer();
    });

    hexLayout.forEach(h => {
        const cell = document.getElementById(`hx-${h.id}`);
        cell.addEventListener('click', () => {
            if (!canClickHex || aiCells.includes(h.id)) return;
            if (h.id === targetCellId) {
                cell.classList.add('player');
                handleMiniGameSuccess();
            } else {
                handleMiniGameFailure(`Titik yang kamu pilih (${h.name}) keliru. Simpul yang memenuhi kriteria taktis adalah ${targetCell.name}. Progres di-reset ke Soal #1!`);
            }
        });
    });
}

// ==========================================================
// MINI GAME 9: DEDUCTION LOGIC GRID (PROCEDURAL EINSTEIN)
// ==========================================================
function renderDeductionGrid(container) {
    stopMiniGameTimer();

    const championPool = ['Maxwell', 'Sandy', 'Shakira', 'Axel', 'Xaviera', 'Kadit'];
    const chosenChampions = [...championPool].sort(() => Math.random() - 0.5).slice(0, 3);

    const uniPool = ['NUS', 'KAIST', 'UI', 'Oxford', 'Harvard', 'SNU'];
    const chosenUnis = [...uniPool].sort(() => Math.random() - 0.5).slice(0, 3);

    const medals = ['Emas', 'Perak', 'Perunggu'];
    const shuffledUnis = [...chosenUnis].sort(() => Math.random() - 0.5);
    const shuffledMedals = [...medals].sort(() => Math.random() - 0.5);

    // Map secret solution
    const solution = {
        [chosenChampions[0]]: { u: shuffledUnis[0], m: shuffledMedals[0] },
        [chosenChampions[1]]: { u: shuffledUnis[1], m: shuffledMedals[1] },
        [chosenChampions[2]]: { u: shuffledUnis[2], m: shuffledMedals[2] }
    };

    // Generate genuine deductive logic clues without leaking direct answers
    const clues = [
        `Juara yang meraih <strong>Medali ${shuffledMedals[0]}</strong> berasal dari <strong>${shuffledUnis[0]}</strong>.`,
        `<strong>${chosenChampions[1]}</strong> BUKAN berasal dari ${shuffledUnis[0]} dan medali yang diraihnya BUKAN ${shuffledMedals[2]}.`,
        `<strong>${chosenChampions[0]}</strong> BUKAN berasal dari ${shuffledUnis[1]} maupun ${shuffledUnis[2]}.`,
        `Peserta dari <strong>${shuffledUnis[2]}</strong> medali yang diraihnya adalah <strong>Medali ${shuffledMedals[2]}</strong>.`
    ];

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-clipboard-question banner-icon"></i>
            <div class="banner-text">
                <h4>Deduction Logic Grid (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="ded-status">Pelajari 4 petunjuk logika di bawah ini, lalu tekan tombol <strong>"Mulai Deduksi"</strong>!</p>
            </div>
        </div>

        <div class="deduction-clues-box">
            <h5 style="color: var(--color-gold); margin-bottom: 0.3rem;"><i class="fa-solid fa-scroll"></i> PETUNJUK LOGIKA DEDUKSI:</h5>
            <ul style="font-size: 0.88rem;">
                ${clues.map((c, i) => `<li><i class="fa-solid fa-circle-arrow-right"></i> ${i + 1}. ${c}</li>`).join('')}
            </ul>
        </div>

        <div style="text-align: center; margin-top: 1.25rem;" id="ded-start-wrapper">
            <button id="ded-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Deduksi
            </button>
        </div>

        <div id="ded-actions-wrapper" style="display: none; margin-top: 1rem;">
            <div class="deduction-pickers" style="gap: 0.6rem;">
                ${chosenChampions.map(name => `
                    <div class="picker-card">
                        <h5>${name}</h5>
                        <select id="ded-${name}-u" class="picker-select">
                            <option value="">Pilih Kampus</option>
                            ${chosenUnis.map(u => `<option value="${u}">${u}</option>`).join('')}
                        </select>
                        <select id="ded-${name}-m" class="picker-select">
                            <option value="">Pilih Medali</option>
                            ${medals.map(m => `<option value="${m}">${m}</option>`).join('')}
                        </select>
                    </div>
                `).join('')}
            </div>

            <div style="text-align: center; margin-top: 1rem;">
                <button id="ded-submit-btn" class="btn-action primary">
                    <i class="fa-solid fa-check"></i> Submit Deduksi
                </button>
            </div>
        </div>
    `;

    const startBtn = document.getElementById('ded-start-btn');
    const startWrap = document.getElementById('ded-start-wrapper');
    const actionsWrap = document.getElementById('ded-actions-wrapper');

    startBtn.addEventListener('click', () => {
        Sound.click();
        startWrap.style.display = 'none';
        actionsWrap.style.display = 'block';
        document.getElementById('ded-status').textContent = 'Analisis 4 petunjuk dan tentukan kampus & medali para juara dalam 10 detik!';
        startMiniGameTimer();
    });

    document.getElementById('ded-submit-btn').addEventListener('click', () => {
        let isCorrect = true;
        chosenChampions.forEach(name => {
            const uVal = document.getElementById(`ded-${name}-u`).value;
            const mVal = document.getElementById(`ded-${name}-m`).value;
            if (uVal !== solution[name].u || mVal !== solution[name].m) {
                isCorrect = false;
            }
        });

        if (isCorrect) {
            handleMiniGameSuccess();
        } else {
            handleMiniGameFailure(`Kombinasi deduksi logika belum tepat! Progres di-reset ke Soal #1!`);
        }
    });
}

// ==========================================================
// MINI GAME 10: CARD ELIMINATION DEDUCTION (1-100 NUMBERS)
// ==========================================================
function renderCardElimination(container) {
    stopMiniGameTimer();

    const secret = Math.floor(Math.random() * 88) + 11; // 11 - 98
    const rangeSpan = Math.floor(Math.random() * 8) + 12; // 12 - 19
    const lower = Math.max(1, secret - Math.floor(rangeSpan / 2));
    const upper = Math.min(100, lower + rangeSpan);

    const isEven = secret % 2 === 0;
    const mod3 = secret % 3;
    const mod5 = secret % 5;
    const digitSum = String(secret).split('').reduce((a, b) => a + parseInt(b, 10), 0);

    container.innerHTML = `
        <div class="game-instruction-banner">
            <i class="fa-solid fa-dice-d20 banner-icon"></i>
            <div class="banner-text">
                <h4>Card Elimination 1-100 (Soal #${GameState.miniGameRound} / 10)</h4>
                <p id="ce-status">Pelajari 4 petunjuk angka rahasia di bawah ini, lalu tekan tombol <strong>"Mulai Tebak"</strong>!</p>
            </div>
        </div>

        <div class="deduction-clues-box" style="margin-bottom: 1rem;">
            <h5 style="color: var(--color-gold); margin-bottom: 0.4rem;"><i class="fa-solid fa-key"></i> 4 PETUNJUK ANGKA RAHASIA:</h5>
            <ul style="font-size: 0.88rem;">
                <li><i class="fa-solid fa-circle-check gold-color"></i> Rentang Nilai: Berada di antara <strong>${lower}</strong> sampai <strong>${upper}</strong>.</li>
                <li><i class="fa-solid fa-circle-check gold-color"></i> Paritas: Merupakan bilangan <strong>${isEven ? 'GENAP' : 'GANJIL'}</strong>.</li>
                <li><i class="fa-solid fa-circle-check gold-color"></i> Modulo: Dibagi 3 bersisa <strong>${mod3}</strong> & dibagi 5 bersisa <strong>${mod5}</strong>.</li>
                <li><i class="fa-solid fa-circle-check gold-color"></i> Digit: Jumlah seluruh digit angka ini adalah <strong>${digitSum}</strong>.</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 1.25rem;" id="ce-start-wrapper">
            <button id="ce-start-btn" class="btn-action primary" style="font-size: 1.1rem; padding: 0.85rem 2rem;">
                <i class="fa-solid fa-play"></i> Mulai Tebak Angka
            </button>
        </div>

        <div id="ce-form-wrapper" style="display: none; max-width: 380px; margin: 0 auto;">
            <div class="math-form">
                <input type="number" id="ce-input" min="1" max="100" placeholder="Ketik angka 1-100...">
                <button id="ce-submit-btn" class="btn-action primary">Kirim</button>
            </div>
        </div>
    `;

    const startBtn = document.getElementById('ce-start-btn');
    const startWrap = document.getElementById('ce-start-wrapper');
    const formWrap = document.getElementById('ce-form-wrapper');
    const input = document.getElementById('ce-input');
    const submitBtn = document.getElementById('ce-submit-btn');

    startBtn.addEventListener('click', () => {
        Sound.click();
        startWrap.style.display = 'none';
        formWrap.style.display = 'block';
        input.focus();
        document.getElementById('ce-status').textContent = 'Deduksikan 1 angka rahasia AI (1-100) dari 4 petunjuk modular dalam 10 detik!';
        startMiniGameTimer();
    });

    function check() {
        const val = parseInt(input.value.trim(), 10);
        if (isNaN(val)) return;

        if (val === secret) {
            handleMiniGameSuccess();
        } else {
            handleMiniGameFailure(`Tebakan keliru! Angka rahasia yang tepat adalah ${secret}. Progres di-reset ke Soal #1!`);
        }
    }

    submitBtn.addEventListener('click', check);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') check();
    });
}

// ==========================================================
// TAHAP 3: VICTORY SCREEN & CERTIFICATE GENERATION
// ==========================================================
function triggerGrandVictory() {
    switchView('victory');
    Sound.victory();
    Confetti.burst(200);

    const interval = setInterval(() => {
        if (GameState.view !== 'victory') {
            clearInterval(interval);
            return;
        }
        Confetti.burst(60);
    }, 2500);
}

function downloadCertificatePNG() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
    bgGrad.addColorStop(0, '#090e1a');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#0b1120');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 1160, 760);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 35, 1130, 730);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('SERTIFIKAT KEMENANGAN', 600, 140);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px sans-serif';
    ctx.fillText('CLASH OF CHAMPIONS - THE ULTIMATE BRAIN ARENA', 600, 185);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 215);
    ctx.lineTo(900, 215);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px sans-serif';
    ctx.fillText('Diberikan Penghargaan Tertinggi Kepada:', 600, 275);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('CHAMPION OF MIND', 600, 350);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('★ GELAR OTAK EMAS ★', 600, 425);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px sans-serif';
    ctx.fillText('Telah Berhasil Menyelesaikan 10 Tantangan Mini Game (10 Soal Acak per Game)', 600, 480);
    ctx.fillText('Membuktikan Ketajaman Logika, Memori, dan Kecepatan Berpikir Tingkat Tinggi', 600, 515);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('Dewan Juri Arena', 300, 680);
    ctx.fillText('Verified Master Rank', 900, 680);

    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(200, 650);
    ctx.lineTo(400, 650);
    ctx.moveTo(800, 650);
    ctx.lineTo(1000, 650);
    ctx.stroke();

    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`Diterbitkan pada: ${dateStr}`, 600, 720);

    const link = document.createElement('a');
    link.download = `Sertifikat-Clash-Of-Champions-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
