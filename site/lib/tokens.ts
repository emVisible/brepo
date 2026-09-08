// 同源 tokens — 拷贝自 @briefrepo/tokens，避免跨包依赖
export const colors = {
  bg: '#0A0A0B',
  text: '#EDEEF0',
  muted: '#9A9AA0',
  subtle: '#6B6B74',
  border: '#232326',
  primary: '#6E56CF',
} as const;
export const extTile: Record<string, string> = {
  ts: '#6E9FFF', tsx: '#6E9FFF', js: '#E5C558', jsx: '#E5C558', py: '#58B7A6', go: '#6FD3E7', rs: '#E08A5A', java: '#E06E6E', md: '#8E8EA0', json: '#A8B04B', yml: '#A8B04B',
};
export function extColorOf(name: string): string {
  const i = name.lastIndexOf('.');
  const ext = i < 0 ? '' : name.slice(i + 1).toLowerCase();
  return extTile[ext] ?? '#71717A';
}
