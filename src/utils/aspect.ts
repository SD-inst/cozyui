// Shared aspect-ratio choices. The label is the form value (stored as-is by
// SelectInput / MiniMaxH3ResolutionSelector); `w`/`h` are the numeric sides so
// consumers can compute the ratio (w/h) without re-parsing the label.
export type AspectChoice = { label: string; w: number; h: number };

export const ASPECT_CHOICES: AspectChoice[] = [
    { label: '1:1 (Square)', w: 1, h: 1 },
    { label: '2:3 (Portrait Photo)', w: 2, h: 3 },
    { label: '3:2 (Photo)', w: 3, h: 2 },
    { label: '3:4 (Portrait Standard)', w: 3, h: 4 },
    { label: '4:3 (Standard)', w: 4, h: 3 },
    { label: '9:16 (Portrait Widescreen)', w: 9, h: 16 },
    { label: '16:9 (Widescreen)', w: 16, h: 9 },
    { label: '21:9 (Ultrawide)', w: 21, h: 9 },
];

// Labels only — for controls that store the label as the value.
export const ASPECT_LABELS: string[] = ASPECT_CHOICES.map((a) => a.label);

// The ratio (w/h) for a stored label; 1 for unknown labels.
export const aspectRatio = (label: string): number => {
    const found = ASPECT_CHOICES.find((a) => a.label === label);
    return found ? found.w / found.h : 1;
};

// The choice whose ratio is closest to `ratio` (w/h).
export const closestAspect = (ratio: number): string => {
    let best = ASPECT_CHOICES[0];
    let bestDiff = Infinity;
    for (const a of ASPECT_CHOICES) {
        const diff = Math.abs(a.w / a.h - ratio);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = a;
        }
    }
    return best.label;
};
