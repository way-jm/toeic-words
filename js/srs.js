// ============================================================
// 简化版艾宾浩斯间隔重复算法
// 熟悉度等级 0-5，反馈：认识(good) / 模糊(vague) / 忘记(bad)
// ============================================================
const SRS = {
  // 各级别对应的复习间隔（天）。level0=10分钟内重学，level5=30天长期保持
  INTERVAL_DAYS: [10 / 1440, 1, 2, 4, 7, 30],
  NOW() { return Date.now(); },

  // 新词的初始状态：立即到期，进入学习队列
  init() { return { level: 0, due: 0, seen: 0, correct: 0 }; },

  /**
   * 根据反馈计算新的记忆状态
   * good  : 升级，间隔按艾宾浩斯曲线拉长
   * vague : 等级不变，缩短为当前间隔的一半（至少1小时）快速重练
   * bad   : 归零，10分钟后重新出现
   */
  review(prog, feedback) {
    const now = this.NOW();
    const p = Object.assign({ level: 0, due: 0, seen: 0, correct: 0 }, prog);
    p.seen = (p.seen || 0) + 1;

    if (feedback === 'good') {
      p.level = Math.min(5, (p.level || 0) + 1);
      p.correct = (p.correct || 0) + 1;
      p.due = now + this.INTERVAL_DAYS[p.level] * 86400000;
    } else if (feedback === 'vague') {
      if ((p.level || 0) === 0) {
        p.due = now + 20 * 60000; // 20分钟后
      } else {
        p.due = now + Math.max(this.INTERVAL_DAYS[p.level] / 2, 1 / 24) * 86400000; // 半间隔，至少1小时
      }
    } else { // bad
      p.level = 0;
      p.due = now + 10 * 60000; // 10分钟后
    }
    return p;
  },

  isDue(prog) { return !prog || prog.due <= this.NOW(); },

  // 到期时间的友好描述
  dueText(due) {
    const diff = due - this.NOW();
    if (diff <= 0) return '现在复习';
    const m = Math.round(diff / 60000);
    if (m < 60) return `${m} 分钟后`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} 小时后`;
    const d = Math.round(h / 24);
    return `${d} 天后`;
  },
};

// ============================================================
// 编辑距离 + 拼写模式模糊匹配
// ============================================================
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * 拼写判定：exact 完全正确 | near 小笔误(视为掌握但提示) | wrong 错误
 * 短词(<=5字母)允许1个字符误差，长词允许2个
 */
function spellCheck(input, answer) {
  const a = input.trim().toLowerCase(), b = answer.trim().toLowerCase();
  if (!a) return 'wrong';
  if (a === b) return 'exact';
  const tol = b.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= tol && a.length >= b.length - 2 ? 'near' : 'wrong';
}
