import { RefObject } from 'react';

export const autoscrollSlotProps = (ref: RefObject<HTMLElement>) => ({
    transition: {
        onEntered: () => {
            ref.current?.scrollIntoView({
                behavior: 'smooth',
            });
        },
        timeout: 0,
    },
});
