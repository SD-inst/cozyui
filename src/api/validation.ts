// Decoding of a ComfyUI `/api/prompt` rejection.
//
// A rejected workflow answers HTTP 400 with a top-level error plus a per-node
// breakdown. Only the top-level message used to reach the user, and for a
// missing input file it says nothing actionable ("Prompt outputs failed
// validation"), while the node breakdown names the node, its class and the
// offending value:
//
// {
//   "error": {"type": "prompt_outputs_failed_validation",
//             "message": "Prompt outputs failed validation", "details": ""},
//   "node_errors": {
//     "1": {"class_type": "LoadImage",
//           "errors": [{"type": "custom_validation_failed",
//                       "message": "Custom validation failed for node",
//                       "details": "image - Invalid image file: cat.png"}]}
//   }
// }
//
// The module is pure (no React, no fetch) so the decoding is testable on its
// own.

export type NodeValidationError = {
    nodeId: string;
    classType: string;
    details: string;
};

export type PromptError = {
    type: string;
    message: string;
    details: string;
    nodes: NodeValidationError[];
};

const asRecord = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : undefined;

const asText = (v: unknown): string => (typeof v === 'string' ? v : '');

// One line per failed node: `#<id> <class_type>: <details>`. Node ids are the
// workflow's own, so the user can find the control behind the node title.
export const formatPromptError = (error: PromptError): string => {
    const nodes = error.nodes.map(
        (n) =>
            `#${n.nodeId} ${n.classType || '?'}: ${n.details || 'invalid input'}`,
    );
    const top = [error.message, error.details].filter(Boolean).join(' — ');
    return nodes.length ? nodes.join('; ') : top;
};

// Returns null for anything that isn't shaped like a validation rejection, so
// the caller keeps its generic fallback.
export const parsePromptError = (body: unknown): PromptError | null => {
    const root = asRecord(body);
    const top = asRecord(root?.error);
    const nodeErrors = asRecord(root?.node_errors);
    if (!top && !nodeErrors) {
        return null;
    }

    const nodes: NodeValidationError[] = [];
    for (const [nodeId, raw] of Object.entries(nodeErrors ?? {})) {
        const node = asRecord(raw);
        const errors = Array.isArray(node?.errors) ? node.errors : [];
        const first = asRecord(errors[0]) ?? {};
        nodes.push({
            nodeId,
            classType: asText(node?.class_type),
            // `details` carries the concrete reason ("image - Invalid image
            // file: x.png"); `message` is the generic wrapper.
            details: asText(first.details) || asText(first.message),
        });
    }

    return {
        type: asText(top?.type),
        message: asText(top?.message),
        details: asText(top?.details),
        nodes,
    };
};
