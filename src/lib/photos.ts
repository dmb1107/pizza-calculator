/**
 * §13.3 *Each photo is a JPEG under `toppings/images/`* (APP-8, MESSAGE-73):
 * the pure parts of the photo pipeline, so Node tests reach them. Decoding
 * and encoding need a browser and live in `src/state/photoImage.ts`.
 */

/** The repository folder for photos, inside the ideas' folder. */
export const PHOTO_DIR = 'toppings/images';

/** §13.3: shrunk to about 1600 px on the long side. */
export const PHOTO_MAX_EDGE = 1600;

/** JPEG quality for the shrunk photo. */
export const PHOTO_JPEG_QUALITY = 0.82;

/**
 * The closed card's thumbnail, kept on this device only and made from the
 * photo, so a list of many ideas never decodes every full photo. Twice the
 * 56 px box, for a phone's screen.
 */
export const THUMB_EDGE = 112;

/**
 * The square copy of each photo: the centre of its frame, 600 px a side.
 * The desktop gallery and the portfolio's grid show photos square, in tiles
 * about 300 px wide at most, so a 2x screen needs 600; the full photo is
 * about three times the bytes (2.7 over eight of Dave's photos). Synced
 * beside the photo, since the Worker has no canvas to make it.
 */
export const SQUARE_EDGE = 600;

/** A photo's path in the repository. */
export const photoPath = (name: string) => `${PHOTO_DIR}/${name}.jpg`;

/** A photo's square copy's file name, and its path in the repository. */
export const squareFile = (name: string) => `${name}.square.jpg`;
export const squarePath = (name: string) => `${PHOTO_DIR}/${squareFile(name)}`;

/** The photo a square copy's file belongs to, or null for anything else. */
export function photoNameFromSquareFile(file: string): string | null {
  const m = /^([\w-]+)\.square\.jpg$/.exec(file);
  return m ? m[1]! : null;
}

/**
 * The centre square of a `width` × `height` image, and the edge to draw it
 * at: `maxEdge`, or the square's own side when that is smaller. Never enlarges.
 */
export function centreSquare(
  width: number,
  height: number,
  maxEdge: number,
): { sx: number; sy: number; side: number; edge: number } {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side, edge: Math.max(1, Math.min(side, maxEdge)) };
}

/** The photo name a file in `toppings/images/` holds, or null for anything else. */
export function photoNameFromFile(file: string): string | null {
  const m = /^([\w-]+)\.jpg$/.exec(file);
  return m ? m[1]! : null;
}

/**
 * The size to draw a `width` × `height` image at so its long side is at most
 * `maxEdge`, keeping its proportions. Never enlarges.
 */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const scale = maxEdge / long;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Bytes as base64, in chunks so a large photo doesn't overflow the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Lowercase hex SHA-256 of some bytes. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The camera's date in a photo file's EXIF, as `photo_taken` holds it
 * (`2026-11-08T19:02`), or null when the file has none. Reads the original
 * file, before the app shrinks it, since the redraw drops every tag.
 *
 * Finds the EXIF block by its `Exif\0\0` marker and TIFF header, so it reads
 * a JPEG's APP1 segment and a HEIC's Exif item alike. Takes the time the
 * photo was taken (DateTimeOriginal), then when it was digitized, then the
 * file's own date. The time is the camera's local time.
 */
export function photoTakenFromExif(bytes: Uint8Array): string | null {
  const at = exifStart(bytes);
  if (at < 0) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + at, bytes.byteLength - at);
  const little = view.getUint8(0) === 0x49;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  const fits = (o: number, n: number) => o >= 0 && o + n <= view.byteLength;

  const entries = (ifd: number): Map<number, number> => {
    const found = new Map<number, number>();
    if (!fits(ifd, 2)) return found;
    const count = u16(ifd);
    for (let k = 0; k < count; k++) {
      const e = ifd + 2 + 12 * k;
      if (!fits(e, 12)) break;
      found.set(u16(e), e);
    }
    return found;
  };
  const text = (entry: number | undefined): string | null => {
    if (entry === undefined || u16(entry + 2) !== 2) return null;
    const n = u32(entry + 4);
    const o = n <= 4 ? entry + 8 : u32(entry + 8);
    if (!fits(o, n)) return null;
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = view.getUint8(o + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  if (!fits(4, 4)) return null;
  const ifd0 = entries(u32(4));
  const exifIfd = ifd0.has(0x8769) ? entries(u32(ifd0.get(0x8769)! + 8)) : new Map<number, number>();
  for (const value of [text(exifIfd.get(0x9003)), text(exifIfd.get(0x9004)), text(ifd0.get(0x132))]) {
    const m = value && /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
    if (m && m[1] !== '0000') return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  }
  return null;
}

/** Where the TIFF header after an `Exif\0\0` marker starts, or -1. */
function exifStart(b: Uint8Array): number {
  for (let i = 0; i + 10 <= b.length; i++) {
    if (b[i] !== 0x45 || b[i + 1] !== 0x78 || b[i + 2] !== 0x69 || b[i + 3] !== 0x66 || b[i + 4] !== 0 || b[i + 5] !== 0) continue;
    const t = i + 6;
    const ii = b[t] === 0x49 && b[t + 1] === 0x49 && b[t + 2] === 0x2a && b[t + 3] === 0;
    const mm = b[t] === 0x4d && b[t + 1] === 0x4d && b[t + 2] === 0 && b[t + 3] === 0x2a;
    if (ii || mm) return t;
  }
  return -1;
}

/** How much of a picked file is read for its EXIF: a JPEG's sits at the start, a HEIC's within the first few hundred KB. */
export const EXIF_READ_BYTES = 512 * 1024;
