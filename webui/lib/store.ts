'use client';

import { create } from 'zustand';
import type { AnalysisResult } from '@briefrepo/types';
import type { Lang } from './i18n';

type View = 'treemap' | 'city';

interface WebState {
  data: AnalysisResult | null;
  view: View;
  selected: string | null;
  hover: string | null;
  search: string;
  /** 分布视图目录过滤：null = 全部 */
  treemapRoot: string | null;
  /** 分布度量：lines=按行数面积，count=按文件数平铺 */
  metric: 'lines' | 'count';
  lang: Lang;
  setData: (d: AnalysisResult | null) => void;
  setView: (v: View) => void;
  setSelected: (p: string | null) => void;
  setHover: (p: string | null) => void;
  setSearch: (s: string) => void;
  setTreemapRoot: (r: string | null) => void;
  setMetric: (m: 'lines' | 'count') => void;
  setLang: (l: Lang) => void;
}

export const useWebStore = create<WebState>((set) => ({
  data: null,
  view: 'treemap',
  selected: null,
  hover: null,
  search: '',
  treemapRoot: null,
  metric: 'lines',
  lang: 'zh',
  setData: (data) => set({ data }),
  setView: (view) => set({ view }),
  setSelected: (selected) => set({ selected }),
  setHover: (hover) => set({ hover }),
  setSearch: (search) => set({ search }),
  setTreemapRoot: (treemapRoot) => set({ treemapRoot }),
  setMetric: (metric) => set({ metric }),
  setLang: (lang) => {
    try {
      document.cookie = `bl=${lang};path=/;max-age=31536000`;
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    } catch { /* 非浏览器环境忽略 */ }
    set({ lang });
  },
}));
