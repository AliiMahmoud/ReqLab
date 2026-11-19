const BYTES_PER_LINE = 16;
/** Enough to see what came back without building megabytes of text. */
export const MAX_DUMPED_BYTES = 64 * 1024;

/**
 * A binary body (e.g. an image) as a hex dump, like a hex viewer:
 * "00000000  89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52  |.PNG........IHDR|"
 */
export function hexDump(base64: string): string {
  const bytes = Uint8Array.from(atob(base64.slice(0, Math.ceil((MAX_DUMPED_BYTES * 4) / 3) + 4)), (char) =>
    char.charCodeAt(0),
  ).subarray(0, MAX_DUMPED_BYTES);
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_LINE) {
    lines.push(dumpLine(bytes.subarray(offset, offset + BYTES_PER_LINE), offset));
  }
  return lines.join("\n");
}

function dumpLine(chunk: Uint8Array, offset: number): string {
  const hex = [...chunk].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
  const text = [...chunk]
    .map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : "."))
    .join("");
  return `${offset.toString(16).padStart(8, "0")}  ${hex.padEnd(BYTES_PER_LINE * 3 - 1)}  |${text}|`;
}
