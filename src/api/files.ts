export class FileMissingError extends Error {
    constructor(filename: string) {
        super(`File not found on server: ${filename}`);
    }
}

const viewUrl = (apiUrl: string, filename: string): string => {
    const params = new URLSearchParams();
    params.set('subfolder', '');
    params.set('type', 'input');
    params.set('filename', filename);
    return apiUrl + '/api/view?' + params.toString();
};

export const uploadFile = async (
    file: File,
    apiUrl: string,
): Promise<string> => {
    const formData = new FormData();
    const name = new Date().getTime() + '_' + file.name;
    formData.append('image', new File([file], name, { type: file.type }));
    const r = await fetch(apiUrl + '/api/upload/image', {
        method: 'POST',
        body: formData,
    });
    const j = await r.json();
    if (!j.name) {
        throw new Error('Upload failed: no name in response');
    }
    return j.name;
};

export const fileOnServer = async (
    filename: string,
    apiUrl: string,
): Promise<boolean> => {
    try {
        const r = await fetch(viewUrl(apiUrl, filename), { method: 'HEAD' });
        return r.ok;
    } catch {
        return false;
    }
};

export const getFileFromServer = async (
    filename: string,
    apiUrl: string,
): Promise<File> => {
    const r = await fetch(viewUrl(apiUrl, filename));
    if (r.status === 404) {
        throw new FileMissingError(filename);
    }
    if (!r.ok) {
        throw new Error(`Failed to fetch file ${filename}: HTTP ${r.status}`);
    }
    const blob = await r.blob();
    return new File([blob], filename, { type: blob.type });
};
