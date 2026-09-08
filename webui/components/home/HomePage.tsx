'use client';

// 首页：双语 + 双主题 + 动态背景（幽灵 treemap 潮汐 / 数据流线 / 聚焦入场）
// 文案唯一来源 lib/i18n，本文件不硬编码任何展示文案
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { streamAnalyze } from '@/lib/api-client';
import { checkRepoExists } from '@/lib/repo-check';
import { parseRepoInput } from '@briefrepo/types';
import { useWebStore } from '@/lib/store';
import { dict, type Lang } from '@/lib/i18n';
import { squarify } from '@/lib/treemap';
import { Logo } from '@/components/ui/Logo';
import { GitHubBtn, LangToggle } from '@/components/ui/TopActions';
import { clearHistory, extsKeyOf, findHistory, listHistory, normalizePath, saveHistory, type HistoryEntry } from '@/lib/history';
import type { AnalyzerEvent } from '@briefrepo/types';

// 幽灵 treemap：确定性静态布局（装饰，无信息），透明度压到只剩轮廓
const GHOST: { key: string; n: number }[] = [
  { key: 'a', n: 42 }, { key: 'b', n: 30 }, { key: 'c', n: 26 }, { key: 'd', n: 22 },
  { key: 'e', n: 18 }, { key: 'f', n: 15 }, { key: 'g', n: 13 }, { key: 'h', n: 12 },
  { key: 'i', n: 10 }, { key: 'j', n: 9 }, { key: 'k', n: 8 }, { key: 'l', n: 7 },
  { key: 'm', n: 6 }, { key: 'n', n: 6 }, { key: 'o', n: 5 }, { key: 'p', n: 5 },
  { key: 'q', n: 4 }, { key: 'r', n: 4 }, { key: 's', n: 3 }, { key: 't', n: 3 },
  { key: 'u', n: 2 }, { key: 'v', n: 2 }, { key: 'w', n: 2 }, { key: 'x', n: 1 },
];

const GW = 1200;
const GH = 750;

function GhostTreemap() {
  const rects = useMemo(() => squarify(GHOST, 0, 0, GW, GH), []);
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0 }}>
      {rects.map((r) => {
        // 对角错峰：潮汐像呼吸灯扫过，而非整体明灭
        const phase = (Math.floor((r.x / GW) * 6) + Math.floor((r.y / GH) * 4)) % 8;
        return (
          <div
            key={r.key}
            className="brepo-anim"
            style={{
              position: 'absolute',
              left: `${(r.x / GW) * 100}%`,
              top: `${(r.y / GH) * 100}%`,
              width: `${(r.w / GW) * 100}%`,
              height: `${(r.h / GH) * 100}%`,
              border: '1px solid rgba(110,86,207,.10)',
              borderRadius: 6,
              background: r.w > 90 && r.h > 70 ? 'rgba(110,86,207,.045)' : 'transparent',
              animation: `brepo-tide 6s ease-in-out ${phase * 0.75}s infinite`,
            }}
          />
        );
      })}
      {/* 数据流线：沿块缝爬行，暗示“正在分析” */}
      <svg aria-hidden viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path
          className="brepo-anim"
          d="M -20 600 C 300 520, 520 660, 800 460 S 1120 300, 1240 360"
          fill="none" stroke="rgba(110,86,207,.28)" strokeWidth="1.5"
          strokeDasharray="6 10" style={{ animation: 'brepo-dash 12s linear infinite' }}
        />
        <path
          className="brepo-anim"
          d="M -20 180 C 260 240, 560 120, 840 260 S 1100 420, 1240 380"
          fill="none" stroke="rgba(110,86,207,.18)" strokeWidth="1.5"
          strokeDasharray="6 12" style={{ animation: 'brepo-dash 18s linear infinite reverse' }}
        />
      </svg>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 12px',
  border: '1px solid var(--input-border)', background: 'var(--input)',
  color: 'var(--text)', borderRadius: 10, fontSize: 13, fontFamily: 'var(--font-mono)',
};

const EXT_GROUPS = [
  { key: 'styles', exts: ['css', 'scss', 'less'], labelKey: 'optStyles' },
  { key: 'pages', exts: ['html'], labelKey: 'optPages' },
  { key: 'images', exts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico'], labelKey: 'optImages' },
  { key: 'fonts', exts: ['woff', 'woff2', 'ttf', 'otf', 'eot'], labelKey: 'optFonts' },
  { key: 'media', exts: ['mp4', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg', 'flac'], labelKey: 'optMedia' },
  { key: 'archives', exts: ['zip', 'tar', 'gz', '7z', 'rar'], labelKey: 'optArchives' },
  { key: 'data', exts: ['json', 'yaml', 'yml', 'toml', 'xml'], labelKey: 'optData' },
  { key: 'pdfs', exts: ['pdf'], labelKey: 'optPdfs' },
] as const;

export function HomePage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const setData = useWebStore((s) => s.setData);
  const setLang = useWebStore((s) => s.setLang);
  const t = dict[lang];
  const [path, setPath] = useState('');
  const [pct, setPct] = useState(0);
  // 进度行按任务键合并且原地更新：同 phase:step 只刷新最后一行，不刷屏
  const [log, setLog] = useState<{ key: string; text: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [showOpts, setShowOpts] = useState(false);
  const [exts, setExts] = useState<string[]>([]);
  const [hit, setHit] = useState<HistoryEntry | null>(null);
  const [histVer, setHistVer] = useState(0);
  const [mounted, setMounted] = useState(false);
  // 单次运行的取消控制器：取消按钮 abort → 服务端停止推送 + 清理，最终由真杀（worker）兜底
  const abortRef = useRef<AbortController | null>(null);
  // 日志框自动滚动：默认粘底；用户手动上翻后不再强拉，避免阅读时跳动
  const logRef = useRef<HTMLPreElement>(null);
  const stickRef = useRef(true);
  const reduceMotion = useReducedMotion();
  // localStorage 只在客户端可读：首渲与 SSR 一致（空），挂载后再读真实历史，避免 hydration mismatch
  const history = useMemo(() => (mounted ? listHistory() : []), [histVer, mounted]);

  const toggleExt = (e: string) =>
    setExts((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  const toggleGroup = (group: readonly string[]) => {
    const all = group.every((e) => exts.includes(e));
    setExts((prev) => (all ? prev.filter((x) => !group.includes(x)) : [...new Set([...prev, ...group])]));
  };

  useEffect(() => {
    setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  /** 同任务键则覆盖最后一行（如“依赖解析中 · 12/627”→“· 300/627”），新任务才另起一行 */
  function pushLog(key: string, text: string) {
    setLog((prev) => {
      const last = prev[prev.length - 1];
      const next =
        last && last.key === key ? [...prev.slice(0, -1), { key, text }] : [...prev, { key, text }];
      return next.length > 100 ? next.slice(-100) : next;
    });
  }

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bgX = useSpring(useTransform(mx, [-0.5, 0.5], [18, -18]), { stiffness: 50, damping: 20 });
  const bgY = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 50, damping: 20 });

  function restore(entry: HistoryEntry) {
    const st = useWebStore.getState();
    st.setData(entry.result);
    st.setView('treemap');
    st.setSelected(null);
    st.setTreemapRoot(null);
    router.push(`/r/${entry.id}`);
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function run(force = false) {
    if (!path.trim() || running) return;
    // 先解析归一：完整链接 / github.com 前缀 / SSH / owner/repo 速记 → 统一规范链接
    const repo = parseRepoInput(path);
    if (!repo) {
      setHit(null);
      setPct(0);
      setLog([{ key: `invalid:${Date.now()}`, text: `✗ ${t.invalidRepo}` }]);
      return;
    }
    const canonical = repo.url;
    // 查重：同仓库+同选项命中历史则提示，不直接重跑
    if (!force) {
      const found = findHistory(canonical, exts);
      if (found) {
        setHit(found);
        return;
      }
    }
    setHit(null);
    setRunning(true);
    setPct(0);
    setLog([]);
    stickRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      // 预检：仓库不存在/私有直接拦下，省一次下载等待
      pushLog('check:repo', t.checkingRepo);
      const exists = await checkRepoExists(repo, ctrl.signal);
      if (!exists.ok) {
        if (exists.reason === 'not-found') {
          pushLog('check:repo', `✗ ${t.repoNotFound(repo.owner, repo.repo)}`);
        } else {
          pushLog('check:repo', `✗ ${t.repoCheckFailed}`);
        }
        return;
      }
      const result = await streamAnalyze(
        {
          path: canonical,
          includeExts: exts.length ? exts : undefined,
        },
        (e: AnalyzerEvent) => {
          // 进度只增不减：后端事件可能乱序到达，bar 绝不倒退
          setPct((p) => Math.max(p, e.pct));
          pushLog(`${e.phase}:${e.step || e.phase}`, `[${String(e.pct).padStart(3, ' ')}%] ${e.phase} · ${e.msg}`);
        },
        { signal: ctrl.signal },
      );
      saveHistory({
        id: result.id,
        path: normalizePath(canonical),
        skill: 'basic',
        extsKey: extsKeyOf(exts),
        createdAt: Date.now(),
        durationMs: result.durationMs,
        kind: result.kind,
        confidence: result.confidence,
        fileCount: result.result.level0.fileCount,
        result: result.result,
      });
      setHistVer((v) => v + 1);
      setData(result.result);
      router.push(`/r/${result.id}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        pushLog(`abort:${Date.now()}`, `■ ${t.cancelled}`);
      } else if (e instanceof Error && e.name === 'StallError') {
        pushLog(`stall:${Date.now()}`, `✗ ${t.connLost}`);
      } else {
        pushLog(`error:${Date.now()}`, `✗ ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  }

  return (
    <main
      onMouseMove={reduceMotion ? undefined : (e) => {
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
      style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}
    >
      {/* 背景层：幽灵 treemap + 网格 + 顶部微光（装饰，无信息） */}
      <div aria-hidden style={{ position: 'absolute', inset: -48, pointerEvents: 'none' }}>
        <motion.div
          className={reduceMotion ? undefined : 'brepo-anim'}
          style={{
            x: reduceMotion ? 0 : bgX, y: reduceMotion ? 0 : bgY, position: 'absolute', inset: 0,
            animation: reduceMotion ? undefined : 'brepo-focus 0.8s ease-out',
          }}
          animate={reduceMotion ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GhostTreemap />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent)',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(110,86,207,.08), transparent)' }} />
        </motion.div>
      </div>

      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', padding: '28px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} />
          <span style={{ fontWeight: 800, letterSpacing: '-.01em', fontSize: 15 }}>BriefRepo</span>
          <span style={{ flex: 1 }} />
          <LangToggle />
          <GitHubBtn />
        </div>

        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 56 }}>
          <h1 style={{ fontSize: 34, letterSpacing: '-.03em', lineHeight: 1.15, margin: 0 }}>{t.heroTitle}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: '52ch', margin: '10px 0 0' }}>{t.heroSub}</p>
        </motion.div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 16, marginTop: 24 }}>
          <label htmlFor="brepo-path" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--subtle)' }}>{t.pathLabel}</label>
          <input
            id="brepo-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
            placeholder={t.pathPlaceholder}
            style={{ ...inputStyle, marginTop: 6 }}
          />

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setShowOpts((v) => !v)}
              aria-expanded={showOpts}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0 }}
            >
              {showOpts ? '▾' : '▸'} {t.filterTitle}{exts.length ? ` · +${exts.length}` : ''}
            </button>
            <AnimatePresence initial={false}>
              {showOpts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {EXT_GROUPS.map((g) => {
                      const label = t[g.labelKey] as string;
                      const all = g.exts.every((e) => exts.includes(e));
                      const some = !all && g.exts.some((e) => exts.includes(e));
                      return (
                        <button
                          key={g.key}
                          onClick={() => toggleGroup(g.exts)}
                          aria-pressed={all}
                          title={g.exts.join(', ')}
                          style={{
                            background: all ? 'rgba(110,86,207,.16)' : 'transparent',
                            border: `1px solid ${all ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 9999, color: all ? 'var(--text)' : 'var(--muted)',
                            fontSize: 11, padding: '5px 11px', cursor: 'pointer',
                            boxShadow: some && !all ? 'inset 2px 0 0 var(--primary)' : undefined,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {hit && !running && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 12px', border: '1px dashed rgba(255,255,255,.2)', borderRadius: 10, fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.historyHit}（{new Date(hit.createdAt).toLocaleString()} · {hit.kind} {hit.confidence}%）
                  </span>
                  <button onClick={() => restore(hit)} style={{ background: 'var(--primary)', border: '1px solid var(--primary)', color: '#fff', borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>
                    {t.historyOpen}
                  </button>
                  <button onClick={() => run(true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 9999, fontSize: 11, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>
                    {t.historyReanalyze}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => (running ? cancel() : run())}
            disabled={!running && !path.trim()}
            style={{ width: '100%', height: 40, marginTop: 14, background: running ? 'transparent' : 'var(--primary)', border: '1px solid var(--primary)', color: running ? 'var(--primary)' : '#fff', borderRadius: 9999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {running ? `${t.cancel} · ${pct}%` : t.run}
          </button>
          {(pct > 0 || log.length > 0) && (
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 10 }} aria-live="polite">
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', transition: 'width .3s' }} />
              </div>
              <pre
                ref={logRef}
                onScroll={(ev) => {
                  const el = ev.currentTarget;
                  stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
                }}
                className="mono" style={{ marginTop: 8, maxHeight: 140, overflow: 'auto', fontSize: 11, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{log.map((l) => l.text).join('\n')}</pre>
            </div>
          )}
        </div>

        {mounted && history.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 24, paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtle)' }}>{t.historyTitle}</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => { clearHistory(); setHistVer((v) => v + 1); }}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--subtle)', fontSize: 11, padding: 0 }}
              >
                {t.historyClear}
              </button>
            </div>
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => restore(h)}
                title={h.path}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 8, width: '100%',
                  background: 'transparent', border: 0, cursor: 'pointer', padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,.06)', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--primary)', flexShrink: 0, display: 'inline-block', width: '13ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.kind}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--primary)', flexShrink: 0, display: 'inline-block', width: '4ch', textAlign: 'right' }}>{h.confidence}%</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.path}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--subtle)', flexShrink: 0, display: 'inline-block', width: '20ch', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new Date(h.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
