/**
 * §13.2 `photo_taken` (Dave, 12 Nov 2026): the order within a rating goes by
 * when the photo was taken, newest first. The date comes from the picked
 * file's EXIF before the app shrinks it, or from Save's own time.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { portfolioPizzas } from '../src/lib/portfolio';
import { photoTakenFromExif } from '../src/lib/photos';
import {
  EMPTY_DRAFT,
  isPhotoTaken,
  localMinute,
  parseIdea,
  photoTakenOnSave,
  savedIdea,
  testedIdeas,
  type ToppingIdea,
} from '../src/lib/toppings';

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');

function idea(id: string, overrides: Partial<ToppingIdea> = {}): ToppingIdea {
  return {
    id,
    name: `Idea ${id}`,
    pre_bake: '* Tomato',
    post_bake: '',
    notes: '',
    comments: '',
    rating: 5,
    photo: `${id}-0123456789ab`,
    dessert: false,
    portfolio: 'follow',
    photo_taken: null,
    created: '2026-11-01T18:00:00.000Z',
    updated: '2026-11-01T18:00:00.000Z',
    ...overrides,
  };
}

/** A minimal JPEG carrying EXIF: APP1 with a TIFF block, its tags as given. */
function jpegWithExif(tags: { dateTimeOriginal?: string; dateTime?: string }, little = true): Uint8Array {
  const parts: number[] = [];
  const u16 = (n: number) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) => (little ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24] : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0)).concat([0]);
  // Layout: header (8), IFD0 at 8 with two entries (2 + 24 + 4 = 30), Exif IFD at 38 with one (18), strings after.
  const ifd0 = 8;
  const exifIfd = ifd0 + 2 + 12 * 2 + 4;
  const strings = exifIfd + 2 + 12 + 4;
  const dto = tags.dateTimeOriginal ? ascii(tags.dateTimeOriginal) : [];
  const dt = tags.dateTime ? ascii(tags.dateTime) : [];
  const tiff = [
    ...(little ? [0x49, 0x49, 0x2a, 0] : [0x4d, 0x4d, 0, 0x2a]),
    ...u32(ifd0),
    ...u16(2),
    ...u16(0x132), ...u16(2), ...u32(dt.length), ...u32(strings + dto.length),
    ...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifIfd),
    ...u32(0),
    ...u16(dto.length ? 1 : 0),
    ...(dto.length ? [...u16(0x9003), ...u16(2), ...u32(dto.length), ...u32(strings)] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...u32(0),
    ...dto,
    ...dt,
  ];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  parts.push(0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 0xff, ...app1, 0xff, 0xd9);
  return new Uint8Array(parts);
}

describe('§13.2 the camera date of a picked photo', () => {
  it('reads when the photo was taken, in either byte order', () => {
    expect(photoTakenFromExif(jpegWithExif({ dateTimeOriginal: '2026:11:08 19:02:16' }))).toBe('2026-11-08T19:02');
    expect(photoTakenFromExif(jpegWithExif({ dateTimeOriginal: '2025:03:26 12:32:16' }, false))).toBe('2025-03-26T12:32');
  });

  it("falls back to the file's own date, and gives null without one", () => {
    expect(photoTakenFromExif(jpegWithExif({ dateTime: '2025:07:18 16:54:25' }))).toBe('2025-07-18T16:54');
    expect(photoTakenFromExif(jpegWithExif({}))).toBeNull();
    expect(photoTakenFromExif(jpegWithExif({ dateTimeOriginal: '0000:00:00 00:00:00' }))).toBeNull();
    expect(photoTakenFromExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(photoTakenFromExif(new Uint8Array(0))).toBeNull();
  });

  it('survives a block cut short', () => {
    const full = jpegWithExif({ dateTimeOriginal: '2026:11:08 19:02:16' });
    for (let n = 0; n < full.length; n += 7) expect(() => photoTakenFromExif(full.slice(0, n))).not.toThrow();
  });
});

describe('§13.2 the date an idea saves with', () => {
  const at = new Date(2026, 10, 12, 20, 5);

  it("takes a new photo's camera date, or Save's time when it has none", () => {
    expect(photoTakenOnSave({ photo_taken: '2025-01-01T10:00' }, 'p', { taken: '2026-11-08T19:02' }, at)).toBe('2026-11-08T19:02');
    expect(photoTakenOnSave({ photo_taken: '2025-01-01T10:00' }, 'p', { taken: null }, at)).toBe('2026-11-12T20:05');
  });

  it('keeps the date with an unchanged photo and drops it with no photo', () => {
    expect(photoTakenOnSave({ photo_taken: '2025-01-01T10:00' }, 'p', null, at)).toBe('2025-01-01T10:00');
    expect(photoTakenOnSave({ photo_taken: '2025-01-01T10:00' }, null, null, at)).toBeNull();
  });

  it('is stored, read back, and refused when malformed', () => {
    expect(localMinute(at)).toBe('2026-11-12T20:05');
    expect(isPhotoTaken('2026-11-12T20:05')).toBe(true);
    expect(isPhotoTaken('2026-11-12')).toBe(false);
    const saved = savedIdea({ ...EMPTY_DRAFT, name: 'A', photo: 'a-1', photo_taken: '2026-11-08T19:02' }, null, 'a', at);
    expect(parseIdea(JSON.parse(JSON.stringify(saved)))?.photo_taken).toBe('2026-11-08T19:02');
    const raw = { ...saved } as Record<string, unknown>;
    delete raw['photo_taken'];
    expect(parseIdea(raw)?.photo_taken).toBeNull();
    expect(parseIdea({ ...raw, photo_taken: '8 Nov 2026' })).toBeNull();
  });
});

describe('§13.2 and §15 the order within a rating', () => {
  const ideas = [
    idea('undated-new', { updated: '2026-11-12T00:00:00.000Z' }),
    idea('old', { photo_taken: '2025-03-26T12:32' }),
    idea('four', { rating: 4, photo_taken: '2026-11-10T19:00' }),
    idea('new', { photo_taken: '2026-11-08T19:02' }),
    idea('undated-old'),
  ];

  it('goes by rating, then the newest photo, then undated ideas by when they were updated', () => {
    expect(testedIdeas(ideas).map((i) => i.id)).toEqual(['new', 'old', 'undated-new', 'undated-old', 'four']);
  });

  it('is the portfolio order too, which never carries the date', () => {
    const pizzas = portfolioPizzas(ideas, () => true);
    expect(pizzas.map((p) => p.id)).toEqual(['new', 'old', 'undated-new', 'undated-old', 'four']);
    expect(JSON.stringify(pizzas)).not.toContain('photo_taken');
  });

  it('is what §13.2 and §15 say', () => {
    expect(SPEC).toContain('| `photo_taken` |');
    expect(SPEC).toContain('newest photo first');
  });
});
