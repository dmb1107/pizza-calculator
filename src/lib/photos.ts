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

/** A photo's path in the repository. */
export const photoPath = (name: string) => `${PHOTO_DIR}/${name}.jpg`;

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
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
