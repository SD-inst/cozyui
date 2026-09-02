import { useState } from 'react';

export interface ImagePart {
    type: 'text' | 'image_url' | 'input_video' | 'input_audio';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
    input_video?: {
        data: string;
    };
    input_audio?: {
        data: string;
        format: string;
    };
}

export interface ProcessedImage {
    base64: string;
    mimeType: string;
}

export const useImageProcessor = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processImage = async (
        imageUrl: string,
    ): Promise<ImagePart | null> => {
        try {
            setIsProcessing(true);

            // Fetch the image as blob
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch image: ${response.statusText}`,
                );
            }

            const blob = await response.blob();
            const mimeType = blob.type;

            // Convert to JPEG if necessary
            if (mimeType !== 'image/jpeg') {
                const jpegBlob = await convertToJPEG(blob);
                return {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${await blobToBase64(jpegBlob)}`,
                        detail: 'auto',
                    },
                };
            }

            return {
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${await blobToBase64(blob)}`,
                    detail: 'auto',
                },
            };
        } catch (error) {
            console.error('Error processing image:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const processVideo = async (
        videoUrl: string,
    ): Promise<ImagePart | null> => {
        try {
            setIsProcessing(true);

            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch video: ${response.statusText}`,
                );
            }

            const blob = await response.blob();
            const mimeType = blob.type || 'video/mp4';

            return {
                type: 'input_video',
                input_video: {
                    data: `data:${mimeType};base64,${await blobToBase64(
                        blob,
                    )}`,
                },
            };
        } catch (error) {
            console.error('Error processing video:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const processAudio = async (
        audioUrl: string,
    ): Promise<ImagePart | null> => {
        try {
            setIsProcessing(true);

            const response = await fetch(audioUrl);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch audio: ${response.statusText}`,
                );
            }

            const arrayBuffer = await response.arrayBuffer();

            // The llama.cpp backend base64-decodes `input_audio.data` directly
            // (no data-url prefix) and validates `format` to 'wav' | 'mp3'; the
            // container is then auto-detected from the raw bytes. We re-encode
            // to mono MP3, which is compact, reliably decodable and covers every
            // accepted input (mp3/ogg/wav/flac/aac).
            const audioContext = new AudioContext();
            try {
                const audioBuffer =
                    await audioContext.decodeAudioData(arrayBuffer);
                const mp3Blob = await encodeMp3(audioBuffer);
                return {
                    type: 'input_audio',
                    input_audio: {
                        data: await blobToBase64(mp3Blob),
                        format: 'mp3',
                    },
                };
            } finally {
                void audioContext.close();
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    // Encode a decoded AudioBuffer to a mono MP3 blob (128 kbps).
    // The lamejs encoder is imported lazily so Vite code-splits it into a
    // separate chunk that is only fetched when audio is actually encoded.
    const encodeMp3 = async (
        audioBuffer: AudioBuffer,
    ): Promise<Blob> => {
        const lame = await import('@breezystack/lamejs');
        const sampleRate = audioBuffer.sampleRate;
        const encoder = new lame.Mp3Encoder(1, sampleRate, 128);

        const floatData = audioBuffer.getChannelData(0);
        const int16 = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; i++) {
            const s = Math.max(-1, Math.min(1, floatData[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const chunkSize = 1152;
        const parts: BlobPart[] = [];
        for (let i = 0; i < int16.length; i += chunkSize) {
            const chunk = int16.subarray(
                i,
                Math.min(i + chunkSize, int16.length),
            );
            const mp3buf = encoder.encodeBuffer(chunk);
            if (mp3buf.length > 0) {
                parts.push(mp3buf);
            }
        }
        const mp3end = encoder.flush();
        if (mp3end.length > 0) {
            parts.push(mp3end);
        }

        return new Blob(parts, { type: 'audio/mp3' });
    };

    const convertToJPEG = async (blob: Blob): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob(
                    (jpegBlob) => {
                        URL.revokeObjectURL(url);
                        if (jpegBlob) {
                            resolve(jpegBlob);
                        } else {
                            reject(new Error('Failed to convert to JPEG'));
                        }
                    },
                    'image/jpeg',
                    0.95,
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image for conversion'));
            };

            img.src = url;
        });
    };

    const blobToBase64 = async (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Extract the base64 part (remove 'data:application/octet-stream;base64,')
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    return {
        processImage,
        processVideo,
        processAudio,
        isProcessing,
    };
};
