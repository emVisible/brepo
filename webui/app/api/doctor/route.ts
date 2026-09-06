import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    checks: [
      { name: 'Node', ok: Number(process.versions.node.split('.')[0] ?? 0) >= 18, msg: process.versions.node },
      { name: '分析', ok: true, msg: '纯本地静态分析' },
      { name: 'Runtime', ok: true, msg: 'vercel-node' },
    ],
  });
}
