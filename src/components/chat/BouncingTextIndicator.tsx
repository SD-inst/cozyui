import { Box } from '@mui/material';

export const BouncingTextIndicator = ({ text }: { text: string }) => {
    const letters = text.toUpperCase().split('');
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 0.5,
                alignItems: 'center',
                justifyContent: 'center',
                py: 1,
                color: 'text.secondary',
                fontSize: '0.9rem',
            }}
        >
            {letters.map((letter, index) => (
                <Box
                    key={index}
                    sx={{
                        display: 'inline-block',
                        animation: `bounce ${0.6 + index * 0.1}s ease-in-out infinite`,
                        animationDelay: `${index * 0.1}s`,
                        willChange: 'transform',
                    }}
                >
                    {letter}
                </Box>
            ))}
        </Box>
    );
};
