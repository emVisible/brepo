// 双语字典单真相源：键双语一致由类型保证（LangDict 两侧同键，缺键编译期报错）
// 范围：首页全量 + 报告顶栏/底栏图例；3D 画布与分析数据保持中文（语言边界见 Logo 旁说明以外的显式标注处）

export type Lang = 'zh' | 'en';

const zh = {
  heroTitle: '粘贴仓库，预览导航',
  heroSub: '输入 GitHub 链接或本地路径，生成一份可交互的项目导航报告。',
  pathLabel: '仓库路径或 GitHub 链接',
  run: '生成报告',
  running: ((pct: number) => `分析中 ${pct}%`) as (pct: number) => string,
  viewTreemap: '分布',
  viewCity: '城市',
  legendTreemapLines: '区=子目录 · 面积=行数 · 点区/点块下钻',
  legendTreemapCount: '区=子目录 · 等面积平铺 · 点区下钻',
  legendCity: '高=log₂行数 · 弧=依赖紫出青入 · 灰=死文件 · 红闪=环 · 光柱=入口',
  hintTreemap: '点区/点块下钻 · 面包屑返回',
  hintCity: '拖拽旋转 · 滚轮缩放 · 点击建筑查看上下游',
  emptyReport: '暂无报告 · 请先在首页生成（刷新会丢失内存态，历史持久化待 KV 接入）',
  githubAria: 'GitHub 仓库',
  langToggle: 'EN',
  metricLines: '按行数',
  metricCount: '按文件数',
  kpiFiles: '文件',
  kpiLinesUnit: '行',
  kpiCommits: '提交',
  kpiHealth: '健康',
  kpiPeople: '人',
  railHotspot: '热点 · 点击定位',
  detailOut: '出',
  detailIn: '入',
  filterTitle: '分析选项',
  optStyles: '样式 css·scss·less',
  optPages: '页面 html',
  optImages: '图片 png·jpg·svg…',
  optFonts: '字体 woff·ttf…',
  optMedia: '音视频 mp4·mp3…',
  optArchives: '压缩包 zip·tar…',
  optData: '数据 json·yaml…',
  optPdfs: '文档 pdf',
  historyTitle: '历史',
  historyClear: '清空',
  historyHit: '历史中有相同分析，直接打开可省一次等待',
  historyOpen: '直接打开',
  historyReanalyze: '重新分析',
};

export type LangDict = typeof zh;
export type LangKey = keyof LangDict;

const en: LangDict = {
  heroTitle: 'Paste a repo, preview its map',
  heroSub: 'Enter a GitHub URL or local path to generate an interactive project navigation report.',
  pathLabel: 'Repo path or GitHub URL',
  run: 'Generate report',
  running: (pct: number) => `Analyzing ${pct}%`,
  viewTreemap: 'Map',
  viewCity: 'City',
  legendTreemapLines: 'Cell=directory · Area=lines · Click to drill in',
  legendTreemapCount: 'Cell=directory · Equal tiles · Click to drill in',
  legendCity: 'Height=log₂ lines · Arcs=deps (out purple, in cyan) · Gray=dead · Red pulse=cycle · Beam=entry',
  hintTreemap: 'Click cells to drill in · Breadcrumbs to go back',
  hintCity: 'Drag to orbit · Scroll to zoom · Click a building for dependencies',
  emptyReport: 'No report yet · Generate one from the home page first (in-memory state is lost on refresh)',
  githubAria: 'GitHub repository',
  langToggle: '中',
  metricLines: 'By lines',
  metricCount: 'By files',
  kpiFiles: 'Files',
  kpiLinesUnit: 'lines',
  kpiCommits: 'Commits',
  kpiHealth: 'Health',
  kpiPeople: 'people',
  railHotspot: 'Hotspots · click to locate',
  detailOut: 'out',
  detailIn: 'in',
  filterTitle: 'Scan options',
  optStyles: 'Styles css·scss·less',
  optPages: 'Pages html',
  optImages: 'Images png·jpg·svg…',
  optFonts: 'Fonts woff·ttf…',
  optMedia: 'Media mp4·mp3…',
  optArchives: 'Archives zip·tar…',
  optData: 'Data json·yaml…',
  optPdfs: 'Docs pdf',
  historyTitle: 'History',
  historyClear: 'Clear',
  historyHit: 'Same analysis found in history — open it to skip waiting',
  historyOpen: 'Open',
  historyReanalyze: 'Re-analyze',
};

export const dict: Record<Lang, LangDict> = { zh, en };

export function detectLang(acceptLanguage: string | null): Lang {
  if (!acceptLanguage) return 'zh';
  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'zh';
}
