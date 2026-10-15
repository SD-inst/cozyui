// Uploaded files get a `<Date.now()>_` prefix from the client on every upload,
// and ComfyUI prepends its own `<timestamp>_` prefix whenever the target name
// already exists in the input dir. Forwarding the same file between tabs (or
// re-uploading a backup) therefore stacks prefixes until the name blows past
// the 255-byte filesystem limit ("File name too long"). Strip the accumulated
// prefixes and cap the length before every upload so the name stays bounded no
// matter how many times a file is re-sent.

const TS_PREFIX = /^(?:\d{10,}_)+/;
const MAX_NAME_BYTES = 120;
const MAX_EXT_BYTES = 16;

const byteLen = (s: string): number => new TextEncoder().encode(s).length;

export const cleanUploadName = (name: string): string => {
    const dot = name.lastIndexOf('.');
    let ext = dot > 0 ? name.slice(dot) : '';
    if (byteLen(ext) > MAX_EXT_BYTES) {
        ext = '';
    }
    let base = dot > 0 && ext ? name.slice(0, dot) : name;
    base = base.replace(TS_PREFIX, '');
    if (!base) {
        base = 'file';
    }
    const budget = Math.max(MAX_NAME_BYTES - byteLen(ext), 1);
    if (byteLen(base) > budget) {
        let end = Math.min(base.length, budget);
        while (end > 1 && byteLen(base.slice(0, end)) > budget) {
            end--;
        }
        base = base.slice(0, end);
    }
    return base + ext;
};
