// ============================================================
// TOEIC 词汇大师 — Vue 3 应用主逻辑（纯前端 + localStorage）
// ============================================================
const { createApp, ref, reactive, computed, watch, nextTick } = Vue;

const STORAGE_KEY = '***';

// 内置词库索引
const BUILTIN_MAP = {};
BUILTIN_WORDS.forEach(w => { BUILTIN_MAP[w.word.toLowerCase()] = w; });

createApp({
  setup() {
    // ---------------- 视图与导航 ----------------
    const view = ref('home');
    const tabs = [
      { id: 'home',    label: '首页' },
      { id: 'study',   label: '闪卡复习' },
      { id: 'test',    label: '拼写测试' },
      { id: 'library', label: '词库管理' },
    ];

    // ---------------- 本地持久化 ----------------
    const store = reactive(load());
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          return { progress: d.progress || {}, meta: d.meta || {}, removed: d.removed || [] };
        }
      } catch (e) { /* 数据损坏则重置 */ }
      return { progress: {}, meta: {}, removed: [] };
    }
    let saveTimer = null;
    watch(store, () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
        catch (e) { msg('本地存储空间不足，未能保存'); }
      }, 150);
    }, { deep: true });

    // ---------------- 词条合并（内置 ← 用户编辑/导入 ← 学习进度） ----------------
    const allWords = computed(() => {
      const keys = new Set([...Object.keys(BUILTIN_MAP), ...Object.keys(store.meta)]);
      const out = [];
      for (const k of keys) {
        if (store.removed.includes(k)) continue;
        const b = BUILTIN_MAP[k] || {};
        const m = store.meta[k] || {};
        const p = store.progress[k] || SRS.init();
        out.push({
          word: k,
          phonetic: m.phonetic ?? b.phonetic ?? '',
          pos: m.pos ?? b.pos ?? '',
          meaning: m.meaning ?? b.meaning ?? '',
          meaningEn: m.meaningEn ?? '',
          example: m.example ?? b.example ?? '',
          exampleCn: m.exampleCn ?? b.exampleCn ?? '',
          audio: m.audio ?? '',
          category: m.category ?? b.category ?? 'general',
          level: p.level || 0, due: p.due || 0, seen: p.seen || 0, correct: p.correct || 0,
        });
      }
      return out.sort((x, y) => x.word.localeCompare(y.word));
    });

    const dueList = computed(() => allWords.value.filter(w => w.due <= SRS.NOW()));
    const dueCount = computed(() => dueList.value.length);
    const learningCount = computed(() => allWords.value.filter(w => w.level >= 1 && w.level <= 3).length);
    const masteredCount = computed(() => allWords.value.filter(w => w.level >= 4).length);

    const catStats = computed(() => Object.entries(CATEGORIES).filter(([k]) => k !== 'general' || allWords.value.some(w => w.category === k)).map(([k, c]) => {
      const ws = allWords.value.filter(w => w.category === k);
      const due = ws.filter(w => w.due <= SRS.NOW()).length;
      const mastered = ws.filter(w => w.level >= 4).length;
      return { key: k, label: c.label, color: c.color, total: ws.length, due, mastered,
               pct: ws.length ? Math.round(mastered / ws.length * 100) : 0 };
    }).filter(c => c.total));

    // ---------------- 通用工具 ----------------
    const catLabel = k => (CATEGORIES[k] || CATEGORIES.general).label;
    const catColor = k => (CATEGORIES[k] || CATEGORIES.general).color;
    const levelStars = l => '★★★★★☆☆☆☆☆'.slice(5 - Math.min(5, l), 10 - Math.min(5, l)) || '';
    const showMeaning = w => (w.meaning && w.meaning.trim()) || (w.meaningEn || '');
    const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function hlExample(example, word) {
      const safe = escHtml(example);
      if (!word) return safe;
      const re = new RegExp('\\b' + word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      return safe.replace(re, m => '<b class="text-indigo-600 font-bold">' + m + '</b>');
    }
    // ---------------- 发音：优先词典真人音频，无音频时用浏览器 TTS 兜底 ----------------
    const autoSpeak = ref(localStorage.getItem('toeic_auto_speak') !== '0');
    watch(autoSpeak, v => localStorage.setItem('toeic_auto_speak', v ? '1' : '0'));

    function speak(word, audioUrl) {
      // 发音降级链：词典 API 音频 → 有道真人发音（国内可达）→ 浏览器 TTS
      const urls = [...new Set([audioUrl, Dict.VOICE + encodeURIComponent(word) + '&type=1'])].filter(Boolean);
      let i = 0;
      const tryNext = () => {
        if (i >= urls.length) return tts(word);
        const a = new Audio(urls[i++]);
        a.onerror = tryNext;
        a.play().catch(tryNext);
      };
      tryNext();
    }
    function tts(word) {
      if (!('speechSynthesis' in window)) { msg('当前浏览器不支持语音合成'); return; }
      window.speechSynthesis.cancel(); // 打断上一次朗读
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.9;
      // 尽量挑选英美真人音色
      const v = window.speechSynthesis.getVoices().find(v => /^en[-_]?(US|GB)/i.test(v.lang));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }

    const toast = ref('');
    let toastTimer = null;
    function msg(t) { toast.value = t; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 2800); }

    // ---------------- 闪卡模式 ----------------
    const sQueue = ref([]), sIdx = ref(0), sFlipped = ref(false), sFinished = ref(false);
    const sStat = reactive({ good: 0, vague: 0, bad: 0 });
    const sDone = ref(0), preStudy = ref(false), pendingCat = ref('');
    const sCur = computed(() => allWords.value.find(w => w.word === sQueue.value[sIdx.value]) || {});
    // 闪卡翻到答案面时自动朗读（音形结合强化记忆）
    watch(sFlipped, v => { if (v && autoSpeak.value && sCur.value.word) speak(sCur.value.word, sCur.value.audio); });

    function buildQueue(cat, pre) {
      pendingCat.value = cat;
      const pool = allWords.value.filter(w => !cat || w.category === cat);
      let q = pool.filter(w => w.due <= SRS.NOW()).sort((a, b) => a.due - b.due);
      preStudy.value = false;
      if (!q.length && pre) { q = pool.sort((a, b) => a.level - b.level || a.due - b.due); preStudy.value = !!q.length; }
      sQueue.value = q.map(w => w.word); sIdx.value = 0; sFlipped.value = false; sFinished.value = false;
      sStat.good = sStat.vague = sStat.bad = 0; sDone.value = 0;
      if (!q.length) sQueue.value = [];
      return q.length;
    }
    function startStudy(cat) { view.value = 'study'; buildQueue(cat, true); }
    function answer(fb) {
      const w = sCur.value.word; if (!w) return;
      store.progress[w] = SRS.review(store.progress[w] || SRS.init(), fb);
      sStat[fb]++; sDone.value++;
      if (sIdx.value + 1 >= sQueue.value.length) sFinished.value = true;
      else { sIdx.value++; sFlipped.value = false; }
    }

    // ---------------- 拼写测试模式 ----------------
    const tQueue = ref([]), tIdx = ref(0), tInput = ref(''), tResult = ref(''), tFinished = ref(false);
    const tRight = ref(0), tTotal = ref(0);
    const spellInput = ref(null);
    const tCur = computed(() => allWords.value.find(w => w.word === tQueue.value[tIdx.value]) || {});
    const tAccuracy = computed(() => tTotal.value ? Math.round(tRight.value / tTotal.value * 100) : 100);

    // ---- 支付密码式逐格输入 ----
    const tAnswer = computed(() => (tCur.value.word || '').toLowerCase());
    const tCells = computed(() => Array.from({ length: tAnswer.value.length }));

    // 提示机制：每题最多 2 次，依次揭示第 1、第 2 个字母（蓝色格标记，计分时降档为「模糊」）
    const MAX_HINTS = 2;
    const hintsUsed = ref(0), hintRevealed = ref(0);
    function resetHint() { hintsUsed.value = 0; hintRevealed.value = 0; }
    function giveHint() {
      if (tResult.value || hintsUsed.value >= MAX_HINTS || !tCur.value.word) return;
      const a = tAnswer.value;
      // 从用户已输入的正确前缀之后继续揭示
      let k = 0;
      while (k < tInput.value.length && k < a.length && tInput.value[k].toLowerCase() === a[k]) k++;
      tInput.value = a.slice(0, k + 1);
      hintRevealed.value = Math.max(hintRevealed.value, k + 1);
      hintsUsed.value++;
    }

    function cellChar(i) { // 直接显示真实字母；提交后未写的格揭示正确答案
      return tInput.value[i] || (tResult.value ? tAnswer.value[i] || '' : '');
    }
    function cellClass(i) {
      if (!tResult.value) {
        if (i < hintRevealed.value && tInput.value[i]) return 'border-indigo-300 bg-indigo-50 text-indigo-500'; // 提示揭示的格
        return i === tInput.value.length
          ? 'border-sky-500 ring-2 ring-sky-200 bg-white'   // 当前待输入格（光标位）
          : 'border-slate-200 bg-white';
      }
      const typed = tInput.value[i];
      if (!typed) return 'border-indigo-200 bg-indigo-50 text-indigo-400'; // 没写完被揭示的格
      return typed.toLowerCase() === tAnswer.value[i]
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'               // 该格拼对
        : 'border-rose-300 bg-rose-50 text-rose-600 line-through';          // 该格拼错
    }
    function onPinInput(e) { // 只保留字母/连字符/撇号，过滤输入法噪音与粘贴杂质
      const v = e.target.value.replace(/[^a-zA-Z'-]/g, '').slice(0, tAnswer.value.length);
      if (v !== e.target.value) { tInput.value = v; e.target.value = v; }
      tInput.value = v;
    }
    // 填满最后一格 → 自动提交（支付密码交互）
    let autoSubmitTimer = null;
    watch(tInput, v => {
      clearTimeout(autoSubmitTimer);
      if (v.length < hintRevealed.value) hintRevealed.value = v.length; // 退格删掉提示字母后同步
      if (!tResult.value && tCur.value.word && v.length >= tAnswer.value.length) {
        autoSubmitTimer = setTimeout(() => { if (!tResult.value && tInput.value.length >= tAnswer.value.length) submitTest(); }, 300);
      }
    });

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
    async function startTest(cat, all) {
      view.value = 'test';
      const pool = allWords.value.filter(w => !cat || w.category === cat);
      let q = (all ? pool : pool.filter(w => w.due <= SRS.NOW()).sort((a, b) => a.due - b.due));
      if (!q.length && all !== true) q = shuffle(pool.slice()).slice(0, Math.min(10, pool.length)); // 兜底随机抽查
      tQueue.value = shuffle(q.map(w => w.word)).slice(0, 50);
      tIdx.value = 0; tInput.value = ''; tResult.value = ''; tFinished.value = !tQueue.value.length;
      tRight.value = 0; tTotal.value = 0; resetHint();
      await nextTick(); spellInput.value && spellInput.value.focus();
    }
    function applyTestResult(res) {
      const w = tCur.value.word;
      tTotal.value++;
      if (res !== 'wrong') tRight.value++;
      // 用了提示：即使拼对也降档为「模糊」（不升级、半间隔重练），保证测试的回忆效力
      const fb = res === 'wrong' ? 'bad' : (hintsUsed.value > 0 ? 'vague' : 'good');
      store.progress[w] = SRS.review(store.progress[w] || SRS.init(), fb);
      if (autoSpeak.value) speak(w, tCur.value.audio); // 出结果即朗读，强化音形对应
    }
    function submitTest() {
      if (tResult.value || !tInput.value.trim()) return;
      tResult.value = spellCheck(tInput.value, tCur.value.word);
      applyTestResult(tResult.value);
    }
    function revealAnswer() { if (!tResult.value) { tResult.value = 'wrong'; applyTestResult('wrong'); } }
    async function nextTest() {
      if (tIdx.value + 1 >= tQueue.value.length) { tFinished.value = true; return; }
      tIdx.value++; tInput.value = ''; tResult.value = ''; resetHint();
      await nextTick(); spellInput.value && spellInput.value.focus();
    }

    // ---------------- 词库：批量导入 ----------------
    const importText = ref(''), importCat = ref('general');
    const importing = ref(false), importProg = reactive({ done: 0, total: 0 }), importCur = ref('');
    function parseImport() {
      const seen = new Set(); const out = [];
      for (const raw of importText.value.split(/\r?\n/)) {
        const w = raw.trim().toLowerCase();
        if (/^[a-z][a-z'-]*[a-z]$|^[a-z]$/.test(w) && !seen.has(w) && !store.removed.includes(w)) { seen.add(w); out.push(w); }
      }
      return out;
    }
    async function doImport() {
      const list = parseImport(); if (!list.length) return;
      const fresh = list.filter(w => !BUILTIN_MAP[w] && !store.meta[w]);
      fresh.forEach(w => { store.meta[w] = { category: importCat.value }; });
      let got = 0;
      if (fresh.length) {
        importing.value = true; importProg.done = 0; importProg.total = fresh.length;
        const res = await Dict.lookupBatch(fresh, (d, t, w) => { importProg.done = d; importCur.value = w; });
        for (const [w, r] of Object.entries(res)) {
          if (!r) continue;
          const m = store.meta[w] || (store.meta[w] = { category: importCat.value });
          if (!m.phonetic) m.phonetic = r.phonetic;
          if (!m.pos) m.pos = r.pos;
          if (!m.example) m.example = r.example;
          if (!m.audio) m.audio = r.audio;
          if (r.meaningZh && !m.meaning) m.meaning = r.meaningZh; // 中文释义
          if (r.defEn) m.meaningEn = r.defEn;                      // 英文释义（备用）
          if (r.meaningZh || r.defEn) got++;
        }
        importing.value = false;
      }
      const dup = list.length - fresh.length;
      importText.value = '';
      msg(`导入 ${fresh.length} 个新词${dup ? `（跳过 ${dup} 个已存在）` : ''}，${got} 个已联网获取释义`);
    }

    // ---------------- 词库：查词 / 编辑 / 删除 ----------------
    const busyWord = ref('');
    async function lookupOne(word) {
      busyWord.value = word;
      const r = await Dict.lookup(word);
      busyWord.value = '';
      if (!r) { msg(`未找到 ${word} 的词典数据（检查网络或拼写）`); return; }
      const b = BUILTIN_MAP[word] || {};
      const m = store.meta[word] || (store.meta[word] = { category: b.category || 'general' });
      if (!m.phonetic) m.phonetic = r.phonetic;
      if (!m.pos) m.pos = r.pos;
      if (!m.example) m.example = r.example;
      if (!m.audio) m.audio = r.audio;
      if (r.meaningZh && !m.meaning) m.meaning = r.meaningZh; // 中文释义优先
      if (r.defEn) m.meaningEn = r.defEn;
      msg(`${word} 词典数据已更新${!r.phonetic && !r.example ? '（仅中文释义，完整数据需词典源可达）' : ''}`);
    }

    const editing = ref(null);
    function editWord(w) { editing.value = reactive({ ...w }); }
    function saveEdit() {
      const e = editing.value;
      store.meta[e.word] = {
        ...(store.meta[e.word] || {}),
        phonetic: e.phonetic, pos: e.pos, meaning: e.meaning,
        example: e.example, exampleCn: e.exampleCn, category: e.category,
      };
      editing.value = null; msg('已保存');
    }
    function removeWord(w) {
      if (!confirm(`确定将 "${w.word}" 移出词库？学习进度也会清除。`)) return;
      if (BUILTIN_MAP[w.word]) { if (!store.removed.includes(w.word)) store.removed.push(w.word); }
      else { delete store.meta[w.word]; }
      delete store.progress[w.word];
    }
    function restoreBuiltin() { store.removed = []; msg('内置词库已恢复'); }

    // ---------------- 词库：筛选 ----------------
    const libSearch = ref(''), libCat = ref(''), libStatus = ref('');
    const libWords = computed(() => allWords.value.filter(w => {
      if (libCat.value && w.category !== libCat.value) return false;
      if (libStatus.value === 'due' && w.due > SRS.NOW()) return false;
      if (libStatus.value === 'new' && w.seen > 0) return false;
      if (libStatus.value === 'mastered' && w.level < 4) return false;
      const s = libSearch.value.trim().toLowerCase();
      if (s && !(w.word.includes(s) || (w.meaning || '').toLowerCase().includes(s) || (w.meaningEn || '').toLowerCase().includes(s))) return false;
      return true;
    }));

    // ---------------- 快捷键 ----------------
    window.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'button' && e.code === 'Space') return; // 避免与按钮焦点操作重复触发
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        // 测试页回车：未提交则提交，已出结果则下一题（含词库搜索框时由 view 判断隔离）
        if (view.value === 'test' && e.key === 'Enter') { e.preventDefault(); tResult.value ? nextTest() : submitTest(); }
        return;
      }
      if (view.value === 'study' && sQueue.value.length && !sFinished.value) {
        if (e.code === 'Space') { e.preventDefault(); sFlipped.value = !sFlipped.value; }
        else if (sFlipped.value && ['1', '2', '3'].includes(e.key)) answer({ 1: 'bad', 2: 'vague', 3: 'good' }[e.key]);
      }
    });

    return {
      view, tabs, CATEGORIES, SRS,
      allWords, dueCount, learningCount, masteredCount, catStats,
      catLabel, catColor, levelStars, showMeaning, hlExample, speak, autoSpeak, msg,
      toast,
      sQueue, sIdx, sFlipped, sFinished, sStat, sDone, preStudy, pendingCat, sCur,
      buildQueue, startStudy, answer,
      tQueue, tIdx, tInput, tResult, tFinished, tCur, tAccuracy, spellInput,
      tAnswer, tCells, cellChar, cellClass, onPinInput, giveHint, hintsUsed, MAX_HINTS,
      startTest, submitTest, revealAnswer, nextTest,
      importText, importCat, importing, importProg, importCur, parseImport, doImport,
      busyWord, lookupOne, editing, editWord, saveEdit, removeWord, restoreBuiltin,
      libSearch, libCat, libStatus, libWords, store,
    };
  },
}).mount('#app');
