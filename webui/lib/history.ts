'use client';

// 历史报告持久化（localStorage）：刷新/回退可恢复；运行前查重命中即打开。
import type { AnalysisResult } from '@briefrepo/types';

export interface HistoryEntry {
  id: string;
  path: string;
  skill: string;
  extsKey: string;
  createdAt: number;
  durationMs: number;
  kind: string;
  confidence: number;
  fileCount: number;
  result: AnalysisResult;
}

const KEY = 'brepo-history';
const MAX = 8;

export function normalizePath(p: string): string {
  return p.trim().replace(/\/+$/, '');
}

export function extsKeyOf(exts: string[] | undefined): string {
  return [...(exts ?? [])].map((e) => e.trim().toLowerCase()).filter(Boolean).sort().join(',');
}

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr.filter((e) => e && e.id && e.result) : [];
  } catch {
    return [];
  }
}

export function listHistory(): HistoryEntry[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function findHistory(path: string, exts: string[] | undefined): HistoryEntry | undefined {
  const p = normalizePath(path);
  const k = extsKeyOf(exts);
  return readAll().find((e) => e.path === p && (e.extsKey ?? '') === k);
}

export function getHistory(id: string): HistoryEntry | undefined {
  return readAll().find((e) => e.id === id);
}

export function saveHistory(entry: HistoryEntry): void {
  try {
    const rest = readAll().filter((e) => e.id !== entry.id).slice(0, MAX - 1);
    localStorage.setItem(KEY, JSON.stringify([entry, ...rest]));
  } catch {
    // 配额不足：逐条淘汰最旧后重试一次，仍失败则放弃（不阻断主流程）
    try {
      const rest = readAll().filter((e) => e.id !== entry.id).slice(0, 2);
      localStorage.setItem(KEY, JSON.stringify([entry, ...rest]));
    } catch {
      /* 忽略 */
    }
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}
