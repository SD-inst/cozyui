import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const LLMSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                {
                    text: 'Florence2-base',
                    value: 'microsoft/Florence-2-base',
                },
                {
                    text: 'CogFlorence 2.2 Large',
                    value: 'thwri/CogFlorence-2.2-Large',
                },
                {
                    text: 'Florence2-large PromptGen v2.0',
                    value: 'MiaoshouAI/Florence-2-large-PromptGen-v2.0',
                },
            ]}
            defaultValue='thwri/CogFlorence-2.2-Large'
            {...props}
        />
    );
};
