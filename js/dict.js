// ============================================================
// 词典数据获取 —— 多源自动降级，国内网络开箱即用
//
//  源1  Free Dictionary API（免鉴权）：音标/词性/英文释义/例句/音频
//       —— 海外网络可用；大陆网络不通，一次超时后本会话自动熔断跳过
//  源2  MyMemory 翻译 API（免鉴权，CORS:*，大陆可达）：中文释义
//  音频 有道 dictvoice 真人发音：<audio> 标签不受 CORS 限制，大陆可达
//       （在 app.js 的 speak() 中使用，无需查词）
// ============================================================
const Dict = {
  FREE: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
  MYMEMORY: 'https://api.mymemory.translated.net/get?q=',
  VOICE: 'https://dict.youdao.com/dictvoice?audio=', // 真人音频 URL 直接拼接

  freeDown: false, // 会话级熔断：源1 网络不通则不再浪费时间

  async _fetchJson(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } finally { clearTimeout(timer); }
  },

  // ---- 源1：Free Dictionary API ----
  async viaFreeDictionary(word) {
    if (this.freeDown) return null;
    try {
      const data = await this._fetchJson(this.FREE + encodeURIComponent(word), 5000);
      const entry = Array.isArray(data) ? data[0] : null;
      if (!entry) return null;
      let phonetic = entry.phonetic || '', audio = '';
      if (Array.isArray(entry.phonetics)) {
        if (!phonetic) phonetic = (entry.phonetics.find(p => p && p.text) || {}).text || '';
        audio = (entry.phonetics.find(p => p && p.audio) || {}).audio || '';
      }
      const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
      let pos = '', defEn = '', example = '';
      if (meanings.length) {
        pos = meanings[0].partOfSpeech || '';
        defEn = (meanings[0].definitions || []).slice(0, 2).map((d, i) => `${i + 1}. ${d.definition}`).join('\n');
        for (const m of meanings) {
          const ex = (m.definitions || []).find(d => d.example);
          if (ex) { example = ex.example; break; }
        }
      }
      return { phonetic, audio, pos, defEn, example };
    } catch (e) {
      this.freeDown = true; // 网络不通/超时：本会话后续词直接跳过该源
      return null;
    }
  },

  // ---- 源2：MyMemory（英→中，词典级语料，自带词性标注）----
  async viaMyMemory(word) {
    try {
      const d = await this._fetchJson(this.MYMEMORY + encodeURIComponent(word) + '&langpair=en|zh-CN', 8000);
      let t = (d && d.responseData && d.responseData.translatedText) || '';
      t = t.replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
      // 过滤无效结果（原词回译、报错文本、乱码占位）
      if (!t || /^INVALID|^QUERY|={2,}|[a-zA-Z ]+$/.test(t) || t.toLowerCase() === word.toLowerCase()) return '';
      return t.slice(0, 120);
    } catch (e) { return ''; }
  },

  /**
   * 综合查询一个词：{ phonetic, audio, pos, meaningZh, defEn, example } 或 null（全部失败）
   */
  async lookup(word) {
    word = word.trim().toLowerCase();
    if (!word) return null;
    const [en, zh] = [await this.viaFreeDictionary(word), await this.viaMyMemory(word)];
    if (!en && !zh) return null;
    return {
      phonetic: (en && en.phonetic) || '',
      audio:    (en && en.audio) || '',
      pos:      (en && en.pos) || (zh.match(/^(n|v|adj|adv|prep|vt|vi)\./) || [''])[0],
      meaningZh: zh || '',
      defEn:    (en && en.defEn) || '',
      example:  (en && en.example) || '',
    };
  },

  /**
   * 批量查询（串行 + 300ms 间隔防限流）
   * onProgress(done, total, word)
   */
  async lookupBatch(words, onProgress) {
    const results = {};
    for (let i = 0; i < words.length; i++) {
      results[words[i]] = await this.lookup(words[i]);
      if (onProgress) onProgress(i + 1, words.length, words[i]);
      if (i < words.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    return results;
  },
};
