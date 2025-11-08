// components/ParameterControls.tsx
import React from "react";
import {
    Box,
    Typography,
    Slider,
    Stack,
    Paper
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface ParameterControlsProps {
    detailLevel: number;
    setDetailLevel: (value: number) => void;
    expressiveness: number;
    setExpressiveness: (value: number) => void;
}

const ParameterSection = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
}));

const SliderContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3, 2, 2, 2),
    marginBottom: theme.spacing(3),
}));

const ParameterControls: React.FC<ParameterControlsProps> = ({
    detailLevel,
    setDetailLevel,
    expressiveness,
    setExpressiveness,
}) => {
    const sliderMarks = [
        { value: -5, label: '' },
        { value: 0, label: 'Default' },
        { value: 5, label: '' },
    ];

    const handleDetailChange = (_event: Event, newValue: number | number[]) => {
        setDetailLevel(newValue as number);
    };

    const handleExpressivenessChange = (_event: Event, newValue: number | number[]) => {
        setExpressiveness(newValue as number);
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Caption Parameters
            </Typography>

            <ParameterSection>
                <SliderContainer>
                    <Typography variant="subtitle1" gutterBottom>
                        Level of Detail
                    </Typography>

                    <Slider
                        value={detailLevel}
                        onChange={handleDetailChange}
                        min={-5}
                        max={5}
                        step={1}
                        marks={sliderMarks}
                        valueLabelDisplay="auto"
                        aria-labelledby="detail-level-slider"
                    />

                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Minimal
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Value: {detailLevel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Detailed
                        </Typography>
                    </Stack>
                </SliderContainer>

                <SliderContainer>
                    <Typography variant="subtitle1" gutterBottom>
                        Expressiveness
                    </Typography>

                    <Slider
                        value={expressiveness}
                        onChange={handleExpressivenessChange}
                        min={-5}
                        max={5}
                        step={1}
                        marks={sliderMarks}
                        valueLabelDisplay="auto"
                        aria-labelledby="expressiveness-slider"
                    />

                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Literal
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Value: {expressiveness}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Artistic
                        </Typography>
                    </Stack>
                </SliderContainer>
            </ParameterSection>
        </Paper>
    );
};

export default ParameterControls;
