import { describe, expect, it, vi } from 'vitest';
import {
    addResult,
    clearPrompt,
    delResult,
    pruneResults,
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
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
        spy.mockRestore();
    });

    it('returns unchanged state when neither tab_name nor prompt_id is set', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const s = initialState();
        const next = reducer(
            s,
            addResult({ node_id: '16', output: {} }),
        );
        expect(next).toBe(s);
        spy.mockRestore();
    });
});

describe('tab slice — setPrompt + result relocation', () => {
    it('moves a temporary prompt result to the tab when setPrompt resolves the tab', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
        warnSpy.mockRestore();
        errorSpy.mockRestore();
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

describe('tab slice — results per generation', () => {
    it('keeps what the finished run produced and drops its leftovers', () => {
        let s = initialState();
        s = reducer(s, setPrompt({ prompt_id: 'run1', tab_name: 'YuE2' }));
        s = reducer(
            s,
            addResult({
                tab_name: 'YuE2',
                node_id: '30',
                output: { audio: ['a.mp3'] },
            }),
        );
        s = reducer(
            s,
            addResult({
                tab_name: 'YuE2',
                node_id: '40',
                output: { text: ['abc'] },
            }),
        );

        // the next run replans without the ABC node: only the audio arrives
        s = reducer(s, setPrompt({ prompt_id: 'run2', tab_name: 'YuE2' }));
        s = reducer(
            s,
            addResult({
                prompt_id: 'run2',
                node_id: '30',
                output: { audio: ['b.mp3'] },
            }),
        );
        // mid-run the previous ABC is still on screen, it is not wiped by the
        // audio result arriving
        expect(s.result.YuE2['40']).toEqual({ text: ['abc'] });

        s = reducer(s, pruneResults({ prompt_id: 'run2' }));
        expect(s.result.YuE2['30']).toEqual({ audio: ['b.mp3'] });
        expect(s.result.YuE2['40']).toBeUndefined();
        expect(s.result_run.YuE2['40']).toBeUndefined();
    });

    it('a result that arrived before the prompt was registered survives the prune', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let s = initialState();
        // the websocket beat /api/prompt, so the result is filed under the
        // prompt id and only moved to the tab by setPrompt
        s = reducer(
            s,
            addResult({
                prompt_id: 'run1',
                node_id: '16',
                output: { images: ['x.png'] },
            }),
        );
        s = reducer(s, setPrompt({ prompt_id: 'run1', tab_name: 'T2V' }));
        s = reducer(s, pruneResults({ prompt_id: 'run1' }));
        expect(s.result.T2V['16']).toEqual({ images: ['x.png'] });
        warnSpy.mockRestore();
    });

    it('prunes nothing for a tab with no registered generation', () => {
        let s = initialState();
        s = reducer(
            s,
            addResult({
                tab_name: 'T2V',
                node_id: '16',
                output: { images: ['x.png'] },
            }),
        );
        s = reducer(s, pruneResults({ tab_name: 'T2V' }));
        expect(s.result.T2V['16']).toEqual({ images: ['x.png'] });
    });

    it('delResult forgets the result and its tag', () => {
        let s = initialState();
        s = reducer(s, setPrompt({ prompt_id: 'run1', tab_name: 'T2V' }));
        s = reducer(
            s,
            addResult({
                tab_name: 'T2V',
                node_id: '17',
                output: { text: ['expanded'] },
            }),
        );
        s = reducer(s, delResult({ tab_name: 'T2V', id: '17' }));
        expect(s.result.T2V['17']).toBeUndefined();
        expect(s.result_run.T2V['17']).toBeUndefined();
    });
});
