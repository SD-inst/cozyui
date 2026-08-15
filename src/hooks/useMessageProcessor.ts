import { useCallback } from 'react';
import { useImageProcessor } from './useImageProcessor';
import { OpenAIMessage } from './useOpenAIChat';

export interface ImagePart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
}

export const useMessageProcessor = () => {
    const { processImage } = useImageProcessor();

    const processUserMessage = useCallback(
        async (text: string, imageUrls?: string[]): Promise<OpenAIMessage> => {
            if (!imageUrls || !imageUrls.length) {
                return {
                    role: 'user',
                    content: text,
                };
            }

            try {
                const parts = (
                    await Promise.all(
                        imageUrls.map((url) => processImage(url)),
                    )
                ).filter((part): part is ImagePart => part !== null);
                if (parts.length) {
                    return {
                        role: 'user',
                        content: [{ type: 'text', text }, ...parts],
                    };
                }
            } catch (error) {
                console.error('Failed to process images:', error);
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
