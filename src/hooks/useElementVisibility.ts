import { useEffect, useRef, useState } from 'react';

export const useElementVisibility = () => {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setVisible(entry.isIntersecting);
            },
            {
                threshold: 0.1,
                rootMargin: '-10% 0px -10% 0px',
            },
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return { visible, ref };
};
