import { describe, expect, it } from 'vitest';
import { cleanUploadName } from './uploadName';

describe('cleanUploadName', () => {
    it('leaves plain names untouched', () => {
        expect(cleanUploadName('view3.jpg')).toBe('view3.jpg');
        expect(cleanUploadName('my.photo_v2.png')).toBe('my.photo_v2.png');
        expect(cleanUploadName('no_extension')).toBe('no_extension');
    });

    it('keeps short numeric prefixes (years, indexes)', () => {
        expect(cleanUploadName('2026_03_project.jpg')).toBe('2026_03_project.jpg');
        expect(cleanUploadName('00001_photo.png')).toBe('00001_photo.png');
    });

    it('strips a single timestamp prefix', () => {
        expect(cleanUploadName('1789224421496_view3.jpg')).toBe('view3.jpg');
        expect(cleanUploadName('1789224421496123456_view3.jpg')).toBe('view3.jpg');
    });

    it('strips accumulated timestamp prefixes', () => {
        const dirty =
            '1791887990808_1791636212729_1790109756411_1790005045282_1789922480008_1789224421496_view3.jpg';
        expect(cleanUploadName(dirty)).toBe('view3.jpg');
    });

    it('is idempotent with the client-side Date.now() prefix', () => {
        const once = cleanUploadName('1789224421496_view3.jpg');
        const twice = cleanUploadName('1791887990808_' + once);
        expect(twice).toBe('view3.jpg');
    });

    it('does not strip digits that are not underscore-separated prefixes', () => {
        expect(cleanUploadName('photo_1789224421496.jpg')).toBe(
            'photo_1789224421496.jpg',
        );
        expect(cleanUploadName('1789224421496.jpg')).toBe('1789224421496.jpg');
    });

    it('falls back to "file" when the base would be empty', () => {
        expect(cleanUploadName('1789224421496_.jpg')).toBe('file.jpg');
    });

    it('caps the total byte length', () => {
        const long = cleanUploadName('x'.repeat(500) + '.jpg');
        expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(120);
        expect(long.endsWith('.jpg')).toBe(true);
    });

    it('caps multibyte names by bytes, not code units', () => {
        const long = cleanUploadName('п'.repeat(200) + '.png');
        expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(120);
        expect(long.endsWith('.png')).toBe(true);
    });

    it('treats absurdly long extensions as part of the base', () => {
        const long = cleanUploadName('name.' + 'e'.repeat(100));
        expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(120);
    });
});
