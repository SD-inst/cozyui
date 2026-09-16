import { UploadType } from './UploadType';

export const ext: { [type: string]: string[]; } = {
    [UploadType.IMAGE]: ['.jpg', '.jpeg', '.gif', '.png', '.webp'],
    [UploadType.VIDEO]: [
        '.webm',
        '.avi',
        '.mp4',
        '.mov',
        '.m4v',
        '.mkv',
        '.flv',
        '.wmv',
    ],
    [UploadType.AUDIO]: ['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.wma', '.aac', '.opus'],
};

// Explicit MIME types for audio — iOS Safari does not honor the "audio/*"
// wildcard in <input accept>, so the full list must be enumerated.
export const audioMimes = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/webm',
    'audio/x-ms-wma',
] as const;

/** Comma-separated string for a native `<input type="file" accept>` attribute. */
export const getAudioAcceptString = (): string => audioMimes.join(',');

/** `react-dropzone` `Accept` object for audio files. */
export const getAudioDropzoneAccept = (): Record<string, string[]> =>
    Object.fromEntries(audioMimes.map((m) => [m, ext[UploadType.AUDIO]]));
