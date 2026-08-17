import { ext } from '../components/controls/fileExts';
import { UploadType } from '../components/controls/UploadType';

export type MediaKind = 'image' | 'video' | 'audio';

export interface MediaRef {
    field: string; // top-level form field ('ref_images', 'first_frame', 'video', ...)
    index?: number; // array entry index (undefined for single string fields)
    key: string; // media key inside the entry ('image'/'video'/'audio'); '' for single
    filename: string;
    kind: MediaKind;
}

const extMap: { [k in MediaKind]: string[] } = {
    image: ext[UploadType.IMAGE],
    video: ext[UploadType.VIDEO],
    audio: ext[UploadType.AUDIO],
};

export const isMediaString = (s: string): boolean => {
    const lower = s.toLowerCase();
    return Object.values(extMap).some((list) =>
        list.some((e) => lower.endsWith(e)),
    );
};

export const kindOf = (s: string): MediaKind => {
    const lower = s.toLowerCase();
    for (const [kind, list] of Object.entries(extMap)) {
        if (list.some((e) => lower.endsWith(e))) {
            return kind as MediaKind;
        }
    }
    return 'image';
};

// transient form fields that never make sense in a preset
export const EXCLUDE_FIELDS = ['randomizer'];
// preset dialog: checkbox unchecked by default
export const DEFAULT_OFF_FIELDS = ['seed'];

// Structurally known media fields of a tab (WFTab receivers), even when
// empty — content sniffing alone cannot tell that an empty array is media.
export const getReceiverFields = (
    receivers: { [tab: string]: Array<{ name: string }> } | undefined,
    tab: string,
): Set<string> => new Set((receivers?.[tab] ?? []).map((r) => r.name));

// Walks a (filtered) form values object and returns all media references
// with their explicit position: top-level field name, array index and
// the entry key holding the filename.
export const walkMediaFields = (values: any): MediaRef[] => {
    const refs: MediaRef[] = [];
    if (!values || typeof values !== 'object') {
        return refs;
    }
    for (const [field, value] of Object.entries(values)) {
        if (typeof value === 'string') {
            if (isMediaString(value)) {
                refs.push({ field, key: '', filename: value, kind: kindOf(value) });
            }
        } else if (Array.isArray(value)) {
            value.forEach((entry, index) => {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    return;
                }
                for (const [key, v] of Object.entries(entry)) {
                    if (typeof v === 'string' && isMediaString(v)) {
                        refs.push({ field, index, key, filename: v, kind: kindOf(v) });
                        break; // one media key per entry
                    }
                }
            });
        }
    }
    return refs;
};

