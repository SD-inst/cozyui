import { Box, Link, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useController } from 'react-hook-form';
import { useApiURL } from '../../hooks/useApiURL';
import { useTranslate } from '../../i18n/I18nContext';

export const FileUpload = ({ ...props }: { name: string; label?: string }) => {
    const tr = useTranslate();
    const { field } = useController({ ...props, defaultValue: '' });
    const apiUrl = useApiURL();
    const imageURL = useMemo(() => {
        const params = new URLSearchParams();
        params.set('subfolder', '');
        params.set('type', 'input');
        params.set('filename', field.value);
        return apiUrl + '/api/view?' + params.toString();
    }, [apiUrl, field.value]);
    const { mutate } = useMutation({
        onMutate: (files: File[]) => {
            const formData = new FormData();
            const file = new File(
                [files[0]],
                new Date().getTime() + '_' + files[0].name,
                { type: files[0].type }
            );
            formData.append('image', file);
            fetch(apiUrl + '/api/upload/image', {
                method: 'POST',
                body: formData,
            })
                .then((r) => r.json())
                .then((j) => {
                    j.filename = j.name;
                    delete j.name;
                    field.onChange(j.filename);
                });
        },
    });
    const onDrop = useCallback(
        (acceptedFiles: any) => {
            mutate(acceptedFiles);
        },
        [mutate]
    );
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpg', '.gif', '.png', '.webp'],
        },
    });
    return (
        <Box mb={2} display='flex' flexDirection='column'>
            <Typography variant='body1'>
                {tr(`controls.${props.name}`)}
            </Typography>
            <Box
                flex={1}
                mt={1}
                p={1}
                borderRadius={2}
                border='5px dashed #aaa'
                sx={{ transition: 'border .24s ease-in-out' }}
                {...getRootProps()}
            >
                <input {...getInputProps()} />
                <Box display='flex' alignItems='center' flexDirection='column'>
                    {isDragActive ? (
                        <p style={{ alignSelf: 'center' }}>
                            {tr('controls.drop_files_here')}
                        </p>
                    ) : (
                        <Link
                            sx={{
                                cursor: 'pointer',
                            }}
                        >
                            {tr('controls.drop_files_desc')}
                        </Link>
                    )}
                    {field.value && (
                        <img
                            style={{
                                maxWidth: 200,
                                maxHeight: 200,
                                padding: 5,
                                marginTop: 10,
                                border: '1px solid gray',
                            }}
                            src={imageURL}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
};
