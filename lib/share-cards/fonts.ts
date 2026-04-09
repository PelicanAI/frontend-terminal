import { readFile } from "fs/promises"
import { join } from "path"

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

let cachedSans: ArrayBuffer | null = null
let cachedMono: ArrayBuffer | null = null

export async function getPlexSans(): Promise<ArrayBuffer> {
  if (!cachedSans) {
    const font = await readFile(join(process.cwd(), "public/fonts/IBMPlexSans-SemiBold.woff"))
    cachedSans = bufferToArrayBuffer(font)
  }
  return cachedSans
}

export async function getPlexMono(): Promise<ArrayBuffer> {
  if (!cachedMono) {
    const font = await readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Regular.woff"))
    cachedMono = bufferToArrayBuffer(font)
  }
  return cachedMono
}
