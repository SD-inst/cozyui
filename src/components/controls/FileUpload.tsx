import { Upload } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { useController } from 'react-hook-form';

export const FileUpload = ({
    label = 'Upload file',
    accept,
    ...props
}: {
    name: string;
    label?: string;
    accept?: string;
}) => {
    const { field } = useController(props);
    return (
        <Box>
            <Button
                component='label'
                variant='contained'
                startIcon={<Upload />}
            >
                {label}
                <input
                    type='file'
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={(e) =>
                        e.target.files && field.onChange(e.target.files[0])
                    }
                />
            </Button>
            {field.value && (
                <Typography variant='body1' sx={{ mt: 1 }}>
                    {field.value}
                </Typography>
            )}
        </Box>
    );
};
