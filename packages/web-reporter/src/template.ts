import type { AnalysisResult } from '@briefrepo/types';
import { kindColor as TOKENS_KIND_COLOR, kindBg as TOKENS_KIND_BG, cssVariables } from './tokens.js';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
function escJson(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

export function renderHtml(result: AnalysisResult): string {
  const { context, level0, level1, basicInference } = result;
  const kindLabelZh: Record<string, string> = {
    product: '产品应用',
    library: '库 / 框架',
    documentation: '文档仓库',
    experimental: '实验性质',
    tutorial: '学习性质',
    hybrid: '混合型',
    other: '其他',
    platform: '平台',
  };
  const badgeColor = TOKENS_KIND_COLOR[basicInference.kind] ?? '#7aa89e';
  const badgeBg = TOKENS_KIND_BG[basicInference.kind] ?? '#eef2ff';

  const health = (result as unknown as { level1: { health?: { score: number; label: string; breakdown?: Record<string, number> } } }).level1.health;
  const hotspots = level1.hotspots ?? [];
  const cycles = level1.cycles ?? [];
  const deadFiles = level1.deadFiles ?? [];

  const techChips = level0.techStack.slice(0, 8).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  const techMore = level0.techStack.length > 8 ? `<span class="chip more">+${level0.techStack.length - 8}</span>` : '';
  const langs = Object.entries(level0.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${esc(k)} ${v}`)
    .join(' · ');
  const reasons = basicInference.reasons.map((r) => `<li>${esc(r)}</li>`).join('');
  const confidence = basicInference.confidence;
  const ringDash = Math.round((confidence / 100) * 87.96);

  // 遗留 llmEnhancement 不再渲染也不再内嵌（死数据不进包）
  const cleanResult = { ...(result as unknown as Record<string, unknown>) };
  delete cleanResult['llmEnhancement'];
  const dataJson = escJson(JSON.stringify(cleanResult));
  const langData = escJson(JSON.stringify(level0.languages));
  const depData = escJson(JSON.stringify(level1.dependencyGraph.slice(0, 600)));
  const graphMeta = `${level1.dependencyGraph.length} 边 · ${level1.complexity.functions ?? 0} fn · ${level1.complexity.classes ?? 0} cls${cycles.length ? ` · ${cycles.length} 环` : ''}${health ? ` · 健康 ${health.score}` : ''}`;

  const llmHtml = '';

  const hotspotHtml = hotspots.length
    ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${hotspots
        .map(
          (h) =>
            `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--bg)"><span style="font-family:var(--font-mono);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52%">${esc(h.path)}</span><span style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:var(--subtle)">${esc(h.reasons[0] ?? '')}</span><span style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:${h.score > 70 ? 'var(--error)' : h.score > 45 ? 'var(--warning)' : 'var(--primary)'}">${h.score}</span></span></div>`,
        )
        .join('')}</div>`
    : '<div class="subtle" style="font-size:11px;margin-top:8px">暂无热点</div>';

  const cycleHtml = cycles.length
    ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${cycles
        .map(
          (c) =>
            `<div style="padding:8px 10px;border:1px solid color-mix(in srgb,var(--error) 18%, var(--border));background:color-mix(in srgb,var(--error) 6%, var(--bg));border-radius:10px;font-family:var(--font-mono);font-size:11px;word-break:break-all">${esc(c.members.join(' → '))} <span style="color:var(--error)">(${c.severity})</span></div>`,
        )
        .join('')}</div>`
    : '<div class="subtle" style="font-size:11px;margin-top:8px">无环依赖</div>';

  return `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(context.name)} — BriefRepo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{ ${cssVariables('dark')} --radius:16px; }
[data-theme="light"]{ ${cssVariables('light')} }
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--font-sans);color:var(--text);background:var(--bg);line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--primary);text-decoration:none}
.mono{font-family:var(--font-mono)} .muted{color:var(--muted)} .subtle{color:var(--subtle)}
.container{max-width:1100px;margin:0 auto;padding:24px 24px 32px}
.topbar{height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 86%, transparent);backdrop-filter:blur(12px) saturate(180%);border-bottom:1px solid var(--border);margin:-18px -14px 14px;padding:0 14px}
.brand{font-family:var(--font-mono);font-size:11px;color:var(--subtle);letter-spacing:.04em}
.toolbar{display:flex;gap:6px;align-items:center}
.btn{height:30px;padding:0 11px;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:var(--radius-full);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:var(--primary);border-color:var(--primary);color:#0f1412}
.icon-btn{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--border);background:var(--card);border-radius:var(--radius-full);cursor:pointer;color:var(--muted)}
.hero{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:16px;position:relative;overflow:hidden}
.hero::before{content:"";position:absolute;width:520px;height:520px;background:radial-gradient(circle at 30% 20%, rgba(143,184,168,.14), transparent 60%);filter:blur(28px);top:-160px;right:-120px;pointer-events:none}
.hero::after{content:"";position:absolute;width:440px;height:440px;background:radial-gradient(circle at 70% 80%, rgba(232,196,168,.12), transparent 62%);filter:blur(30px);bottom:-150px;left:-90px;pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-full);padding:6px 10px;font-size:11px;font-weight:600;color:var(--muted)}
.ring{width:32px;height:32px;position:relative;display:grid;place-items:center}
.ring svg{transform:rotate(-90deg)} .ring span{position:absolute;font-size:10px;font-weight:700;font-family:var(--font-mono);color:var(--text)}
.h1{margin:10px 0 6px;font-size:26px;line-height:1.15;letter-spacing:-.02em;font-weight:700}
.desc{margin:0;max-width:68ch;color:var(--muted);font-size:13px}
.meta{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kind-chip{display:inline-flex;align-items:center;gap:6px;background:${badgeBg};color:${badgeColor};border:1px solid color-mix(in srgb,${badgeColor} 15%, transparent);border-radius:var(--radius-full);padding:5px 10px;font-size:12px;font-weight:600}
.chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-full);padding:4px 8px;font-size:11px;font-weight:500;color:var(--muted);font-family:var(--font-mono)}
.chip.accent{background:var(--primary-50);border-color:var(--border);color:var(--primary)}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
@media(max-width:920px){.grid4{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.grid4{grid-template-columns:1fr}}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px}
.kpi-label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--subtle);font-weight:700}
.kpi-value{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-top:2px}
.kpi-sub{font-size:11px;color:var(--muted);font-family:var(--font-mono);margin-top:2px}
.main{display:grid;grid-template-columns:1fr 340px;gap:12px;margin-top:12px;align-items:start}
@media(max-width:980px){.main{grid-template-columns:1fr}}
.canvas-wrap{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;height:560px}
.canvas-head{height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;border-bottom:1px solid var(--border);background:var(--card)}
.view-switch{display:flex;gap:4px;background:var(--bg);border:1px solid var(--border);border-radius:9999px;padding:3px}
.view-btn{height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:var(--muted);font-size:11px;font-weight:600;cursor:pointer}
.view-btn.active{background:var(--card);color:var(--text);border:1px solid var(--border);box-shadow:0 1px 2px rgba(0,0,0,.06)}
#scene{flex:1;position:relative;min-height:0;background:var(--bg)}
.inspector{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;min-height:560px;display:flex;flex-direction:column}
.inspector-head{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid var(--border);font-weight:700;font-size:12px}
.inspector-body{flex:1;overflow:auto;padding:12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px;margin-top:12px}
.card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.card-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 15%, transparent);display:inline-block}
.dot.warn{background:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
@media(max-width:820px){.two{grid-template-columns:1fr}}
.footer{margin-top:14px;display:flex;justify-content:space-between;gap:12px;font-family:var(--font-mono);font-size:11px;color:var(--subtle);border-top:1px solid var(--border);padding-top:10px}
@media print{ .topbar,.view-switch{display:none !important} .main{grid-template-columns:1fr} .canvas-wrap{height:320px} }
</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<div class="topbar">
  <div class="brand">BriefRepo · <span class="mono">brepo analyze</span></div>
  <div class="toolbar">
    <button class="icon-btn" id="themeBtn" title="Theme">◐</button>
    <button class="btn" onclick="window.print()">打印</button>
    <button class="btn btn-primary" id="copyBtn">复制</button>
  </div>
</div>
<div class="container">
  <div class="hero">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="ring" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="none" stroke="var(--border)" stroke-width="3"/><circle cx="16" cy="16" r="14" fill="none" stroke="${badgeColor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${ringDash} 87.96" /></svg><span>${confidence}%</span></div>
      <span class="badge"><span style="width:7px;height:7px;border-radius:50%;background:${badgeColor}"></span> 置信度 ${confidence}% · <span style="text-transform:uppercase;letter-spacing:.06em">${esc(basicInference.level)}</span></span>
      <span class="muted mono" style="font-size:11px">本地推断 · 仅供参考</span>
    </div>
    <h1 class="h1">${esc(context.name)}</h1>
    <p class="desc">${esc(context.description || '—')}</p>
    <div class="meta">
      <span class="kind-chip"><span style="width:7px;height:7px;border-radius:50%;background:${badgeColor}"></span>${esc(kindLabelZh[basicInference.kind] ?? basicInference.kind)}</span>
      ${techChips}${techMore}
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--subtle);font-family:var(--font-mono)">生成于 ${new Date(result.generatedAt).toLocaleString('zh-CN')} · ${result.durationMs}ms · ${esc(graphMeta)}</div>
  </div>

  <div class="grid4">
    <div class="kpi"><div class="kpi-label">文件数</div><div class="kpi-value">${level0.fileCount.toLocaleString()}</div><div class="kpi-sub">${level0.totalLines.toLocaleString()} 行 · 均 ${level1.complexity.averageLinesPerFile}/文件</div></div>
    <div class="kpi"><div class="kpi-label">主语言</div><div class="kpi-value">${esc(level0.primaryLanguage ?? '—')}</div><div class="kpi-sub">${esc(langs || '—')}</div></div>
    <div class="kpi"><div class="kpi-label">活跃度</div><div class="kpi-value">${level0.git.totalCommits} <span style="font-size:12px;color:var(--muted)">commits</span></div><div class="kpi-sub">${level0.git.contributors} 人 · 近30天 ${level0.git.recentActivity}</div></div>
    <div class="kpi"><div class="kpi-label">健康分</div><div class="kpi-value" style="color:${health ? (health.label === 'healthy' ? 'var(--primary)' : health.label === 'warning' ? 'var(--warning)' : 'var(--error)') : 'var(--muted)'}">${health ? health.score : '—'}</div><div class="kpi-sub">${health ? `${esc(health.label)} · 复杂 ${(health.breakdown as Record<string, number>)?.complexity ?? '-'} · 耦合 ${(health.breakdown as Record<string, number>)?.coupling ?? '-'}` : '—'}</div></div>
  </div>

  <div class="main">
    <div class="canvas-wrap">
      <div class="canvas-head">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:12px">3D 视图 <span class="mono" style="font-weight:500;color:var(--subtle);font-size:11px">${esc(graphMeta)}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="q" placeholder="搜索文件…" style="height:26px;width:160px;border:1px solid var(--input);background:var(--input);color:var(--text);border-radius:9999px;padding:0 10px;font-size:12px;outline:none" />
          <div class="view-switch"><button class="view-btn active" data-v="city">城市</button><button class="view-btn" data-v="graph">图谱 3D</button><button class="view-btn" data-v="treemap">分布</button></div>
        </div>
      </div>
      <div id="scene"></div>
      <div style="height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:11px;color:var(--muted)"><span id="sceneHint">城市：建筑高度=log(行数)，点击检视</span><span>${level1.dependencyGraph.length} 依赖</span></div>
    </div>
    <div class="inspector">
      <div class="inspector-head"><span>检视</span><span class="mono" style="font-size:11px;color:var(--subtle)" id="inspectorState">未选</span></div>
      <div class="inspector-body" id="inspectorBody">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">热点 Top</div>
        ${hotspotHtml}
        <div style="font-size:12px;font-weight:700;margin:12px 0 0">环依赖</div>
        ${cycleHtml}
        ${deadFiles.length ? `<div style="font-size:12px;font-weight:700;margin:12px 0 0">疑似无用文件</div><div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">${deadFiles.slice(0, 8).map((p) => `<span class="chip">${esc(p)}</span>`).join('')}</div>` : ''}
        <div style="font-size:12px;font-weight:700;margin:12px 0 0">类型推断</div>
        <ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--muted)">${reasons}</ul>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip">产品分 ${basicInference.scores.product}</span><span class="chip">库分 ${basicInference.scores.library}</span><span class="chip">深度 ${level1.complexity.maxDepth}</span></div>
        <div style="margin-top:8px;font-size:11px;color:var(--subtle)">${esc(basicInference.disclaimer)}</div>
      </div>
    </div>
  </div>

  ${llmHtml}

  <div class="two">
    <section class="card"><div class="card-title">技术栈</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${techChips || '<span class="subtle">未识别</span>'}</div><div class="mono subtle" style="font-size:11px;margin-top:8px">${level0.dependencies.length} 依赖 · ${esc((context.frameworks ?? []).join(', ') || '—')} · ${esc(langs || '—')}</div></section>
    <section class="card"><div class="card-title">工程面</div><div class="mono subtle" style="font-size:11px;line-height:1.7">深度 ${level1.complexity.maxDepth} · ${level1.complexity.hasTests ? '含测试' : '暂无测试'} · ${level0.git.hasRemote ? '含远程' : '无远程'} · ${context.hasReadme ? '含 README' : '无 README'}<br/>文件树已按 InstancedMesh 聚合，大仓自动抽样 900 建筑，单 DrawCall 渲染。</div></section>
  </div>

  <div class="footer"><span>© 2026 BriefRepo · MIT · Local-first</span><span class="mono">brepo ${esc(basicInference.kind)} · ${confidence}% · ${level0.fileCount} 文件</span></div>
</div>

<script id="__brepo-data" type="application/json">${dataJson}</script>
<script id="__brepo-lang" type="application/json">${langData}</script>
<script id="__brepo-graph" type="application/json">${depData}</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const raw = document.getElementById('__brepo-data')?.textContent || '{}';
let data = {};
try { data = JSON.parse(raw); } catch {}
const depRaw = document.getElementById('__brepo-graph')?.textContent || '[]';
let deps = [];
try { deps = JSON.parse(depRaw); } catch {}

const sceneEl = document.getElementById('scene');
const qEl = document.getElementById('q');
const hintEl = document.getElementById('sceneHint');
const inspectorBody = document.getElementById('inspectorBody');
const inspectorState = document.getElementById('inspectorState');
const btns = document.querySelectorAll('.view-btn');
let view = 'city';
btns.forEach(b=> b.addEventListener('click', ()=> {
  view = b.dataset.v || 'city';
  btns.forEach(x=> x.classList.toggle('active', x===b));
  mount();
}));

let selected = null;
function setSelected(p){
  selected = p;
  inspectorState.textContent = p ? '已选' : '未选';
  if(!p) return;
  const out = deps.filter(d=> d.from===p).slice(0,10).map(d=> d.to).join('\\n') || '—';
  const incoming = deps.filter(d=> d.to===p || d.to.endsWith(p.split('/').pop()||'')).slice(0,10).map(d=> d.from).join('\\n') || '—';
  inspectorBody.innerHTML = '<div style="font-family:var(--font-mono);font-size:12px;font-weight:700;word-break:break-all;margin-bottom:8px">'+p.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div><div style="font-size:11px;color:var(--muted)">出度 · 引出</div><pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;word-break:break-all;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;margin:6px 0">'+out+'</pre><div style="font-size:11px;color:var(--muted)">入度 · 引入</div><pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;word-break:break-all;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;margin:6px 0">'+incoming+'</pre><button id="clearSel" style="height:28px;padding:0 10px;border:1px solid var(--border);background:var(--card);border-radius:9999px;cursor:pointer;font-size:11px">清除</button>';
  const btn = document.getElementById('clearSel');
  if(btn) btn.onclick = ()=> { selected=null; inspectorState.textContent='未选'; location.reload(); };
  highlight();
}

let renderer, scene, camera, controls, mesh, raycaster, pointer, buildings=[];
let graphNodes=[], graphMeshes=[], graphLines=[];
let animId=null;

function buildBuildings(){
  const tree = data.context?.fileTree || [];
  const files=[];
  const walk=(nodes, depth)=>{
    for(const n of nodes){
      if(n.type==='file') files.push({path:n.path, depth, size:n.size||0, line:n.lineCount||0});
      if(n.children) walk(n.children, depth+1);
    }
  };
  walk(tree,0);
  const filtered = files.filter(f=> !f.path.includes('node_modules')).slice(0,900);
  const byDir = new Map();
  for(const f of filtered){
    const dir = f.path.includes('/') ? f.path.slice(0,f.path.lastIndexOf('/')) : '.';
    const arr = byDir.get(dir) || []; arr.push(f); byDir.set(dir, arr);
  }
  const districts=[...byDir.entries()].sort((a,b)=> b[1].length-a[1].length).slice(0,24);
  const out=[];
  let gx=0;
  const langColor = {'TypeScript':'#7aa89e','JavaScript':'#c4a77d','Python':'#8fb8b8','Go':'#9a8fb8'};
  const primary = data.level0?.primaryLanguage || 'TypeScript';
  for(const [dir,list] of districts){
    const cols=Math.ceil(Math.sqrt(list.length));
    let lx=0, lz=0;
    for(let i=0;i<list.length;i++){
      const f=list[i];
      const h=Math.max(0.7, Math.log2((f.line||40)+10)*0.9);
      const w=0.7 + (f.path.length%5)*0.08;
      const d=0.7 + (f.depth%3)*0.12;
      out.push({path:f.path, x: gx+ lx*(1.1+w*0.2), z: lz*(1.1+d*0.2), w,d,h, color: langColor[primary]||'#7aa89e', district:dir});
      lx++; if(lx>=cols){lx=0; lz++;}
    }
    gx+= cols*1.6 + 6;
  }
  if(!out.length) return [];
  const xs=out.map(b=>b.x), zs=out.map(b=>b.z);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cz=(Math.min(...zs)+Math.max(...zs))/2;
  out.forEach(b=>{ b.x-=cx; b.z-=cz; });
  if(qEl && qEl.value.trim()){
    const needle=qEl.value.trim().toLowerCase();
    return out.filter(b=> b.path.toLowerCase().includes(needle));
  }
  return out;
}

function buildTreemap(){
  const tree=data.context?.fileTree||[];
  const files=[];
  const walk=(nodes)=>{
    for(const n of nodes){
      if(n.type==='file') files.push({path:n.path, area: Math.max(1, n.lineCount||n.size||1)});
      if(n.children) walk(n.children);
    }
  };
  walk(tree);
  return files.sort((a,b)=> b.area-a.area).slice(0,80);
}

function mount(){
  if(animId) cancelAnimationFrame(animId);
  sceneEl.innerHTML='';
  if(view==='city') mountCity();
  else if(view==='graph') mountGraph();
  else mountTreemap();
  hintEl.textContent = view==='city' ? '城市：高度=log(行数)，底座=深度，点击建筑检视' : view==='graph' ? '图谱 3D：力导，拖拽旋转，点击节点检视' : '分布：面积=行数，点击块检视';
}

function mountCity(){
  buildings=buildBuildings();
  const W=sceneEl.clientWidth||800, H=sceneEl.clientHeight||520;
  scene=new THREE.Scene(); scene.background=new THREE.Color('#0f1412'); scene.fog=new THREE.Fog('#0f1412', 42, 90);
  camera=new THREE.PerspectiveCamera(45, W/H, 0.1, 500); camera.position.set(18,18,18);
  renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(W,H); renderer.shadowMap.enabled=false;
  sceneEl.appendChild(renderer.domElement);
  controls=new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.06; controls.minDistance=6; controls.maxDistance=80; controls.maxPolarAngle=Math.PI/2.15; controls.target.set(0,0,0);
  scene.add(new THREE.AmbientLight(0xffffff,0.95));
  const dir=new THREE.DirectionalLight(0xffffff,0.95); dir.position.set(12,20,8); scene.add(dir);
  scene.add(new THREE.HemisphereLight('#e6f0ec','#0f1412',0.35));
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,140), new THREE.MeshStandardMaterial({color:'#eef3f0'})); ground.rotation.x=-Math.PI/2; ground.position.y=-0.02; scene.add(ground);
  if(!buildings.length){
    const div=document.createElement('div'); div.style.cssText='position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:12px'; div.textContent='无文件数据'; sceneEl.appendChild(div); return;
  }
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshStandardMaterial({vertexColors:false, roughness:0.85, metalness:0.05});
  mesh=new THREE.InstancedMesh(geo, mat, buildings.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy=new THREE.Object3D(); const color=new THREE.Color();
  buildings.forEach((b,i)=>{
    dummy.position.set(b.x, b.h/2, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    const isSel = selected===b.path;
    color.set(isSel ? '#ffffff' : b.color); if(isSel) color.multiplyScalar(1.15);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate=true; if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
  scene.add(mesh);
  raycaster=new THREE.Raycaster(); pointer=new THREE.Vector2();
  const onMove=(e)=>{
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer, camera);
    const hits=raycaster.intersectObject(mesh);
    if(hits[0] && hits[0].instanceId!=null){
      const b=buildings[hits[0].instanceId]; if(b) renderer.domElement.style.cursor='pointer';
    } else renderer.domElement.style.cursor='grab';
  };
  const onClick=(e)=>{
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer, camera);
    const hits=raycaster.intersectObject(mesh);
    if(hits[0] && hits[0].instanceId!=null){
      const b=buildings[hits[0].instanceId]; if(b) setSelected(b.path);
    } else setSelected(null);
  };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('click', onClick);
  const ro=new ResizeObserver(()=>{
    const nw=sceneEl.clientWidth||800, nh=sceneEl.clientHeight||520;
    camera.aspect=nw/nh; camera.updateProjectionMatrix(); renderer.setSize(nw,nh);
  }); ro.observe(sceneEl);
  const animate=()=>{
    controls.update();
    renderer.render(scene, camera);
    animId=requestAnimationFrame(animate);
  }; animate();
}

function mountGraph(){
  const W=sceneEl.clientWidth||800, H=sceneEl.clientHeight||520;
  scene=new THREE.Scene(); scene.background=new THREE.Color('#0f1412');
  camera=new THREE.PerspectiveCamera(50, W/H, 0.1, 500); camera.position.set(0,0,42);
  renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(W,H);
  sceneEl.appendChild(renderer.domElement);
  controls=new OrbitControls(camera, renderer.domElement); controls.enableDamping=true;
  scene.add(new THREE.AmbientLight(0xffffff,0.95));
  const dir=new THREE.DirectionalLight(0xffffff,0.9); dir.position.set(10,18,10); scene.add(dir);
  const edges=deps.slice(0,400);
  const deg=new Map(); edges.forEach(e=>{ deg.set(e.from,(deg.get(e.from)||0)+1); deg.set(e.to,(deg.get(e.to)||0)+1); });
  const nodes=[...deg.entries()].sort((a,b)=> b[1]-a[1]).slice(0,90).map(([id,d])=> ({id, d, g: id.startsWith('.')||id.includes('/')?1:0 }));
  const pos=new Map(), vel=new Map(); graphMeshes=[]; graphLines=[];
  nodes.forEach((n,i)=>{
    const ang=(i/nodes.length)*Math.PI*2, rad=14+(n.d%5)*2;
    const p=new THREE.Vector3(Math.cos(ang)*rad+(Math.random()-0.5)*4, Math.sin(ang)*rad+(Math.random()-0.5)*4, (Math.random()-0.5)*10);
    pos.set(n.id,p); vel.set(n.id,new THREE.Vector3());
    const geo=new THREE.SphereGeometry(0.55+Math.min(1.1,n.d*0.08),14,14);
    const mat=new THREE.MeshStandardMaterial({color: n.g?'#7aa89e':'#e8c4a8', roughness:0.7});
    const m=new THREE.Mesh(geo,mat); m.position.copy(p); m.userData.id=n.id; scene.add(m); graphMeshes.push(m);
  });
  const idSet=new Set(nodes.map(n=>n.id));
  const links=edges.filter(e=> idSet.has(e.from)&&idSet.has(e.to)).map(e=> ({s:e.from,t:e.to}));
  const lineMat=new THREE.LineBasicMaterial({color:'#2a3f38', transparent:true, opacity:0.55});
  links.forEach(l=>{
    const a=pos.get(l.s), b=pos.get(l.t); if(!a||!b) return;
    const g=new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const line=new THREE.Line(g, lineMat.clone()); scene.add(line); graphLines.push({line, s:l.s,t:l.t});
  });
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  const onClick=(e)=>{
    const r=renderer.domElement.getBoundingClientRect();
    ptr.x=((e.clientX-r.left)/r.width)*2-1; ptr.y=-((e.clientY-r.top)/r.height)*2+1;
    ray.setFromCamera(ptr,camera);
    const hits=ray.intersectObjects(graphMeshes);
    if(hits[0]) setSelected(hits[0].object.userData.id);
    else setSelected(null);
  };
  renderer.domElement.addEventListener('click', onClick);
  let t=0;
  const tick=()=>{
    t+=0.015;
    for(const n of nodes){
      const p=pos.get(n.id), v=vel.get(n.id);
      v.add(new THREE.Vector3().copy(p).multiplyScalar(-0.0009));
      for(const m of nodes){ if(m.id===n.id) continue; const q=pos.get(m.id); const d=p.distanceTo(q); if(d<6&&d>0.1){ const dir=new THREE.Vector3().subVectors(p,q).normalize().multiplyScalar(0.015/(d*0.6)); v.add(dir);} }
      for(const l of links){ if(l.s===n.id||l.t===n.id){ const o=l.s===n.id?l.t:l.s; const q=pos.get(o); if(!q) continue; const d=p.distanceTo(q); const f=(d-7)*0.0007; const dir=new THREE.Vector3().subVectors(q,p).normalize().multiplyScalar(f); v.add(dir);} }
      v.multiplyScalar(0.985); p.add(v);
      const ms=graphMeshes.find(m=> m.userData.id===n.id); if(ms){ ms.position.copy(p); if(n.id===selected){ ms.scale.setScalar(1.2+Math.sin(t*3)*0.06); } else ms.scale.setScalar(1); }
    }
    graphLines.forEach(({line,s,t:tt})=>{
      const a=pos.get(s), b=pos.get(tt); if(!a||!b) return;
      const isSel=selected && (s===selected||tt===selected);
      line.material.opacity = selected ? (isSel?0.95:0.08) : 0.55;
      line.material.color.set(isSel?'#7aa89e':'#2a3f38');
      const attr=line.geometry.getAttribute('position'); if(attr){ attr.setXYZ(0,a.x,a.y,a.z); attr.setXYZ(1,b.x,b.y,b.z); attr.needsUpdate=true; }
    });
    controls.update(); renderer.render(scene,camera); animId=requestAnimationFrame(tick);
  }; tick();
}

function mountTreemap(){
  const files=buildTreemap();
  const W=sceneEl.clientWidth||800, H=sceneEl.clientHeight||520;
  const total=files.reduce((s,f)=> s+f.area,0)||1;
  const sorted=[...files].sort((a,b)=> b.area-a.area);
  const wrap=document.createElement('div'); wrap.style.cssText='position:absolute;inset:8px;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;padding:6px;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;overflow:auto';
  sorted.forEach(f=>{
    const pct=f.area/total;
    const w=Math.max(90, Math.round(pct*W*2.2));
    const h=Math.max(44, Math.round(pct*H*3.2));
    const el=document.createElement('button');
    el.textContent=f.path.split('/').pop()||f.path;
    el.title=f.path+' · '+f.area;
    el.style.cssText='height:'+h+'px;min-width:'+w+'px;flex:1 1 '+w+'px;background:color-mix(in srgb, #7aa89e 14%, var(--card));border:1px solid color-mix(in srgb, #7aa89e 18%, var(--border));border-radius:10px;padding:6px 8px;text-align:left;cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
    el.onclick=()=> setSelected(f.path);
    wrap.appendChild(el);
  });
  sceneEl.style.position='relative';
  sceneEl.appendChild(wrap);
}

function highlight(){
  if(view!=='city' || !mesh) return;
  const color=new THREE.Color(); const dummy=new THREE.Object3D();
  buildings.forEach((b,i)=>{
    const isSel=selected===b.path;
    color.set(isSel?'#ffffff':b.color); if(isSel) color.multiplyScalar(1.15);
    mesh.setColorAt(i,color);
  });
  if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
}

qEl?.addEventListener('input', ()=> mount());
const themeBtn=document.getElementById('themeBtn');
if(themeBtn){
  const setT=(t)=>{ document.documentElement.setAttribute('data-theme',t); try{localStorage.setItem('brepo_report_theme',t);}catch{} themeBtn.textContent=t==='dark'?'◐':'○'; };
  try{ setT(localStorage.getItem('brepo_report_theme')||'dark'); }catch{ setT('dark'); }
  themeBtn.onclick=()=> setT(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
}
const copyBtn=document.getElementById('copyBtn');
if(copyBtn) copyBtn.onclick=()=> navigator.clipboard?.writeText(location.href).then(()=>{ const o=copyBtn.textContent; copyBtn.textContent='已复制'; setTimeout(()=> copyBtn.textContent=o,1200); });

mount();
</script>
</body>
</html>`;
}
