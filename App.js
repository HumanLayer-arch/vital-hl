/**

- ══════════════════════════════════════
- VITAL HL v2 · app.js · Human Tech
- iPhone-first · Human Layer
- ══════════════════════════════════════
  */

‘use strict’;

/* ─────────────────────────────
CONFIG
───────────────────────────── */
const C = {
introDuration:  2600,    // ms intro → home
typeMs:         24,      // ms per character
throttleMs:     950,     // min ms between responses
breathSecs:     10,      // breath duration
taglineMs:      3800,    // ms between tagline swaps
insightDelay:   1400,    // ms before insight appears
storeKey:       ‘vhl2’,  // localStorage key
};

/* ─────────────────────────────
CONTENT
───────────────────────────── */
const TAGLINES = [
‘Un instante antes de decidir’,
‘A veces una pausa cambia todo’,
‘Las decisiones importantes merecen buenas condiciones’,
‘Un pequeño espacio antes de actuar’,
‘Pensar con claridad es un acto de respeto a uno mismo’,
];

const DECISION_KW = [
‘decidir’,‘decisión’,‘decido’,‘decida’,
‘no sé’,‘no se’,‘duda’,‘dudando’,
‘problema’,‘conflicto’,‘discusión’,‘discutir’,
‘trabajo’,‘empleo’,‘jefe’,‘empresa’,‘renuncia’,
‘dinero’,‘deuda’,‘inversión’,‘pagar’,‘comprar’,
‘relación’,‘pareja’,‘familia’,‘ruptura’,‘separar’,
‘cambio’,‘cambiar’,‘dejar’,‘irme’,‘mudarme’,
‘miedo’,‘angustia’,‘ansiedad’,‘temo’,
‘urgente’,‘ahora mismo’,‘rápido’,‘inmediato’,
‘arrepent’,‘equivoc’,‘mensaje’,‘enviar’,
];

// Respuestas por categoría — nunca más de 2 frases, nunca directivas
const RESPONSES = [
{ re: /trabajo|empleo|jefe|empresa|renuncia|despido/i, pool: [
‘Las decisiones laborales suelen verse mejor desde un lugar más tranquilo.’,
‘Lo que describes en el trabajo merece espacio, no urgencia.’,
‘A veces la claridad llega cuando la presión baja un poco.’,
]},
{ re: /dinero|deuda|inversión|pagar|comprar|gastar|vender/i, pool: [
‘Las decisiones financieras se ven diferente desde la calma.’,
‘Cuando el dinero está de por medio, un momento de pausa suele valer mucho.’,
‘Algunas decisiones económicas son difíciles de revertir.’,
]},
{ re: /relación|pareja|familia|amor|ruptura|separar/i, pool: [
‘Pocas decisiones merecen más claridad que las que involucran a quien importa.’,
‘Las relaciones son complejas. La tensión no es el mejor momento para decidir.’,
‘Lo que sientes ahora es real. A veces cambia con el tiempo.’,
]},
{ re: /miedo|angustia|ansiedad|pánico|temo|nervios/i, pool: [
‘El miedo nos hace creer que debemos actuar ahora. Casi nunca es verdad.’,
‘Cuando hay angustia, la urgencia puede parecer real sin serlo.’,
‘Sentir miedo antes de decidir es una señal, no una orden.’,
]},
{ re: /urgente|ahora mismo|rápido|inmediato|ya\b/i, pool: [
‘Casi ninguna decisión importante requiere los próximos diez minutos.’,
‘La urgencia real es rara. La urgencia percibida es muy frecuente.’,
‘Cuando algo parece urgente, vale preguntar: ¿realmente lo es?’,
]},
{ re: /no sé|no se|duda|dudando|confundid/i, pool: [
‘La duda es una señal, no un problema. Indica que algo merece más atención.’,
‘Cuando hay duda genuina, esperar suele ser lo más inteligente.’,
‘No saber con claridad suele significar que falta algo: tiempo, calma o información.’,
]},
{ re: null, pool: [
‘Si quieres, podemos revisarlo antes de decidir.’,
‘Las decisiones importantes suelen agradecer un poco de calma.’,
‘A veces la respuesta aparece después de un pequeño espacio.’,
‘Podemos mirarlo un momento antes de decidir.’,
‘Lo que describes merece espacio.’,
‘Está bien tomarse un instante antes de actuar.’,
‘A veces un pequeño espacio cambia mucho.’,
‘Cuando nos alteramos, las decisiones suelen acelerarse.’,
]},
];

const INSIGHTS = [
‘A veces al escribirlo ya aparece más claro.’,
‘Leer lo que escribiste puede ser suficiente.’,
‘El acto de ponerlo en palabras ya es un paso.’,
‘La claridad no siempre viene de pensar más, sino de ordenar lo que ya sabes.’,
‘Lo que acabas de escribir merece un momento de silencio.’,
];

const BREATH_PHASES = [
{ label: ‘Inhala’, ms: 4000 },
{ label: ‘Sostén’, ms: 2000 },
{ label: ‘Exhala’, ms: 4000 },
];

const NOTIF = {
pause:   ‘Quizá este sea un buen momento para pensar un instante.’,
clarity: ‘Este suele ser un buen momento para pensar con claridad.’,
};

/* ─────────────────────────────
STATE
───────────────────────────── */
const ST = {
prevScreen:     null,
lastResponse:   0,
taglineIdx:     0,
taglineTimer:   null,
breathTimers:   [],
mem: {
pauses: 0, reflections: 0, decisions: 0,
topics: {}, bestHour: null,
},
};

/* ─────────────────────────────
DOM
───────────────────────────── */
const $ = id => document.getElementById(id);
const D = {
// screens
intro:    $(‘intro’),
home:     $(‘home’),
decision: $(‘decision’),
breath:   $(‘breath’),
share:    $(‘share’),
patterns: $(‘patterns’),
// intro
tagline:  $(‘js-tagline’),
// home
input:    $(‘js-input’),
signal:   $(‘js-signal’),
msg:      $(‘js-msg’),
actions:  $(‘js-actions’),
pause:    $(‘js-pause’),
toDecision: $(‘js-to-decision’),
toPatterns: $(‘js-to-patterns’),
// decision
d1: $(‘d1’), d2: $(‘d2’), d3: $(‘d3’),
insight:  $(‘js-insight’),
pauseD:   $(‘js-pause-d’),
shareD:   $(‘js-share-d’),
saveD:    $(‘js-save-d’),
backHome: $(‘js-back-home’),
// breath
phase:    $(‘js-phase’),
timer:    $(‘js-timer’),
skip:     $(‘js-skip’),
// share
doShare:  $(‘js-do-share’),
noShare:  $(‘js-no-share’),
shareFb:  $(‘js-share-fb’),
// patterns
pBody:    $(‘js-patterns-body’),
backHomeP:$(‘js-back-home-p’),
};

/* ─────────────────────────────
UTILS
───────────────────────────── */
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

function showScreen(el) {
document.querySelectorAll(’.screen’).forEach(s => s.classList.remove(‘active’));
el.classList.add(‘active’);
}

function typeText(el, text, cb) {
el.textContent = ‘’;
el.classList.add(‘cursor’);
let i = 0;
const t = setInterval(() => {
el.textContent += text[i++];
if (i >= text.length) {
clearInterval(t);
el.classList.remove(‘cursor’);
cb && cb();
}
}, C.typeMs);
}

function pickResponse(text) {
for (const r of RESPONSES) {
if (r.re && r.re.test(text)) return rand(r.pool);
}
return rand(RESPONSES[RESPONSES.length - 1].pool);
}

function hasDecisionKw(text) {
const lo = text.toLowerCase();
return DECISION_KW.some(w => lo.includes(w));
}

function detectTopic(text) {
const lo = text.toLowerCase();
if (/trabajo|empleo|jefe|empresa/.test(lo)) return ‘trabajo’;
if (/dinero|deuda|inversión/.test(lo))      return ‘dinero’;
if (/relación|pareja|familia/.test(lo))     return ‘relación’;
if (/cambio|cambiar|dejar/.test(lo))        return ‘cambio’;
return ‘general’;
}

/* ─────────────────────────────
MEMORY (localStorage)
───────────────────────────── */
function loadMem() {
try {
const raw = localStorage.getItem(C.storeKey);
if (raw) Object.assign(ST.mem, JSON.parse(raw));
} catch (*) {}
}
function saveMem() {
try { localStorage.setItem(C.storeKey, JSON.stringify(ST.mem)); } catch (*) {}
}
function track(key) { ST.mem[key] = (ST.mem[key] || 0) + 1; saveMem(); }
function trackTopic(t) {
ST.mem.topics[t] = (ST.mem.topics[t] || 0) + 1;
saveMem();
}

/* ─────────────────────────────
TAGLINES (intro rotation)
───────────────────────────── */
function startTaglines() {
typeText(D.tagline, TAGLINES[0]);
let idx = 0;
ST.taglineTimer = setInterval(() => {
idx = (idx + 1) % TAGLINES.length;
D.tagline.style.opacity = ‘0’;
setTimeout(() => {
typeText(D.tagline, TAGLINES[idx]);
D.tagline.style.opacity = ‘1’;
}, 380);
}, C.taglineMs);
}
function stopTaglines() {
clearInterval(ST.taglineTimer);
}

/* ─────────────────────────────
HOME INPUT
───────────────────────────── */
function onInput() {
const text = D.input.value.trim();
if (text.length === 0) {
D.msg.textContent = ‘’;
D.msg.classList.remove(‘lit’,‘gold’);
D.signal.classList.remove(‘on’);
D.actions.classList.remove(‘on’);
return;
}
if (text.length < 14) return;
const now = Date.now();
if (now - ST.lastResponse < C.throttleMs) return;
ST.lastResponse = now;

trackTopic(detectTopic(text));

const response = pickResponse(text);
D.msg.classList.add(‘lit’);
D.msg.classList.remove(‘gold’);
typeText(D.msg, response);

if (hasDecisionKw(text)) {
setTimeout(() => {
D.signal.classList.add(‘on’);
D.actions.classList.add(‘on’);
}, 500);
}
}

/* ─────────────────────────────
BREATH
───────────────────────────── */
function startBreath(returnScreen) {
ST.prevScreen = returnScreen;
showScreen(D.breath);
track(‘pauses’);
ST.mem.bestHour = new Date().getHours();
saveMem();

let secs = C.breathSecs;
D.timer.textContent = secs;
D.phase.textContent = BREATH_PHASES[0].label;

let phaseIdx = 0, phaseMs = 0;

const countdown = setInterval(() => {
secs–;
D.timer.textContent = secs;
if (secs <= 0) { clearInterval(countdown); clearInterval(phaseLoop); endBreath(); }
}, 1000);

const phaseLoop = setInterval(() => {
phaseMs += 500;
if (phaseMs >= BREATH_PHASES[phaseIdx].ms) {
phaseMs = 0;
phaseIdx = (phaseIdx + 1) % BREATH_PHASES.length;
D.phase.textContent = BREATH_PHASES[phaseIdx].label;
}
}, 500);

ST.breathTimers = [countdown, phaseLoop];
}

function stopBreath() { ST.breathTimers.forEach(clearInterval); ST.breathTimers = []; }

function endBreath() {
stopBreath();
const ret = ST.prevScreen || D.home;
setTimeout(() => {
showScreen(ret);
if (ret === D.home) {
setTimeout(() => {
D.msg.classList.add(‘gold’);
typeText(D.msg, ‘¿Cómo te sientes ahora?’, () => {
setTimeout(() => showScreen(D.share), 2000);
});
}, 500);
}
}, 600);
}

/* ─────────────────────────────
MODO DECISIÓN
───────────────────────────── */
function onDecisionInput() {
const filled = [D.d1, D.d2, D.d3].filter(t => t.value.trim().length > 10).length;
if (filled >= 2) {
track(‘reflections’);
setTimeout(() => typeText(D.insight, rand(INSIGHTS)), C.insightDelay);
}
}

function saveReflection() {
track(‘decisions’);
D.insight.textContent = ‘Guardado. Solo tú puedes verlo.’;
setTimeout(() => {
D.d1.value = ‘’; D.d2.value = ‘’; D.d3.value = ‘’;
D.insight.textContent = ‘’;
showScreen(D.home);
}, 1800);
}

/* ─────────────────────────────
SHARE
───────────────────────────── */
function doShare() {
const token = Math.random().toString(36).slice(2, 9).toUpperCase();
const link  = `${location.origin}${location.pathname}?m=${token}`;
if (navigator.clipboard) {
navigator.clipboard.writeText(link)
.then(()  => { D.shareFb.textContent = ‘Enlace copiado. Compártelo con quien confíes.’; })
.catch(()  => { D.shareFb.textContent = link; });
} else {
D.shareFb.textContent = link;
}
}

function noShare() {
D.shareFb.textContent = ‘Guardado solo para ti.’;
setTimeout(() => { D.shareFb.textContent = ‘’; showScreen(D.home); }, 1600);
}

/* ─────────────────────────────
PATRONES
───────────────────────────── */
function renderPatterns() {
const m = ST.mem;
const top = Object.entries(m.topics).sort((a,b) => b[1]-a[1])[0];
const hr  = m.bestHour;
const hrLabel = hr == null ? ‘—’ : hr < 12 ? ‘Mañana’ : hr < 17 ? ‘Tarde’ : ‘Noche’;
const hasData = m.pauses || m.reflections || m.decisions;

if (!hasData) {
D.pBody.innerHTML = `<div class="mem-empty">Comienza a usar Vital<br/>y aquí aparecerán tus patrones.</div>`;
return;
}

const cards = [
{ lbl:‘Pausas realizadas’,       val: m.pauses       || ‘—’, cls:‘hl’,   note: m.pauses ? ‘Cada pausa es una decisión en mejores condiciones.’ : ‘’ },
{ lbl:‘Reflexiones escritas’,    val: m.reflections   || ‘—’, cls:’’,    note: m.reflections ? ‘Escribir antes de decidir es uno de los hábitos más valiosos.’ : ‘’ },
{ lbl:‘Decisiones registradas’,  val: m.decisions     || ‘—’, cls:‘gold’,note: m.decisions ? ‘El registro ayuda a aprender de tus propios patrones.’ : ‘’ },
{ lbl:‘Tema más frecuente’,      val: top ? top[0]    : ‘—’,  cls:’’,    note: top ? `Aparece ${top[1]} ${top[1]===1?'vez':'veces'} en tus reflexiones.` : ‘’ },
{ lbl:‘Momento de mayor calma’,  val: hrLabel,                cls:‘hl’,   note: hr != null ? ‘Cuando más sueles reflexionar con tranquilidad.’ : ‘Vital aprenderá conforme lo uses.’ },
{ lbl:‘Privacidad’,              val: ‘100% local’,           cls:’’,    note: ‘Todo permanece en tu dispositivo. Nunca sale de aquí.’ },
];

D.pBody.innerHTML = cards.map(c => `<div class="mem-card"> <div class="mem-lbl">${c.lbl}</div> <div class="mem-val ${c.cls}">${c.val}</div> ${c.note ?`<div class="mem-note">${c.note}</div>`: ''} </div>`).join(’’);
}

/* ─────────────────────────────
NOTIF HL (demo local)
───────────────────────────── */
function scheduleNotif(type, ms) {
setTimeout(() => {
if (D.home.classList.contains(‘active’)) {
D.msg.classList.add(‘gold’);
typeText(D.msg, NOTIF[type] || ‘’);
}
}, ms);
}

/* ─────────────────────────────
BIND EVENTS
───────────────────────────── */
function bind() {
// Home
D.input.addEventListener(‘input’, onInput);
D.pause.addEventListener(‘click’, () => startBreath(D.home));
D.toDecision.addEventListener(‘click’, () => showScreen(D.decision));
D.toPatterns.addEventListener(‘click’, () => { renderPatterns(); showScreen(D.patterns); });

// Decision
[D.d1, D.d2, D.d3].forEach(t => t.addEventListener(‘input’, onDecisionInput));
D.pauseD.addEventListener(‘click’, () => startBreath(D.decision));
D.shareD.addEventListener(‘click’, () => showScreen(D.share));
D.saveD.addEventListener(‘click’, saveReflection);
D.backHome.addEventListener(‘click’, () => {
D.d1.value = ‘’; D.d2.value = ‘’; D.d3.value = ‘’;
D.insight.textContent = ‘’;
showScreen(D.home);
});

// Breath
D.skip.addEventListener(‘click’, () => { stopBreath(); endBreath(); });

// Share
D.doShare.addEventListener(‘click’, doShare);
D.noShare.addEventListener(‘click’, noShare);

// Patterns
D.backHomeP.addEventListener(‘click’, () => showScreen(D.home));
}

/* ─────────────────────────────
INTRO → HOME
───────────────────────────── */
function init() {
loadMem();
bind();
startTaglines();

setTimeout(() => {
stopTaglines();
D.intro.style.opacity = ‘0’;
D.intro.style.transition = ‘opacity .8s ease’;
setTimeout(() => {
D.intro.classList.remove(‘active’);
showScreen(D.home);
// HL silent notification — demo a los 40s
scheduleNotif(‘clarity’, 40000);
}, 800);
}, C.introDuration);
}

document.addEventListener(‘DOMContentLoaded’, init);
