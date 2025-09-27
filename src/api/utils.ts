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

/**
 * Inserts a node between input_node and output_node(s),
 * the graph will look like this: input_node => node => output_node
 *
 * @param api ComfyUI API object
 * @param output_node_ids id or array of ids of the output node(s)
 * @param field field name in our node where the input node (before our node) will connect, also the output node field unless overridden (see below)
 * @param node our node object being inserted
 * @param node_output_index our node's output index, 0 by default
 * @param node_field_override our node's input field override
 * if it's different (rarely needed)
 * @returns our node id
 */
export const insertNode = (
    api: any,
    output_node_ids: string | string[],
    field: string,
    node: any,
    node_output_index: number = 0,
    node_field_override?: string
): string => {
    const new_node_id = getFreeNodeId(api) + '';
    api[new_node_id] = node;

    const ids =
        output_node_ids instanceof Array ? output_node_ids : [output_node_ids];
    ids.forEach((id) => {
        const input_node = api[id].inputs[field];
        node.inputs[node_field_override || field] = input_node;
        api[id].inputs[field] = [new_node_id, node_output_index];
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

export const bigRandom = (len: number) => {
    const hexString = Array(len)
        .fill(0)
        .map(() => Math.round(Math.random() * 0xf).toString(16))
        .join('');

    return BigInt(`0x${hexString}`).toString();
};
