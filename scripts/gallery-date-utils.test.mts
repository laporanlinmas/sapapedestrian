import assert from 'node:assert/strict';
import test from 'node:test';
import { GALLERY_PUBLIC_LIMIT, GALLERY_RESERVE_LIMIT } from '../src/lib/galleryConfig.ts';
import { extractDriveFileId, normalizeUploadTimestamp, parseGalleryDate } from './gallery-date-utils.mts';

test('gallery index capacity matches the API contract', () => {
  assert.equal(GALLERY_PUBLIC_LIMIT, 60);
  assert.equal(GALLERY_RESERVE_LIMIT, 50);
});

test('parses Indonesian and English month names into the same date', () => {
  assert.deepEqual(parseGalleryDate('16 Oktober 2026'), parseGalleryDate('16 October 2026'));
  assert.equal(parseGalleryDate('16 October 2026')?.label, '16 Oktober 2026');
});

test('parses numeric dates and rejects impossible dates', () => {
  assert.equal(parseGalleryDate('4/3/2026')?.urut, '2026-03-04');
  assert.equal(parseGalleryDate('31/02/2026'), null);
  assert.equal(parseGalleryDate('16 Oktober 2026 extra'), null);
  assert.equal(parseGalleryDate('-'), null);
});

test('normalizes 12-hour and 24-hour upload timestamps', () => {
  assert.equal(normalizeUploadTimestamp('4/3/2026 18:55:28'), '2026-04-03T18:55:28');
  assert.equal(normalizeUploadTimestamp('4/3/2026, 6:55:28 PM'), '2026-04-03T18:55:28');
  assert.equal(normalizeUploadTimestamp('4/3/2026, 12:05 AM'), '2026-04-03T00:05:00');
});

test('extracts Drive IDs without accepting unrelated URLs', () => {
  assert.equal(extractDriveFileId('https://drive.google.com/file/d/abc123/view'), 'abc123');
  assert.equal(extractDriveFileId('https://example.com/file/abc123'), null);
});