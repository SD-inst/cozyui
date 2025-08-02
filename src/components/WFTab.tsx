import { ReactNode } from 'react';

export type receiverParametersType = {
    name: string;
    weight?: number;
    acceptedTypes: string | string[];
};

//eslint-disable-next-line no-empty-pattern
export const WFTab = ({}: {
    label: string;
    value?: number | string;
    content: ReactNode;
    group?: string;
    receivers?: receiverParametersType[];
}) => {
    return null;
};
