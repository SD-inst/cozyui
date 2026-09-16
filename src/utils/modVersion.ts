// Pure parsing of a refmod's display name. A trailing version token (e.g.
// `character name v2.1.5`) is split off so the version can be shown in a badge
// while the base name (without the version) is shown as the label. The version
// is cosmetic only — it lives in the name itself; there is no extra data field.

export type ModVersionInfo = { base: string; version?: string };

// A trailing `v<semver>` token: `v2`, `v2.1`, `v2.1.5`. The `v` may be upper or
// lower case; the token must be the LAST thing in the name and be preceded by a
// space, so `character name v2` -> version `v2`, base `character name`.
export const parseModVersion = (name: string): ModVersionInfo => {
    const m = name.match(/\s+[vV]\d+(?:\.\d+)*\s*$/);
    if (!m) {
        return { base: name };
    }
    const version = m[0].trim();
    const base = name.slice(0, name.length - m[0].length).trim();
    return { base, version };
};
