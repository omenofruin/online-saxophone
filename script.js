// --- Real Saxophone Sample Engine (Optimized) ---

// 더 빠른 jsDelivr CDN 사용 및 샘플 개수 최소화 (C3, C4, C5만 사용하여 로딩 속도 극대화)
const sampleBaseUrl = "https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments/samples/saxophone/";

const sampler = new Tone.Sampler({
    urls: {
        "C3": "C3.mp3",
        "C4": "C4.mp3",
        "C5": "C5.mp3"
    },
    baseUrl: sampleBaseUrl,
    onload: () => {
        console.log("Samples loaded successfully");
        showStartButton();
    },
    onerror: (err) => {
        console.error("Sample load error:", err);
        document.getElementById('loading-msg').textContent = "샘플 로드 실패. 신디사이저로 전환합니다.";
        switchToSynth(); // 실패 시 신디사이저로 자동 전환
        showStartButton();
    }
}).toDestination();

// 로딩이 너무 길어질 경우를 위한 타임아웃 (5초)
setTimeout(() => {
    if (document.getElementById('start-btn').style.display === "none") {
        document.getElementById('loading-msg').textContent = "네트워크가 느립니다. 강제로 시작할 수 있습니다.";
        showStartButton();
    }
}, 5000);

function showStartButton() {
    document.getElementById('start-btn').style.display = "block";
    document.getElementById('loader-bar').style.width = "100%";
}

// 사운드 보정용 이펙터
const reverb = new Tone.Reverb(1.5).toDestination();
const filter = new Tone.Filter(2500, "lowpass").connect(reverb);
sampler.connect(filter);

// --- 신디사이저 폴백 (샘플 로드 실패 시 사용) ---
let isUsingSynth = false;
let backupSynth;

function switchToSynth() {
    isUsingSynth = true;
    backupSynth = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.1, sustain: 0.8, release: 1.2 }
    }).toDestination();
    backupSynth.connect(filter);
}

const saxophones = {
    1: { name: "Sopranino", offset: 12, filter: 4000 },
    2: { name: "Soprano", offset: 7, filter: 3500 },
    3: { name: "Alto", offset: 0, filter: 2500 },
    4: { name: "Tenor", offset: -5, filter: 2000 },
    5: { name: "Baritone", offset: -12, filter: 1500 },
    6: { name: "Bass", offset: -19, filter: 1000 },
    7: { name: "Contrabass", offset: -24, filter: 800 },
    8: { name: "Subcontrabass", offset: -31, filter: 600 }
};

let currentSaxId = 3;
let isHighOctave = false;
const activeNotes = new Map();

const keyMap = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
    'u': 'A#4', 'j': 'B4', 'k': 'C5'
};

function playNote(noteWithOctave) {
    if (activeNotes.has(noteWithOctave)) return;

    const sax = saxophones[currentSaxId];
    let freq = Tone.Frequency(noteWithOctave).transpose(sax.offset);
    if (isHighOctave) freq = freq.transpose(12);

    const finalNote = freq.toNote();

    if (isUsingSynth) {
        backupSynth.triggerAttack(finalNote);
    } else {
        sampler.triggerAttack(finalNote);
    }
    
    activeNotes.set(noteWithOctave, finalNote);

    // UI 활성화
    const baseNote = noteWithOctave.replace(/[0-9]/g, '');
    const isNextOct = noteWithOctave.includes('5');
    const selector = `.k-circle[data-note="${baseNote}"]${isNextOct ? '[data-next-octave="true"]' : ':not([data-next-octave="true"])'}`;
    const el = document.querySelector(selector);
    if (el) el.classList.add('active');
}

function stopNote(noteWithOctave) {
    if (!activeNotes.has(noteWithOctave)) return;
    
    const finalNote = activeNotes.get(noteWithOctave);
    if (isUsingSynth) {
        backupSynth.triggerRelease();
    } else {
        sampler.triggerRelease(finalNote);
    }
    activeNotes.delete(noteWithOctave);

    const baseNote = noteWithOctave.replace(/[0-9]/g, '');
    const isNextOct = noteWithOctave.includes('5');
    const selector = `.k-circle[data-note="${baseNote}"]${isNextOct ? '[data-next-octave="true"]' : ':not([data-next-octave="true"])'}`;
    const el = document.querySelector(selector);
    if (el) el.classList.remove('active');
}

function updateSaxUI() {
    const sax = saxophones[currentSaxId];
    document.getElementById('inst-name').textContent = sax.name + " Sax";
    filter.frequency.value = sax.filter;
    document.querySelectorAll('.inst-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id == currentSaxId);
    });
}

const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', async () => {
    await Tone.start();
    document.getElementById('start-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('start-overlay').style.display = 'none', 800);
});

window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Shift') {
        isHighOctave = true;
        document.getElementById('octave-lamp').classList.add('active');
        return;
    }
    if (e.key >= '1' && e.key <= '8') {
        currentSaxId = parseInt(e.key);
        updateSaxUI();
        return;
    }
    const note = keyMap[e.key.toLowerCase()];
    if (note) playNote(note);
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        isHighOctave = false;
        document.getElementById('octave-lamp').classList.remove('active');
        return;
    }
    const note = keyMap[e.key.toLowerCase()];
    if (note) stopNote(note);
});
