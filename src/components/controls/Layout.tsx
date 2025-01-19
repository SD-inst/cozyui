import { Grid2 as Grid } from '@mui/material';

export const Layout = ({ ...props }) => {
    return (
        <Grid container width='100%' spacing={2}>
            {props.children}
        </Grid>
    );
};

export const GridLeft = ({ ...props }) => {
    return (
        <Grid size={{ xs: 12, md: 8 }} {...props}>
            {props.children}
        </Grid>
    );
};

export const GridRight = ({ ...props }) => {
    return (
        <Grid size={{ xs: 12, md: 4 }} {...props}>
            {props.children}
        </Grid>
    );
};

export const GridBottom = ({ ...props }) => {
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
