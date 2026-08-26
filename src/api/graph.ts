// ComfyUI workflow graph types.

// A node's ID. Either a plain numeric string ("12") from the API JSON,
// or a prefixed id produced by `insertGraph` ("12:main").
export type NodeId = string;

// A link to another node's output: [nodeId, outputIndex].
export type NodeRef = [NodeId, number];

// A value an input field can hold: a literal or a node reference.
// Handlers may also clear a connection with `null`.
export type InputValue =
    | string
    | number
    | boolean
    | null
    | NodeRef
    | Array<string | number | boolean | NodeRef>;

export interface NodeMeta {
    title?: string;
}

export interface WorkflowNode {
    inputs: Record<string, InputValue>;
    class_type?: string;
    _meta?: NodeMeta;
}

// The workflow graph: a map from node id to node definition.
export type Workflow = Record<NodeId, WorkflowNode>;

// Narrows an input value to a node reference.
export const isNodeRef = (v: InputValue): v is NodeRef =>
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'string' &&
    typeof v[1] === 'number';
