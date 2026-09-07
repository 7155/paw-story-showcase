/** ZIP STORE: browser-only, valid CRCs, UTF-8 filenames, no external runtime. */
export function storedZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder(); const local: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const crc32 = (bytes: Uint8Array) => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
  for (const [name, text] of Object.entries(files)) {
    const filename = encoder.encode(name); const content = encoder.encode(text); const crc = crc32(content);
    const head = new Uint8Array(30 + filename.length); const view = new DataView(head.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(12, 33, true);
    view.setUint32(14, crc, true); view.setUint32(18, content.length, true); view.setUint32(22, content.length, true); view.setUint16(26, filename.length, true); head.set(filename, 30);
    const directory = new Uint8Array(46 + filename.length); const entry = new DataView(directory.buffer);
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(8, 0x800, true); entry.setUint16(14, 33, true);
    entry.setUint32(16, crc, true); entry.setUint32(20, content.length, true); entry.setUint32(24, content.length, true); entry.setUint16(28, filename.length, true); entry.setUint32(42, offset, true); directory.set(filename, 46);
    local.push(head, content); central.push(directory); offset += head.length + content.length;
  }
  const centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0); const end = new Uint8Array(22); const footer = new DataView(end.buffer);
  footer.setUint32(0, 0x06054b50, true); footer.setUint16(8, central.length, true); footer.setUint16(10, central.length, true); footer.setUint32(12, centralSize, true); footer.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
  for (const bytes of [...local, ...central, end]) { output.set(bytes, cursor); cursor += bytes.length; }
  return output;
}
