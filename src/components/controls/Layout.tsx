import { Grid2 as Grid, Grid2Props } from '@mui/material';

export const Layout = ({ ...props }: Grid2Props) => {
    return (
        <Grid container width='100%' spacing={2} {...props}>
            {props.children}
        </Grid>
    );
};

export const GridLeft = ({ ...props }: Grid2Props) => {
    return (
        <Grid size={{ xs: 12, md: 8 }} {...props}>
            {props.children}
        </Grid>
    );
};

export const GridRight = ({ ...props }: Grid2Props) => {
    return (
        <Grid size={{ xs: 12, md: 4 }} {...props}>
            {props.children}
        </Grid>
    );
};

export const GridBottom = ({ ...props }: Grid2Props) => {
    return (
        <Grid
            justifyContent='center'
            size={{ xs: 12, md: 8 }}
            container
            spacing={2}
            {...props}
        >
            <Grid>{props.children}</Grid>
        </Grid>
    );
};
