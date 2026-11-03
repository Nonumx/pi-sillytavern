import * as z from "zod";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const latin1Decoder = new TextDecoder("latin1");
const utf8Decoder = new TextDecoder("utf-8");

function readUint32(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset);
}

function extractCharaTextChunk(bytes: Uint8Array): Uint8Array | null {
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const nextOffset = dataEnd + 4;

    if (length < 0 || nextOffset > bytes.length) {
      throw new Error("PNG 数据块已损坏");
    }

    const chunkType = latin1Decoder.decode(
      bytes.subarray(typeStart, dataStart),
    );
    if (chunkType === "IEND") break;

    if (chunkType === "tEXt") {
      const chunk = bytes.subarray(dataStart, dataEnd);
      const separator = chunk.indexOf(0);
      if (
        separator >= 0 &&
        latin1Decoder.decode(chunk.subarray(0, separator)) === "chara"
      ) {
        return chunk.subarray(separator + 1);
      }
    }

    offset = nextOffset;
  }

  return null;
}

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

function decodeCharaPayload(chunk: Uint8Array): string {
  const encoded = latin1Decoder.decode(chunk).replace(/\s+/g, "");
  try {
    const binary = atob(encoded);
    const decoded = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      decoded[i] = binary.charCodeAt(i);
    }
    return utf8Decoder.decode(decoded);
  } catch {
    return utf8Decoder.decode(chunk);
  }
}

export function parseCharacterCardPng(bytes: ArrayBuffer | Uint8Array) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!isPng(buffer)) {
    throw new Error("不是有效的 PNG 文件");
  }

  const payload = extractCharaTextChunk(buffer);
  if (!payload) {
    throw new Error("PNG 中未找到 tEXt/chara 角色卡数据");
  }

  return JSON.parse(decodeCharaPayload(payload));
}
