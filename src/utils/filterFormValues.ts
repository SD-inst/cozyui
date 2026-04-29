// Filter heavy fields (masks, large arrays) from form values before persisting.
export const filterFormValues = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const filtered: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
        const val = data[key];
        // Exclude mask fields (Uint8Array or large arrays)
        if (key === 'mask') continue;
        // Exclude very large arrays (>1000 elements)
        if (Array.isArray(val) && val.length > 1000) continue;
        // Recursively filter nested objects
        if (val && typeof val === 'object' && !Array.isArray(val) && val !== null) {
            filtered[key] = filterFormValues(val);
        } else if (Array.isArray(val)) {
            // Discard TypedArrays (e.g. Uint8Array masks) only;
            // keep nested arrays and plain objects for recursive processing.
            filtered[key] = val.filter(item => !ArrayBuffer.isView(item)).map(item =>
                item && typeof item === 'object' ? filterFormValues(item) : item
            );
        } else {
            filtered[key] = val;
        }
    }
    return filtered;
};
