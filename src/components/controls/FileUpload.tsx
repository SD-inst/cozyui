import { Box, Link, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useController } from 'react-hook-form';
import { useAppSelector } from '../../redux/hooks';

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
    const [url, setUrl] = useState<string>();
    const apiUrl = useAppSelector((s) => s.config.api);
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
                    setUrl(
                        apiUrl +
                            '/api/view?' +
                            new URLSearchParams(j).toString()
                    );
                });
        },
    });
    const onDrop = useCallback((acceptedFiles: any) => {
        mutate(acceptedFiles);
    }, []);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpg': ['.jpg', '.gif', '.png', '.webp'],
        },
    });
    return (
        <Box mt={2} mb={2} display='flex' flexDirection='column'>
            <Typography variant='body1'>{props.name}</Typography>
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
                            Drop the files here ...
                        </p>
                    ) : (
                        <Link
                            sx={{
                                cursor: 'pointer',
                            }}
                        >
                            Drag 'n' drop some files here, or click to select
                            files
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
                            src={url}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
};
