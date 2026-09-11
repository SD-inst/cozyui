import { describe, it, expect } from 'vitest';
import {
    pyRound,
    computeCanvas,
    modTokenCount,
    effectiveTokenCount,
    maxCropH,
    defaultCrop,
    clampCrop,
    snap32,
} from './refmodCrop';

describe('pyRound', () => {
    it('rounds halves to even', () => {
        expect(pyRound(2.5)).toBe(2);
        expect(pyRound(3.5)).toBe(4);
        expect(pyRound(0.5)).toBe(0);
        expect(pyRound(1.5)).toBe(2);
        expect(pyRound(10.5)).toBe(10);
        expect(pyRound(11.5)).toBe(12);
    });
    it('rounds non-halves like Math.round', () => {
        expect(pyRound(1.2)).toBe(1);
        expect(pyRound(1.8)).toBe(2);
        expect(pyRound(1.5000001)).toBe(2);
        expect(pyRound(1.4999999)).toBe(1);
    });
});

describe('computeCanvas', () => {
    it('snaps both dims to /32 and uses ref_resolution as a ceiling', () => {
        // 3000x2000, ref_resolution 1024: short side (2000) scaled to 1024
        const c = computeCanvas({ width: 3000, height: 2000 }, 1024);
        expect(c.height).toBe(1024);
        // width = 3000 * (1024/2000) = 1536 -> /32 = 48 -> 1536
        expect(c.width).toBe(1536);
    });

    it('never upscales small images', () => {
        const c = computeCanvas({ width: 400, height: 300 }, 1024);
        // scale = 1.0 (no upscale); 400 -> round(12.5)*32 = 12*32 = 384
        //                        ; 300 -> round(9.375)*32 = 9*32 = 288
        expect(c.width).toBe(384);
        expect(c.height).toBe(288);
    });

    it('snaps to /32 even for odd sizes', () => {
        const c = computeCanvas({ width: 333, height: 333 }, 1024);
        expect(c.width % 32).toBe(0);
        expect(c.height % 32).toBe(0);
    });
});

describe('modTokenCount', () => {
    it('computes per-frame and total tokens', () => {
        // canvas 1024x1024 -> per_frame = (1024/32)*(1024/32) = 32*32 = 1024
        const t = modTokenCount({ width: 1024, height: 1024 }, 5);
        expect(t.perFrame).toBe(1024);
        expect(t.totalT).toBe(5);
        expect(t.tokens).toBe(5120);
    });
});

describe('effectiveTokenCount', () => {
    // canvas 864x1504 -> per_frame = (1504/32)*(864/32) = 47*27 = 1269
    const canvas = { width: 864, height: 1504 };

    it('applies no cap when the raw count fits the budget', () => {
        // 4 images * 1269 = 5076 <= 5120
        const t = effectiveTokenCount(canvas, 4, 5120);
        expect(t.perFrame).toBe(1269);
        expect(t.frames).toBe(4);
        expect(t.tokens).toBe(5076);
        expect(t.capped).toBe(false);
        expect(t.overBudget).toBe(false);
    });

    it('resamples down to the largest frame count that fits max_tokens', () => {
        // 6 images * 1269 = 7614 > 5120 -> floor(5120/1269) = 4 frames
        const t = effectiveTokenCount(canvas, 6, 5120);
        expect(t.rawTokens).toBe(7614);
        expect(t.frames).toBe(4);
        expect(t.tokens).toBe(5076);
        expect(t.capped).toBe(true);
        expect(t.overBudget).toBe(false);
    });

    it('stacks every image 1:1 (latent_frames does NOT cap images)', () => {
        // 22 images, no budget (max_tokens 0) -> all 22 frames kept
        const t = effectiveTokenCount(canvas, 22, 0);
        expect(t.frames).toBe(22);
        expect(t.tokens).toBe(22 * 1269);
        expect(t.capped).toBe(false);
    });

    it('matches the real 512x928 canvas (22 images -> 10208 tokens)', () => {
        // (928/32)*(512/32) = 29*16 = 464 per frame; 22 * 464 = 10208
        const t = effectiveTokenCount({ width: 512, height: 928 }, 22, 0);
        expect(t.perFrame).toBe(464);
        expect(t.frames).toBe(22);
        expect(t.tokens).toBe(10208);
    });

    it('flags when a single frame alone exceeds the budget', () => {
        // 2048x2048 -> per_frame 64*64 = 4096 > 3000
        const t = effectiveTokenCount({ width: 2048, height: 2048 }, 1, 3000);
        expect(t.perFrame).toBe(4096);
        expect(t.overBudget).toBe(true);
    });
});

describe('maxCropH / defaultCrop', () => {
    it('matches the image when its aspect already fits', () => {
        const img = { width: 400, height: 300 };
        expect(maxCropH(img, 4 / 3)).toBe(300);
        const c = defaultCrop(img, 4 / 3);
        expect(c.h).toBe(300);
        expect(c.w).toBe(400);
        expect(c.x).toBe(0);
        expect(c.y).toBe(0);
    });

    it('center-crops a wide image to a 4:3 aspect (full height)', () => {
        const img = { width: 800, height: 400 }; // 2:1
        const c = defaultCrop(img, 4 / 3);
        expect(c.h).toBe(400); // full height
        expect(c.w).toBeCloseTo(533.33, 2); // 400 * 4/3
        expect(c.x).toBeCloseTo(133.33, 2); // (800-533.33)/2
        expect(c.y).toBe(0);
    });

    it('center-crops a tall image to a 16:9 aspect (full width)', () => {
        const img = { width: 400, height: 800 }; // 1:2
        const c = defaultCrop(img, 16 / 9);
        expect(c.w).toBe(400); // full width
        expect(c.h).toBeCloseTo(225, 2); // 400 / (16/9)
        expect(c.x).toBe(0);
        expect(c.y).toBeCloseTo(287.5, 2); // (800-225)/2
    });
});

describe('clampCrop', () => {
    const img = { width: 800, height: 400 };

    it('keeps the crop inside the right/bottom edges', () => {
        const c = clampCrop(10000, 10000, 400, 4 / 3, img);
        expect(c.h).toBe(400);
        expect(c.w).toBeCloseTo(533.33, 2);
        expect(c.x).toBeCloseTo(266.67, 2); // 800 - 533.33
        expect(c.y).toBe(0); // 400 - 400
    });

    it('keeps the crop inside the left/top edges', () => {
        const c = clampCrop(-100, -100, 400, 4 / 3, img);
        expect(c.x).toBe(0);
        expect(c.y).toBe(0);
    });

    it('caps the crop height at the image size', () => {
        const c = clampCrop(0, 0, 1000, 4 / 3, img);
        expect(c.h).toBe(400);
    });

    it('never goes below the minimum crop height (when it fits)', () => {
        const c = clampCrop(0, 0, 10, 4 / 3, img);
        expect(c.h).toBe(64); // MIN_CROP_H
    });
});

describe('snap32', () => {
    it('snaps to the nearest /32, floored at 32', () => {
        expect(snap32(100)).toBe(96); // round(3.125)*32 = 3*32
        expect(snap32(1536)).toBe(1536);
        expect(snap32(10)).toBe(32); // floored
        expect(snap32(200)).toBe(192); // round(6.25)*32 = 6*32
    });
});
