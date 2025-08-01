export const shiftStr = (a: string, b: number) => '' + (parseInt(a) + b);

export const shiftIds = (api: any, base: number) => {
    Object.keys(api).forEach((k) => {
        Object.keys(api[k].inputs).forEach((ik) => {
            if (
                typeof api[k].inputs[ik] === 'object' &&
                api[k].inputs[ik].length === 2
            ) {
                api[k].inputs[ik][0] = shiftStr(api[k].inputs[ik][0], base);
            }
        });
        api[shiftStr(k, base)] = api[k];
        delete api[k];
    });
};

export const getFreeNodeId = (api: any) =>
    Object.keys(api)
        .map((k) => parseInt(k))
        .reduce((a, k) => Math.max(a, k)) + 1;

export const insertNode = (
    api: any,
    target_node_ids: string | string[],
    target_field: string,
    node: any,
    output_index: number = 0
): string => {
    const new_node_id = getFreeNodeId(api) + '';
    api[new_node_id] = node;

    const ids =
        target_node_ids instanceof Array ? target_node_ids : [target_node_ids];
    ids.forEach((id) => {
        const input_node = api[id].inputs[target_field];
        node.inputs[target_field] = input_node;
        api[id].inputs[target_field] = [new_node_id, output_index];
    });
    return new_node_id;
};

export const replaceNodeConnection = (
    api: any,
    target_node_id: string,
    target_field: string,
    node: any,
    output_index: number = 0
): string => {
    const new_node_id = getFreeNodeId(api) + '';
    api[new_node_id] = node;
    api[target_node_id].inputs[target_field] = [new_node_id, output_index];
    return new_node_id;
};

export const makeOutputUrl = (apiUrl: string, r: any) => {
    if (r.url) {
        return r.url;
    }
    return `${apiUrl}/api/view?filename=${r.filename}&subfolder=${r.subfolder}&type=${r.type}`;
};
