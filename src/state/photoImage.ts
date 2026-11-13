/**
 * §13.3 (APP-8): a picked file becomes the JPEG the app keeps, shrunk on the
 * device to about 1600 px on its long side; the original never leaves it.
 * Browser only: decoding needs an image element and a canvas.
 *
 * The file is decoded through an `<img>`, which applies a photo's EXIF
 * orientation (WebKit's default `image-orientation: from-image`), so a
 * portrait photo stays portrait, and which decodes whatever the browser can
 * show, HEIC included where the system can.
 */

import {
  EXIF_READ_BYTES,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE,
  THUMB_EDGE,
  fitWithin,
  photoTakenFromExif,
  sha256Hex,
} from '../lib/photos';

export interface ShrunkPhoto {
  blob: Blob;
  width: number;
  height: number;
  /** Lowercase hex SHA-256 of the JPEG, for its name. */
  sha256: string;
  /** The camera's date from the original file, or null when it has none (§13.2 `photo_taken`). */
  taken: string | null;
}

/** Thrown when a file can't be opened as a photo (§13.2's message). */
export class NotAPhotoError extends Error {}

async function decode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new NotAPhotoError();
    return img;
  } catch (e) {
    throw e instanceof NotAPhotoError ? e : new NotAPhotoError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(img: HTMLImageElement, maxEdge: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new NotAPhotoError());
  // JPEG has no transparency: a PNG's clear pixels go white, not black.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        // Release the canvas's pixels now rather than at the next collection.
        canvas.width = 0;
        canvas.height = 0;
        if (blob) resolve({ blob, width, height });
        else reject(new NotAPhotoError());
      },
      'image/jpeg',
      PHOTO_JPEG_QUALITY,
    ),
  );
}

/** The JPEG for a picked file. Throws `NotAPhotoError` for anything that isn't one. */
export async function shrinkPhoto(file: Blob): Promise<ShrunkPhoto> {
  const taken = photoTakenFromExif(new Uint8Array(await file.slice(0, EXIF_READ_BYTES).arrayBuffer()));
  const img = await decode(file);
  const out = await toJpeg(img, PHOTO_MAX_EDGE);
  img.src = '';
  const sha256 = await sha256Hex(new Uint8Array(await out.blob.arrayBuffer()));
  return { ...out, sha256, taken };
}

/** The closed card's thumbnail for a stored photo. */
export async function makeThumb(photo: Blob): Promise<Blob> {
  const img = await decode(photo);
  const { blob } = await toJpeg(img, THUMB_EDGE);
  img.src = '';
  return blob;
}

/** An image's displayed size, EXIF orientation applied. */
export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const img = await decode(blob);
  const size = { width: img.naturalWidth, height: img.naturalHeight };
  img.src = '';
  return size;
}
