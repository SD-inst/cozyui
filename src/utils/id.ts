// crypto.randomUUID is only exposed in *secure* contexts (HTTPS / localhost).
// Over plain HTTP on a LAN IP (e.g. http://172.25.10.35:5173) it is undefined,
// so we fall back to a v4 UUID built from crypto.getRandomValues, which is
// available in all contexts.
export const genId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return (
        hex(b[0]) + hex(b[1]) + hex(b[2]) + hex(b[3]) + '-' +
        hex(b[4]) + hex(b[5]) + '-' +
        hex(b[6]) + hex(b[7]) + '-' +
        hex(b[8]) + hex(b[9]) + '-' +
        hex(b[10]) + hex(b[11]) + hex(b[12]) + hex(b[13]) +
        hex(b[14]) + hex(b[15])
    );
};
