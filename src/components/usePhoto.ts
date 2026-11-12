import { useEffect, useState } from 'react';
import { imageSize, makeThumb } from '../state/photoImage';
import { photoOfKey, thumbKey, type PhotoStore } from '../state/photoStore';

export interface ShownPhoto {
  url: string;
  width: number;
  height: number;
}

/** Re-runs whenever an entry for `name` is written or deleted. */
function usePhotoVersion(photos: PhotoStore, name: string | null): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (name === null) return;
    return photos.subscribe((key) => {
      if (photoOfKey(key) === name) setVersion((v) => v + 1);
    });
  }, [photos, name]);
  return version;
}

/**
 * §13.2 (APP-8): the closed card's thumbnail for a photo, made here from the
 * stored photo the first time it is wanted and kept beside it, so a long
 * list decodes only small images. Null until there is one: the photo may
 * not have been fetched yet. Its size gives the full photo its proportions
 * before that loads.
 */
export function usePhotoThumb(photos: PhotoStore, name: string | null): ShownPhoto | null {
  const version = usePhotoVersion(photos, name);
  const [shown, setShown] = useState<ShownPhoto | null>(null);
  useEffect(() => {
    if (name === null) {
      setShown(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    void (async () => {
      try {
        let thumb = await photos.get(thumbKey(name));
        if (!thumb) {
          const full = await photos.get(name);
          if (!full) {
            if (!cancelled) setShown(null);
            return;
          }
          thumb = await makeThumb(full);
          if (cancelled) return;
          // Written once; the write re-runs this, which then finds it.
          await photos.put(thumbKey(name), thumb);
          return;
        }
        const size = await imageSize(thumb);
        if (cancelled) return;
        url = URL.createObjectURL(thumb);
        setShown({ url, ...size });
      } catch {
        if (!cancelled) setShown(null);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photos, name, version]);
  return shown;
}

/** The stored photo itself, as a URL, or null while there is none here. */
export function usePhotoUrl(photos: PhotoStore, name: string | null): string | null {
  const version = usePhotoVersion(photos, name);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (name === null) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let made: string | null = null;
    void photos.get(name).then((blob) => {
      if (cancelled) return;
      made = blob ? URL.createObjectURL(blob) : null;
      setUrl(made);
    });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [photos, name, version]);
  return url;
}
