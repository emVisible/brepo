import { open } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';

/** 只读文件前 maxBytes 字节（utf-8 安全解码，截断处多字节字符不乱码） */
export async function readHead(fullPath: string, maxBytes: number): Promise<string | undefined> {
  let fh;
  try {
    fh = await open(fullPath, 'r');
  } catch {
    return undefined;
  }
  try {
    const buf = Buffer.alloc(Math.max(0, maxBytes));
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    // 只 write 不 end：截断处的半个字符直接丢弃，不刷出 U+FFFD（嗅探/采样场景无损）
    const dec = new StringDecoder('utf8');
    return dec.write(buf.subarray(0, bytesRead));
  } catch {
    return undefined;
  } finally {
    await fh.close().catch(() => {});
  }
}
