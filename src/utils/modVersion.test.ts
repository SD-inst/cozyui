import { describe, it, expect } from 'vitest';
import { parseModVersion } from './modVersion';

describe('parseModVersion', () => {
    it('splits a trailing single-component version', () => {
        expect(parseModVersion('character name v2')).toEqual({
            base: 'character name',
            version: 'v2',
        });
    });

    it('splits a full major/minor/patch version', () => {
        expect(parseModVersion('character name v2.1.5')).toEqual({
            base: 'character name',
            version: 'v2.1.5',
        });
    });

    it('splits a two-component version', () => {
        expect(parseModVersion('character name v2.1')).toEqual({
            base: 'character name',
            version: 'v2.1',
        });
    });

    it('returns no version when the name has none', () => {
        expect(parseModVersion('character name')).toEqual({
            base: 'character name',
        });
    });

    it('leaves a version token in the middle of the name alone', () => {
        expect(parseModVersion('char v1 final')).toEqual({
            base: 'char v1 final',
        });
    });

    it('takes the LAST trailing token when several are present', () => {
        expect(parseModVersion('char v1 v2.1.5')).toEqual({
            base: 'char v1',
            version: 'v2.1.5',
        });
    });

    it('does not treat a plain number as a version', () => {
        expect(parseModVersion('character 2024')).toEqual({
            base: 'character 2024',
        });
    });

    it('does not treat a `ver` token as a version', () => {
        expect(parseModVersion('character ver2')).toEqual({
            base: 'character ver2',
        });
    });

    it('accepts an uppercase V and ignores trailing whitespace', () => {
        expect(parseModVersion('character name V2 ')).toEqual({
            base: 'character name',
            version: 'V2',
        });
    });
});
