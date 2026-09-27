// ============================================================
// 内置托业高频核心词库（按考试常见场景分类）
// category: meeting 商务会议 | marketing 市场营销 | hr 人力资源
//           finance 财务金融 | travel 差旅办公
// ============================================================
const CATEGORIES = {
  meeting:   { label: '商务会议', color: 'indigo' },
  marketing: { label: '市场营销', color: 'pink' },
  hr:        { label: '人力资源', color: 'emerald' },
  finance:   { label: '财务金融', color: 'amber' },
  travel:    { label: '差旅办公', color: 'sky' },
  general:   { label: '导入词汇', color: 'slate' },
};

const BUILTIN_WORDS = [
  // ---------- 商务会议 ----------
  { word: 'agenda',    phonetic: '/əˈdʒendə/',   pos: 'n.', meaning: '议程；日程表',       example: 'The CEO added a new item to the meeting agenda.',            exampleCn: '首席执行官在会议议程中新增了一项内容。',           category: 'meeting' },
  { word: 'minutes',   phonetic: '/ˈmɪnɪts/',    pos: 'n.', meaning: '会议纪要',           example: 'Could you take the minutes during the budget review?',         exampleCn: '预算评审期间你能做会议纪要吗？',                     category: 'meeting' },
  { word: 'proposal',  phonetic: '/prəˈpoʊzl/',  pos: 'n.', meaning: '提案；建议书',       example: 'The committee will vote on the proposal tomorrow.',            exampleCn: '委员会明天将对提案进行投票。',                       category: 'meeting' },
  { word: 'postpone',  phonetic: '/poʊˈspoʊn/',  pos: 'v.', meaning: '推迟；延期',         example: 'We had to postpone the press conference due to bad weather.',exampleCn: '由于天气恶劣，我们不得不推迟新闻发布会。',           category: 'meeting' },
  { word: 'consensus', phonetic: '/kənˈsensəs/', pos: 'n.', meaning: '共识；一致意见',     example: 'The team reached a consensus on the pricing strategy.',        exampleCn: '团队在定价策略上达成了共识。',                         category: 'meeting' },
  { word: 'negotiate', phonetic: '/nɪˈɡoʊʃieɪt/',pos: 'v.', meaning: '谈判；协商',         example: 'Our lawyers will negotiate the contract terms next week.',     exampleCn: '我们的律师下周将就合同条款进行谈判。',               category: 'meeting' },

  // ---------- 市场营销 ----------
  { word: 'campaign',  phonetic: '/kæmˈpeɪn/',   pos: 'n.', meaning: '营销活动；宣传活动', example: 'The advertising campaign boosted sales by 20 percent.',         exampleCn: '广告宣传活动使销售额增长了20%。',                    category: 'marketing' },
  { word: 'launch',    phonetic: '/lɔːntʃ/',     pos: 'v./n.',meaning: '推出；发布',       example: 'We will launch the new product line in March.',              exampleCn: '我们将在三月推出新产品线。',                           category: 'marketing' },
  { word: 'brand',     phonetic: '/brænd/',      pos: 'n.', meaning: '品牌',               example: 'The company is investing heavily in brand awareness.',         exampleCn: '该公司正在大力投资品牌知名度。',                       category: 'marketing' },
  { word: 'consumer',  phonetic: '/kənˈsuːmər/', pos: 'n.', meaning: '消费者',             example: 'Consumer confidence reached a six-month high in May.',         exampleCn: '消费者信心指数在五月达到六个月来的最高点。',         category: 'marketing' },
  { word: 'promotion', phonetic: '/prəˈmoʊʃn/',  pos: 'n.', meaning: '促销；晋升',         example: 'The summer promotion offers 30 percent off all items.',        exampleCn: '夏季促销活动提供全场七折优惠。',                       category: 'marketing' },
  { word: 'brochure',  phonetic: '/broʊˈʃʊr/',   pos: 'n.', meaning: '宣传册；小册子',     example: 'Please send me a brochure describing your hotel services.',    exampleCn: '请给我寄一份介绍贵酒店服务的小册子。',               category: 'marketing' },

  // ---------- 人力资源 ----------
  { word: 'recruit',    phonetic: '/rɪˈkruːt/',      pos: 'v.', meaning: '招聘；招募',       example: 'We plan to recruit ten new engineers this quarter.',         exampleCn: '我们计划本季度招聘十名新工程师。',                     category: 'hr' },
  { word: 'applicant',  phonetic: '/ˈæplɪkənt/',     pos: 'n.', meaning: '申请人；求职者',   example: 'Each applicant must submit a resume by Friday.',             exampleCn: '每位申请人必须在周五前提交简历。',                       category: 'hr' },
  { word: 'salary',     phonetic: '/ˈsæləri/',       pos: 'n.', meaning: '薪水；工资',       example: 'The annual salary for this position starts at 60,000 dollars.',exampleCn: '该职位的年薪从6万美元起。',                            category: 'hr' },
  { word: 'supervise',  phonetic: '/ˈsuːpərvaɪz/',   pos: 'v.', meaning: '监督；管理',       example: 'Ms. Tanaka will supervise the international sales team.',    exampleCn: '田中女士将管理国际销售团队。',                           category: 'hr' },
  { word: 'employee',   phonetic: '/ɪmˈplɔɪiː/',     pos: 'n.', meaning: '员工；雇员',       example: 'The company offers its employees free gym memberships.',     exampleCn: '公司为员工提供免费健身会员资格。',                     category: 'hr' },
  { word: 'retirement', phonetic: '/rɪˈtaɪərmənt/',  pos: 'n.', meaning: '退休',             example: 'He joined the retirement plan offered by the firm.',         exampleCn: '他加入了公司提供的退休计划。',                           category: 'hr' },

  // ---------- 财务金融 ----------
  { word: 'revenue',   phonetic: '/ˈrevənuː/',    pos: 'n.', meaning: '收入；营业收入',   example: 'Quarterly revenue exceeded one billion dollars.',            exampleCn: '季度营业收入超过十亿美元。',                             category: 'finance' },
  { word: 'budget',    phonetic: '/ˈbʌdʒɪt/',     pos: 'n.', meaning: '预算',               example: 'The marketing budget has been cut by 15 percent.',           exampleCn: '营销预算已被削减15%。',                                  category: 'finance' },
  { word: 'invoice',   phonetic: '/ˈɪnvɔɪs/',     pos: 'n.', meaning: '发票；账单',         example: 'Please send the invoice within five business days.',         exampleCn: '请在五个工作日内发送发票。',                             category: 'finance' },
  { word: 'audit',     phonetic: '/ˈɔːdɪt/',      pos: 'n./v.',meaning: '审计；查账',       example: 'The annual audit will be conducted by an external firm.',    exampleCn: '年度审计将由一家外部公司执行。',                       category: 'finance' },
  { word: 'dividend',  phonetic: '/ˈdɪvɪdend/',   pos: 'n.', meaning: '股息；红利',         example: 'Shareholders received a dividend of two dollars per share.', exampleCn: '股东获得了每股两美元的股息。',                         category: 'finance' },
  { word: 'expense',   phonetic: '/ɪkˈspens/',    pos: 'n.', meaning: '费用；开支',         example: 'Travel expenses will be reimbursed by the company.',         exampleCn: '差旅费将由公司报销。',                                   category: 'finance' },

  // ---------- 差旅办公 ----------
  { word: 'itinerary',     phonetic: '/aɪˈtɪnəreri/', pos: 'n.', meaning: '行程表；旅程',   example: 'I have attached the itinerary for our Shanghai business trip.',exampleCn: '我已附上我们上海出差的行程表。',                       category: 'travel' },
  { word: 'reservation',   phonetic: '/ˌrezərˈveɪʃn/',pos: 'n.', meaning: '预订；保留',     example: 'I would like to confirm my hotel reservation for Tuesday.',  exampleCn: '我想确认一下我周二的酒店预订。',                       category: 'travel' },
  { word: 'accommodation', phonetic: '/əˌkɑːməˈdeɪʃn/',pos:'n.', meaning: '住宿',             example: 'The conference provides accommodation for all participants.',exampleCn: '大会为所有参会者提供住宿。',                           category: 'travel' },
  { word: 'schedule',      phonetic: '/ˈskedʒuːl/',   pos: 'n./v.',meaning: '日程；安排',   example: 'The flight was rescheduled because of a technical issue.',   exampleCn: '由于技术问题，航班被重新安排。',                       category: 'travel' },
  { word: 'equipment',     phonetic: '/ɪˈkwɪpmənt/',  pos: 'n.', meaning: '设备；装备',     example: 'Please book the conference room and arrange the equipment.', exampleCn: '请预订会议室并安排设备。',                               category: 'travel' },
  { word: 'shuttle',       phonetic: '/ˈʃʌtl/',       pos: 'n.', meaning: '班车；穿梭航班', example: 'A free shuttle runs between the airport and the hotel.',     exampleCn: '机场与酒店之间有免费班车往返。',                       category: 'travel' },
];
