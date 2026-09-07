import { describe, expect, it } from 'vitest';
import {
    addResult,
    clearPrompt,
    setPrompt,
    tab as reducer,
} from './tab';

const initialState = () => reducer(undefined, { type: 'INIT' });

describe('tab slice — addResult', () => {
    it('stores result under the tab name', () => {
        let s = initialState();
        s = reducer(
            s,
            addResult({
                tab_name: 'T2V',
                node_id: '16',
                output: { images: ['a.png'] },
            }),
        );
        expect(s.result.T2V['16']).toEqual({ images: ['a.png'] });
    });

    it('normalizes native SaveVideo output (images + animated → gifs)', () => {
        let s = initialState();
        s = reducer(
            s,
            addResult({
                tab_name: 'T2V',
                node_id: '16',
                output: { images: ['a.mp4'], animated: [true] },
            }),
        );
        expect(s.result.T2V['16'].gifs).toEqual(['a.mp4']);
    });

    it('does not add gifs when animated is absent', () => {
        let s = initialState();
        s = reducer(
            s,
            addResult({
                tab_name: 'T2V',
                node_id: '16',
                output: { images: ['a.png'] },
            }),
        );
        expect(s.result.T2V['16'].gifs).toBeUndefined();
    });

    it('resolves tab name from prompt registry (prompt_id path)', () => {
        let s = initialState();
        s = reducer(
            s,
            setPrompt({ prompt_id: 'abc', tab_name: 'I2V' }),
        );
        s = reducer(
            s,
            addResult({
                prompt_id: 'abc',
                node_id: '20',
                output: { images: ['x.png'] },
            }),
        );
        expect(s.result.I2V['20']).toEqual({ images: ['x.png'] });
    });

    it('stores under prompt_id when tab_name is not yet known (race)', () => {
        let s = initialState();
        s = reducer(
            s,
            addResult({
                prompt_id: 'unknown',
                node_id: '16',
                output: { images: ['early.png'] },
            }),
        );
        expect(s.result.unknown['16']).toEqual({ images: ['early.png'] });
    });

    it('returns unchanged state when neither tab_name nor prompt_id is set', () => {
        const s = initialState();
        const next = reducer(
            s,
            addResult({ node_id: '16', output: {} }),
        );
        expect(next).toBe(s);
    });
});

describe('tab slice — setPrompt + result relocation', () => {
    it('moves a temporary prompt result to the tab when setPrompt resolves the tab', () => {
        let s = initialState();
        // Simulate: result arrived before setPrompt
        s = reducer(
            s,
            addResult({
                prompt_id: 'abc',
                node_id: '16',
                output: { images: ['r.png'] },
            }),
        );
        // Now setPrompt resolves the tab
        s = reducer(s, setPrompt({ prompt_id: 'abc', tab_name: 'T2V' }));
        expect(s.result.T2V['16']).toEqual({ images: ['r.png'] });
        expect(s.result.unknown).toBeUndefined();
    });
});

describe('tab slice — clearPrompt', () => {
    it('clears the prompt registry', () => {
        let s = initialState();
        s = reducer(s, setPrompt({ prompt_id: 'abc', tab_name: 'T2V' }));
        expect(s.prompt).toHaveProperty('abc');
        s = reducer(s, clearPrompt());
        expect(s.prompt).toEqual({});
    });
});
