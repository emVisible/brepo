'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnalysisResult } from '@briefrepo/types';
import { RENDER, extColorOf } from '@/styles/tokens';
import { useWebStore } from '@/lib/store';

interface Props {
  data: AnalysisResult;
  selected: string | null;
  onSelect: (p: string | null) => void;
  onHover: (p: string | null) => void;
}

type Building = {
  path: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  color: string;
  district: string;
  hot: boolean;
  dead: boolean;
  entry: boolean;
  cycle: boolean;
  inDeg: number;
  outDeg: number;
};

// 确定性 hash（布局稳定，不闪烁）
function hash01(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const STREET = 4.2;
const DEAD_COLOR = '#43434E';
const ARC_OUT = '#8E7FE8';
const ARC_IN = '#6FD3E7';
const CYCLE_RED = '#E5484D';
const ENTRY_BEAM = '#6E56CF';
const MAX_ARCS_EACH = 8;
const HUB_RINGS = 8;

export function buildBuildings(data: AnalysisResult): Building[] {
  const tree = data.context.fileTree;
  const files: { path: string; depth: number; line: number }[] = [];
  const walk = (nodes: typeof tree, depth: number) => {
    for (const n of nodes) {
      if (n.type === 'file') {
        const line = (n as { lineCount?: number }).lineCount ?? 40;
        files.push({ path: n.path, depth, line });
      }
      if (n.children) walk(n.children as unknown as typeof tree, depth + 1);
    }
  };
  walk(tree, 0);

  const hotSet = new Set((data.level1.hotspots ?? []).slice(0, 12).map((h) => h.path));
  const deadSet = new Set(data.level1.deadFiles ?? []);
  const entrySet = new Set(data.level1.entryFiles ?? []);
  const cycleSet = new Set((data.level1.cycles ?? []).flatMap((c) => c.members));
  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  for (const e of data.level1.dependencyGraph ?? []) {
    outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }

  const filtered = files
    .filter((f) => !f.path.includes('node_modules'))
    .slice(0, RENDER.cityBuildings);

  const byDir = new Map<string, typeof filtered>();
  for (const f of filtered) {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.';
    const arr = byDir.get(dir) ?? [];
    arr.push(f);
    byDir.set(dir, arr);
  }

  // 大街区居中：按规模降序，保证核心在中间而非一行
  const districts = [...byDir.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, RENDER.districts);

  const blocks = districts.map(([dir, list], di) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)));
    const rows = Math.max(1, Math.ceil(list.length / cols));
    return { dir, list, di, cols, rows, w: cols * 1.5 + 1.6, h: rows * 1.5 + 1.6 };
  });
  const pitchX = Math.max(...blocks.map((b) => b.w), 8) + STREET;
  const pitchZ = Math.max(...blocks.map((b) => b.h), 8) + STREET;
  const gridCols = Math.max(1, Math.ceil(Math.sqrt(blocks.length)));

  const centers = blocks.map((_, i) => {
    const gx = i % gridCols;
    const gz = Math.floor(i / gridCols);
    return { x: gx * pitchX, z: gz * pitchZ };
  });
  const cx0 = (Math.min(...centers.map((p) => p.x)) + Math.max(...centers.map((p) => p.x))) / 2;
  const cz0 = (Math.min(...centers.map((p) => p.z)) + Math.max(...centers.map((p) => p.z))) / 2;

  const buildings: Building[] = [];

  blocks.forEach((block, i) => {
    const cx = centers[i]!.x - cx0;
    const cz = centers[i]!.z - cz0;
    const originX = cx - ((block.cols - 1) * 1.5) / 2;
    const originZ = cz - ((block.rows - 1) * 1.5) / 2;
    // ~8% 格位留白做空地广场：城市感靠留白； deterministic，不闪烁
    const kept = block.list.filter((f) => hash01(f.path + ':keep') > 0.08);
    kept.forEach((f, j) => {
      const jx = hash01(f.path + ':x') - 0.5;
      const jz = hash01(f.path + ':z') - 0.5;
      const jh = hash01(f.path + ':h');
      const jw = hash01(f.path + ':w');
      const jr = hash01(f.path + ':r') - 0.5;
      const lx = j % block.cols;
      const lz = Math.floor(j / block.cols);
      const hot = hotSet.has(f.path);
      const dead = deadSet.has(f.path);
      const h = Math.max(0.7, Math.log2(f.line + 10) * (0.85 + jh * 0.5)) * (hot && !dead ? 1.12 : 1);
      const w = 0.62 + jw * 0.34;
      const d = 0.62 + (1 - jw) * 0.3;
      // 与分布同一语言：扩展名色；死文件灰化（鬼城）
      const col = new THREE.Color(dead ? DEAD_COLOR : extColorOf(f.path));
      if (!dead) col.offsetHSL(0, 0, (jh - 0.5) * 0.09);
      buildings.push({
        path: f.path,
        x: originX + lx * 1.5 + jx * 0.55,
        z: originZ + lz * 1.5 + jz * 0.55,
        w, d, h,
        rot: jr * 0.14, // ±4°
        color: `#${col.getHexString()}`,
        district: block.dir,
        hot: hot && !dead,
        dead,
        entry: entrySet.has(f.path),
        cycle: cycleSet.has(f.path),
        inDeg: inDeg.get(f.path) ?? 0,
        outDeg: outDeg.get(f.path) ?? 0,
      });
    });
  });

  return buildings;
}

function blockPlates(data: AnalysisResult, buildings: Building[]): { x: number; z: number; w: number; h: number; dir: string }[] {
  void data;
  const byDir = new Map<string, Building[]>();
  for (const b of buildings) {
    const arr = byDir.get(b.district) ?? [];
    arr.push(b);
    byDir.set(b.district, arr);
  }
  return [...byDir.entries()].map(([dir, list]) => {
    const xs = list.map((b) => b.x);
    const zs = list.map((b) => b.z);
    return {
      dir,
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
      w: Math.max(...xs) - Math.min(...xs) + 2.6,
      h: Math.max(...zs) - Math.min(...zs) + 2.6,
    };
  });
}

/** 依赖目标解析：from 恒为文件路径；to 多为 specifier，尽力匹配到楼 */
function resolveTarget(spec: string, byPath: Map<string, Building>): Building | null {
  if (byPath.has(spec)) return byPath.get(spec)!;
  const core = spec.replace(/^(\.\/)+/, '').replace(/^(\.\.\/)+/, '');
  if (!core || core === '.' || core.length < 2) return null;
  for (const [p, b] of byPath) {
    if (p === core || p.endsWith(`/${core}`)) return b;
    const noExt = p.replace(/\.[^.]+$/, '');
    if (noExt === core || noExt.endsWith(`/${core}`)) return b;
  }
  return null;
}

// 关系城市：分布回答“哪儿大”，这里回答“谁连谁、哪儿死、哪儿是环、从哪进”
// 高度/标尺/街区与分布同语言；颜色切扩展名；热点冠层保留
export function CityScene({ data, selected, onSelect, onHover }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const buildings = useMemo(() => buildBuildings(data), [data]);
  const plates = useMemo(() => blockPlates(data, buildings), [data, buildings]);
  const byPath = useMemo(() => new Map(buildings.map((b) => [b.path, b])), [buildings]);
  const hubs = useMemo(
    () => [...buildings].filter((b) => b.inDeg > 0).sort((a, b) => b.inDeg - a.inDeg).slice(0, HUB_RINGS),
    [buildings],
  );
  const edges = useMemo(() => data.level1.dependencyGraph ?? [], [data]);
  const cbRef = useRef({ onSelect, onHover });
  cbRef.current = { onSelect, onHover };
  const apiRef = useRef<{
    repaint: (sel: string | null, hov: string | null) => void;
    rebuildArcs: (sel: string | null) => void;
    setHubsVisible: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0A0B');
    scene.fog = new THREE.Fog('#0A0A0B', 46, 100);
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
    camera.position.set(24, 18, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 90;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.target.set(0, 1.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.1);
    dir.position.set(14, 24, 10);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight('#EDEEF0', '#0A0A0B', 0.3));

    // 地面 + 街道网格
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: '#0A0A0B', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.14;
    scene.add(ground);
    const grid = new THREE.GridHelper(180, 60, '#26262E', '#16161B');
    grid.position.y = -0.12;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    scene.add(grid);

    // 街区基座 + 目录名牌
    const plateMat = new THREE.MeshStandardMaterial({ color: '#121217', roughness: 0.95 });
    const makeLabel = (text: string): THREE.Sprite => {
      const pad = 18;
      const cv = document.createElement('canvas');
      const g = cv.getContext('2d')!;
      g.font = '600 26px "Geist Mono", monospace';
      const tw = Math.min(300, g.measureText(text).width);
      cv.width = Math.ceil(tw + pad * 2);
      cv.height = 52;
      const g2 = cv.getContext('2d')!;
      g2.font = '600 26px "Geist Mono", monospace';
      g2.fillStyle = 'rgba(154,154,160,.92)';
      g2.textBaseline = 'middle';
      g2.fillText(text, pad, 27);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
      const s = 0.028;
      sp.scale.set(cv.width * s, cv.height * s, 1);
      return sp;
    };
    plates.forEach((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.22, p.h), plateMat);
      m.position.set(p.x, -0.11, p.z);
      scene.add(m);
      const label = makeLabel(p.dir === '.' ? '· 根' : p.dir.split('/').pop() ?? p.dir);
      label.position.set(p.x, 0.55, p.z + p.h / 2 + 1.1);
      scene.add(label);
    });

    // 高度标尺
    const scaleH = (lines: number) => Math.max(0.7, Math.log2(lines + 10) * 0.9);
    const poleX = -(Math.max(...plates.map((p) => p.x + p.w / 2), 10) + 6);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 14, 8),
      new THREE.MeshBasicMaterial({ color: '#3A3A44' }),
    );
    pole.position.set(poleX, 7, 0);
    scene.add(pole);
    [100, 1000, 10000].forEach((lines) => {
      const y = scaleH(lines);
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: '#6B6B74' }),
      );
      tick.position.set(poleX, y, 0);
      scene.add(tick);
      const tag = makeLabel(lines >= 1000 ? `${lines / 1000}k行` : `${lines}行`);
      tag.position.set(poleX + 2.2, y, 0);
      scene.add(tag);
    });

    // 楼体
    let mesh: THREE.InstancedMesh | null = null;
    if (buildings.length) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.08 });
      mesh = new THREE.InstancedMesh(geo, mat, buildings.length);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      buildings.forEach((b, i) => {
        dummy.position.set(b.x, 0, b.z);
        dummy.rotation.set(0, b.rot, 0);
        dummy.scale.set(b.w, b.h, b.d);
        dummy.updateMatrix();
        mesh!.setMatrixAt(i, dummy.matrix);
        col.set(b.color);
        mesh!.setColorAt(i, col);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);

      const hots = buildings.filter((b) => b.hot);
      if (hots.length) {
        const cg = new THREE.BoxGeometry(0.3, 0.12, 0.3);
        const cm = new THREE.MeshBasicMaterial({ color: '#E8B04B' });
        const crown = new THREE.InstancedMesh(cg, cm, hots.length);
        const d2 = new THREE.Object3D();
        hots.forEach((b, i) => {
          d2.position.set(b.x, b.h + 0.08, b.z);
          d2.updateMatrix();
          crown.setMatrixAt(i, d2.matrix);
        });
        crown.instanceMatrix.needsUpdate = true;
        scene.add(crown);
      }
    }

    // 入口灯塔：细高光柱，“从这里进城”
    for (const b of buildings) {
      if (!b.entry) continue;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, b.h + 7, 8),
        new THREE.MeshBasicMaterial({ color: ENTRY_BEAM, transparent: true, opacity: 0.4, depthWrite: false }),
      );
      beam.position.set(b.x, (b.h + 7) / 2, b.z);
      scene.add(beam);
    }

    // 环依赖：红色线框，呼吸脉冲
    const cycleMat = new THREE.LineBasicMaterial({ color: CYCLE_RED, transparent: true, opacity: 0.8 });
    for (const b of buildings) {
      if (!b.cycle) continue;
      const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w + 0.16, b.h + 0.16, b.d + 0.16));
      const box = new THREE.LineSegments(eg, cycleMat);
      box.position.set(b.x, b.h / 2, b.z);
      box.rotation.y = b.rot;
      scene.add(box);
    }

    // 枢纽光环：无选中时显形，心脏在哪一眼可见
    const hubGroup = new THREE.Group();
    for (const b of hubs) {
      const R = 0.9 + Math.sqrt(b.inDeg) * 0.35;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(R, R + 0.16, 40),
        new THREE.MeshBasicMaterial({ color: ARC_IN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.x, 0.03, b.z);
      hubGroup.add(ring);
    }
    scene.add(hubGroup);

    // 依赖弧线层（选中时重建）
    const arcsGroup = new THREE.Group();
    scene.add(arcsGroup);
    const travelers: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; t: number; speed: number }[] = [];
    const travelerGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const arcTop = (b: Building) => new THREE.Vector3(b.x, b.h + 0.3, b.z);
    const addArc = (from: Building, to: Building, color: string) => {
      const a = arcTop(from);
      const c = arcTop(to);
      const dist = a.distanceTo(c);
      const mid = a.clone().add(c).multiplyScalar(0.5);
      mid.y = Math.max(a.y, c.y) + 3 + dist * 0.12;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, c);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 }),
      );
      arcsGroup.add(line);
      const dot = new THREE.Mesh(travelerGeo, new THREE.MeshBasicMaterial({ color }));
      dot.position.copy(a);
      arcsGroup.add(dot);
      travelers.push({ curve, mesh: dot, t: Math.random(), speed: 0.25 + Math.random() * 0.2 });
    };
    const clearArcs = () => {
      for (let i = arcsGroup.children.length - 1; i >= 0; i--) {
        const o = arcsGroup.children[i]!;
        const m = o as THREE.Mesh | THREE.Line;
        if (m.geometry) m.geometry.dispose();
        const mt = (m as THREE.Mesh).material as THREE.Material | undefined;
        if (mt) mt.dispose(); // travelerGeo 共享几何另行释放，此处只清材质
        arcsGroup.remove(o);
      }
      travelers.length = 0;
    };
    const rebuildArcs = (sel: string | null) => {
      clearArcs();
      if (!sel) return;
      const src = byPath.get(sel);
      if (!src) return;
      const outs = edges.filter((e) => e.from === sel).slice(0, MAX_ARCS_EACH * 2);
      let n = 0;
      for (const e of outs) {
        if (n >= MAX_ARCS_EACH) break;
        const t = resolveTarget(e.to, byPath);
        if (!t || t.path === sel) continue;
        addArc(src, t, ARC_OUT);
        n++;
      }
      const ins = edges.filter((e) => e.to === sel).slice(0, MAX_ARCS_EACH * 2);
      n = 0;
      for (const e of ins) {
        if (n >= MAX_ARCS_EACH) break;
        const t = byPath.get(e.from);
        if (!t || t.path === sel) continue;
        addArc(t, src, ARC_IN);
        n++;
      }
    };

    const paint = (sel: string | null, hov: string | null) => {
      if (!mesh) return;
      const col = new THREE.Color();
      buildings.forEach((b, i) => {
        if (sel === b.path) col.set('#ffffff');
        else {
          col.set(b.color);
          if (hov === b.path) col.lerp(new THREE.Color('#ffffff'), 0.45);
        }
        mesh!.setColorAt(i, col);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    apiRef.current = {
      repaint: paint,
      rebuildArcs,
      setHubsVisible: (v: boolean) => {
        hubGroup.visible = v;
      },
    };
    paint(selected, null);
    rebuildArcs(selected);
    hubGroup.visible = !selected;

    // 入场：有选中则飞到该楼（分布一键飞入），否则全景
    const flyTarget = selected ? byPath.get(selected) : undefined;
    let flyT = 0;
    const FLY_MS = 900;
    const camFrom = flyTarget
      ? { pos: new THREE.Vector3(flyTarget.x + 34, flyTarget.h + 26, flyTarget.z + 34), tgt: new THREE.Vector3(0, 1.2, 0) }
      : null;
    const camTo = flyTarget
      ? { pos: new THREE.Vector3(flyTarget.x + 11, flyTarget.h + 9, flyTarget.z + 11), tgt: new THREE.Vector3(flyTarget.x, flyTarget.h * 0.55, flyTarget.z) }
      : null;
    if (camFrom && camTo) {
      camera.position.copy(camFrom.pos);
      controls.target.copy(camFrom.tgt);
      controls.enabled = false;
    }
    const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const pick = (e: PointerEvent) => {
      if (!mesh) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObject(mesh);
      if (hits[0] && hits[0].instanceId != null) return buildings[hits[0].instanceId] ?? null;
      return null;
    };
    const onClick = (e: PointerEvent) => {
      const b = pick(e);
      cbRef.current.onSelect(b ? b.path : null);
    };
    const onMove = (e: PointerEvent) => {
      const b = pick(e);
      cbRef.current.onHover(b ? b.path : null);
      renderer.domElement.style.cursor = b ? 'pointer' : 'grab';
    };
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('pointermove', onMove);

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth || 800;
      const nh = el.clientHeight || 520;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (camFrom && camTo && flyT < 1) {
        flyT = Math.min(1, flyT + (dt * 1000) / FLY_MS);
        const e = easeOut(flyT);
        camera.position.lerpVectors(camFrom.pos, camTo.pos, e);
        controls.target.lerpVectors(camFrom.tgt, camTo.tgt, e);
        if (flyT >= 1) controls.enabled = true;
      }
      // 环呼吸 + 弧线旅行者
      cycleMat.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(now / 380));
      for (const tr of travelers) {
        tr.t = (tr.t + dt * tr.speed) % 1;
        tr.mesh.position.copy(tr.curve.getPoint(tr.t));
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('pointermove', onMove);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry && m.geometry !== travelerGeo) m.geometry.dispose();
        const mt = (m as THREE.Mesh).material as THREE.Material | undefined;
        const mats = Array.isArray(mt) ? mt : mt ? [mt] : [];
        // dispose 幂等：共享材质（cycleMat/弧线材质）重复释放安全
        mats.forEach((x) => {
          (x as unknown as { map?: THREE.Texture }).map?.dispose();
          x.dispose();
        });
      });
      travelerGeo.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  const hover = useWebHover();
  // 重染色跟 hover 走（便宜）；弧线重建 + 光环显隐只跟选中走（贵，不能放 hover 里）
  useEffect(() => {
    apiRef.current?.repaint(selected, hover);
  }, [selected, hover]);
  useEffect(() => {
    apiRef.current?.rebuildArcs(selected);
    apiRef.current?.setHubsVisible(!selected);
  }, [selected]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'grab' }} />;
}

// 轻量订阅 hover，重染色高亮
function useWebHover(): string | null {
  return useWebStore((s) => s.hover);
}
