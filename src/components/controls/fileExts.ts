import { UploadType } from './UploadType';

export const ext: { [type: string]: string[]; } = {
    [UploadType.IMAGE]: ['.jpg', '.gif', '.png', '.webp'],
    [UploadType.VIDEO]: ['.webm', '.avi', '.mp4'],
    [UploadType.AUDIO]: ['.mp3', '.ogg', '.wav', '.flac', '.wma', '.aac'],
};
