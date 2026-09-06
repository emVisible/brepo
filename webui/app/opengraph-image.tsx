import { ImageResponse } from 'next/og';

// 社交分享图：代码直出（Logo 几何 + 标题字），零图片资产、永不过期
export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 96px',
          backgroundColor: '#0A0A0B', color: '#EDEEF0',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: 44, height: 64, borderRadius: 12, backgroundColor: 'rgba(110,86,207,.45)', marginRight: 16 }} />
            <div style={{ width: 44, height: 88, borderRadius: 12, backgroundColor: 'rgba(110,86,207,.7)', marginRight: 16 }} />
            <div style={{ width: 44, height: 112, borderRadius: 12, backgroundColor: '#6E56CF', marginRight: 16 }} />
          </div>
          <div style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8B04B', marginLeft: 8, marginBottom: 96 }} />
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-0.03em' }}>BriefRepo</div>
        <div style={{ fontSize: 30, color: '#9A9AA0', marginTop: 12 }}>粘贴仓库，预览导航 · Paste a repo, preview its map</div>
      </div>
    ),
    { ...size },
  );
}
