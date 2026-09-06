import { stat } from 'node:fs/promises';

export async function tryHtmlToPdf(htmlPath: string, pdfPath: string): Promise<{ ok: boolean; message: string }> {
  try {
    // dynamic import, optional — puppeteer 为可选依赖
    // @ts-ignore - optional peer dep
    const puppeteer = (await import('puppeteer').catch(() => null)) as unknown as
      | { launch: (opts: unknown) => Promise<{ newPage: () => Promise<unknown>; close: () => Promise<void> }> }
      | null;
    if (!puppeteer) {
      return {
        ok: false,
        message: '未安装 puppeteer，已生成打印优化 HTML，请在浏览器中打开后按 ⌘/Ctrl+P 导出 PDF',
      };
    }
    // verify html exists (async)
    try {
      await stat(htmlPath);
    } catch {
      return { ok: false, message: `HTML 不存在: ${htmlPath}` };
    }

    let browser: { newPage: () => Promise<{ goto: (u: string, o: unknown) => Promise<void>; pdf: (o: unknown) => Promise<void> }>; close: () => Promise<void> } | null = null;
    try {
      browser = await (puppeteer as unknown as { launch: (o: unknown) => Promise<typeof browser> }).launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser!.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
      return { ok: true, message: pdfPath };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `PDF 生成失败（已保留 HTML，浏览器打印可用）：${msg.slice(0, 200)}` };
    } finally {
      try {
        await browser?.close();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `PDF 生成失败（已保留 HTML，浏览器打印可用）：${msg.slice(0, 200)}` };
  }
}
