// SHA-256 of a Blob, as hex — the content identity the local file store keys
// its copies by.
//
// `crypto.subtle` is undefined outside a secure context, and this app is
// routinely served over plain http on a LAN address — the same reason the crash
// overlay cannot reach `navigator.clipboard` — so the fallback is a small
// pure-JS implementation. Both paths read the blob in slices: the store holds
// videos, and `arrayBuffer()` on a large one asks for the same bytes again in
// RAM.
const CHUNK_BYTES = 1 << 20;

// Below this, handing the whole blob to `subtle.digest` is both faster and
// cheaper than streaming it through JS; above it, doubling a video in memory is
// not worth the speed.
const SUBTLE_MAX_BYTES = 32 * 1024 * 1024;

// K[i] is the first 32 bits of the fractional part of the cube root of the
// i-th prime, and `Sha256`'s initial state the same for square roots. Both are
// transcribed from the derivation, not from memory: a mistyped constant yields
// a well-formed but wrong digest, which no caller can tell apart.
const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number =>
    ((x >>> n) | (x << (32 - n))) >>> 0;

const toHex = (bytes: Uint8Array): string =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

class Sha256 {
    private h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
        0x1f83d9ab, 0x5be0cd19,
    ]);
    private block = new Uint8Array(64);
    private w = new Uint32Array(64);
    // Bytes of the block buffer currently filled.
    private used = 0;
    // Message bytes fed so far, excluding the padding digest() appends.
    private lengthBytes = 0;

    update(bytes: Uint8Array): void {
        this.lengthBytes += bytes.length;
        this.write(bytes);
    }

    digestHex(): string {
        const bits = this.lengthBytes * 8;
        // `0x80`, then zeros, then the 64-bit big-endian bit length — the count
        // of terminator plus zeros is whatever leaves room for 8 length bytes.
        const fill = this.used <= 55 ? 56 - this.used : 120 - this.used;
        const tail = new Uint8Array(fill + 8);
        tail[0] = 0x80;
        const view = new DataView(tail.buffer);
        view.setUint32(fill, Math.floor(bits / 0x100000000));
        view.setUint32(fill + 4, bits % 0x100000000);
        this.write(tail);

        const out = new Uint8Array(32);
        for (let i = 0; i < 8; i++) {
            out[i * 4] = this.h[i] >>> 24;
            out[i * 4 + 1] = (this.h[i] >>> 16) & 0xff;
            out[i * 4 + 2] = (this.h[i] >>> 8) & 0xff;
            out[i * 4 + 3] = this.h[i] & 0xff;
        }
        return toHex(out);
    }

    private write(bytes: Uint8Array): void {
        let i = 0;
        if (this.used > 0) {
            const take = Math.min(64 - this.used, bytes.length);
            this.block.set(bytes.subarray(0, take), this.used);
            this.used += take;
            i = take;
            if (this.used === 64) {
                this.compress();
                this.used = 0;
            }
        }
        while (bytes.length - i >= 64) {
            this.block.set(bytes.subarray(i, i + 64));
            this.compress();
            i += 64;
        }
        if (bytes.length > i) {
            this.block.set(bytes.subarray(i));
            this.used = bytes.length - i;
        }
    }

    private compress(): void {
        const { w, block, h } = this;
        for (let i = 0; i < 16; i++) {
            const p = i * 4;
            w[i] =
                ((block[p] << 24) |
                    (block[p + 1] << 16) |
                    (block[p + 2] << 8) |
                    block[p + 3]) >>>
                0;
        }
        for (let i = 16; i < 64; i++) {
            const x = w[i - 15];
            const y = w[i - 2];
            const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
            const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let a = h[0];
        let b = h[1];
        let c = h[2];
        let d = h[3];
        let e = h[4];
        let f = h[5];
        let g = h[6];
        let hh = h[7];
        for (let i = 0; i < 64; i++) {
            const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
            const ch = ((e & f) ^ (~e & g)) >>> 0;
            const t1 = (hh + s1 + ch + K[i] + w[i]) >>> 0;
            const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
            const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
            const t2 = (s0 + maj) >>> 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hh) >>> 0;
    }
}

// The streaming pure-JS path. Exported for the tests: on a plain-http LAN
// address this is the only path that runs, and a page loaded over https must
// not be the only place it is exercised.
export const sha256HexJs = async (blob: Blob): Promise<string> => {
    const sha = new Sha256();
    for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
        const part = await blob
            .slice(offset, Math.min(offset + CHUNK_BYTES, blob.size))
            .arrayBuffer();
        sha.update(new Uint8Array(part));
    }
    return sha.digestHex();
};

export const sha256Hex = async (blob: Blob): Promise<string> => {
    const subtle = globalThis.crypto?.subtle;
    if (subtle && blob.size <= SUBTLE_MAX_BYTES) {
        try {
            const digest = await subtle.digest('SHA-256', await blob.arrayBuffer());
            return toHex(new Uint8Array(digest));
        } catch {
            // A digest that cannot be taken (a CSP or a broken polyfill) only
            // means the slower path runs.
        }
    }
    return sha256HexJs(blob);
};
