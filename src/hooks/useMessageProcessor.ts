import { useCallback } from 'react';
import { useImageProcessor } from './useImageProcessor';
import { ImagePart, MediaRef, OpenAIMessage } from './useOpenAIChat';

export const useMessageProcessor = () => {
    const { processImage, processVideo } = useImageProcessor();

    const processUserMessage = useCallback(
        async (text: string, media?: MediaRef[]): Promise<OpenAIMessage> => {
            if (!media || !media.length) {
                return {
                    role: 'user',
                    content: text,
                };
            }

            try {
                const parts = (
                    await Promise.all(
                        media.map((m) =>
                            m.kind === 'video'
                                ? processVideo(m.url)
                                : processImage(m.url),
                        ),
                    )
                ).filter((part): part is ImagePart => part !== null);
                if (parts.length) {
                    return {
                        role: 'user',
                        content: [{ type: 'text', text }, ...parts],
                    };
                }
            } catch (error) {
                console.error('Failed to process media:', error);
            }

            // Return text-only message if media processing fails
            return {
                role: 'user',
                content: text,
            };
        },
        [processImage, processVideo],
    );

    return {
        processUserMessage,
    };
};
