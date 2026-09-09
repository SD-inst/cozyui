// Utility for parsing safetensors metadata in the browser

export interface RefModMetadata {
    name: string;
    kind: string;
    latent_h: number;
    latent_w: number;
    latent_t: number;
    mode: string;
    source: string;
    source_shape: string;
    pool: string;
    optimize_steps: number;
    tags: string[];
    description: string;
    concept_type: string;
    _format_version: number;
    sample_rate: number;
    refmod_config?: string;
    tokens?: number;
}

/**
 * Parse safetensors file header to extract RefMod metadata.
 * Safetensors format: first 8 bytes = size of JSON header (little-endian u64),
 * followed by JSON object with tensor info and metadata.
 */
export const parseSafetensorsMeta = async (
    file: File,
): Promise<RefModMetadata> => {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);
    const headerSize = view.getUint32(0, true);
    const headerBytes = new Uint8Array(arrayBuffer, 8, headerSize);
    const header = new TextDecoder().decode(headerBytes);
    const json = JSON.parse(header);

    // RefMod metadata is stored under '__metadata__' in the safetensors header
    const metadata = json['__metadata__'];
    if (!metadata) {
        throw new Error('No __metadata__ found in safetensors header');
    }
    const metaStr = metadata['refmod_meta'] || metadata['audio_refmod_meta'];
    if (!metaStr) {
        throw new Error('No refmod_meta found in safetensors header');
    }

    const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;

    // Calculate tokens from latent dimensions
    const latent_t = meta.latent_t || 0;
    const latent_h = meta.latent_h || 0;
    const latent_w = meta.latent_w || 0;
    let tokens = 0;
    if (meta.kind === 'audio') {
        tokens = latent_t * 2;
    } else {
        tokens =
            latent_t * (Math.floor(latent_h / 2) * Math.floor(latent_w / 2));
    }

    return {
        ...meta,
        tokens,
    };
};

/**
 * Generate a random filename for mod files.
 * Format: {timestamp}_{random12chars}.safetensors
 */
import { genId } from './id';

export const generateRandomModName = (): string => {
    const timestamp = Date.now();
    const random = genId().replace(/-/g, '').slice(0, 12);
    return `${timestamp}_${random}`;
};
