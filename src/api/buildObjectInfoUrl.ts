export const buildObjectInfoUrl = (baseURL: string): string => {
    const value = localStorage.getItem('disable_lora_filter');
    if (!value || !value.includes('=')) {
        return baseURL;
    }
    const [directory, directoryPassword] = value.split('=');
    const params = new URLSearchParams();
    params.set('dir', directory);
    params.set('password', directoryPassword);
    return `${baseURL}?${params.toString()}`;
};
