import { useCallback } from 'react';
import { useImageProcessor } from './useImageProcessor';

export interface ImagePart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
}

export interface ProcessedMessage {
    role: 'user';
    content: string | Array<ImagePart>;
}

export const useMessageProcessor = () => {
    const { processImage } = useImageProcessor();

    const processUserMessage = useCallback(
        async (text: string, imageUrl?: string): Promise<ProcessedMessage> => {
            if (!imageUrl) {
                return {
                    role: 'user',
                    content: text,
                };
            }

            try {
                const imagePart = await processImage(imageUrl);
                if (imagePart) {
                    return {
                        role: 'user',
                        content: [{ type: 'text', text }, imagePart],
                    };
                }
            } catch (error) {
                console.error('Failed to process image:', error);
            }

            // Return text-only message if image processing fails
            return {
                role: 'user',
                content: text,
            };
        },
        [processImage],
    );

    return {
        processUserMessage,
    };
};
