import { useState } from 'react';

export interface ImagePart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
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
        isProcessing,
    };
};
