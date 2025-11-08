import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Slider,
    Stack,
    Tooltip,
    CircularProgress
} from "@mui/material";
import { styled } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface ParameterSliderProps {
    title: string;
    parameter: 'detailLevel' | 'expressiveness';
    value: number;
    onChange: (parameter: 'detailLevel' | 'expressiveness', value: number) => void;
    minLabel: string;
    maxLabel: string;
    isLoading?: boolean;
    disabled?: boolean;
}

const SliderContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
}));

const InfoIcon = styled(InfoOutlinedIcon)(({ theme }) => ({
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    cursor: 'help',
}));

const ParameterSlider: React.FC<ParameterSliderProps> = ({
    title,
    parameter,
    value,
    onChange,
    minLabel,
    maxLabel,
    isLoading = false,
    disabled = false,
}) => {
    const [sliderValue, setSliderValue] = useState<number>(value);
    const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

    // Update internal value when prop changes
    useEffect(() => {
        setSliderValue(value);
    }, [value]);

    // Update UI value while dragging, do NOT trigger transformation here
    const handleChange = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
        setIsAdjusting(true);
        setSliderValue(newValue as number);
    };

    // Trigger transformation only when user releases the slider thumb
    const handleChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
        const committedValue = newValue as number;
        if (committedValue !== value) {
            onChange(parameter, committedValue);
        }
        setIsAdjusting(false);
    };

    const toBucket = (val: number) => {
        const normalized = Math.round(((val + 5) / 10) * 4) + 1; // -5 -> 1, 0 -> 3, 5 -> 5
        return Math.max(1, Math.min(5, normalized));
    };

    const examples = parameter === 'detailLevel'
        ? {
            1: '(DOG BARK)',
            2: '(DOG BARKS)',
            3: '(DOG BARKS TWICE)',
            4: '(DOG BARKS SHARPLY TWICE)',
            5: '(SHARP, ECHOING DOG BARKS TWICE)'
        }
        : {
            1: '(DOG BARK)',
            2: '(LOUD DOG BARK)',
            3: '(SHARP DOG BARK)',
            4: '(CRISP, RINGING DOG BARK)',
            5: '(PIERCING, ECHOING DOG BARK)'
        };

    const getDescription = () => {
        if (parameter === 'detailLevel') {
            return "Controls how detailed the captions are. Move left for minimal descriptions, right for detailed ones.";
        } else {
            return "Controls how the captions are written. Move left for literal descriptions, right for more artistic ones.";
        }
    };

    return (
        <SliderContainer>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">
                    {title}
                </Typography>
                <Tooltip title={getDescription()} arrow placement="top">
                    <InfoIcon />
                </Tooltip>
                {isLoading && (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                )}
            </Stack>

            {isAdjusting && (
                <Box
                    sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: 'grey.100',
                        border: '1px solid',
                        borderColor: 'grey.300'
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Live example
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">
                            Lvl {toBucket(value)} {examples[toBucket(value) as 1|2|3|4|5]}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">→</Typography>
                        <Typography variant="body2" fontWeight={600}>
                            Lvl {toBucket(sliderValue)} {examples[toBucket(sliderValue) as 1|2|3|4|5]}
                        </Typography>
                    </Stack>
                </Box>
            )}

            <Slider
                value={sliderValue}
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                onMouseDown={() => setIsAdjusting(true)}
                onMouseUp={() => setIsAdjusting(false)}
                onTouchStart={() => setIsAdjusting(true)}
                onTouchEnd={() => setIsAdjusting(false)}
                min={-5}
                max={5}
                step={1}
                marks={[
                    { value: -5, label: '' },
                    { value: 0, label: 'Default' },
                    { value: 5, label: '' }
                ]}
                valueLabelDisplay="off"
                aria-labelledby={`${parameter}-slider`}
                disabled={disabled || isLoading}
            // sx={{
            //     color: 'primary.main',
            //     '& .MuiSlider-valueLabel': {
            //         backgroundColor: 'primary.main',
            //     },
            //     '& .MuiSlider-mark': {
            //         backgroundColor: '#bfbfbf',
            //         height: 8,
            //         width: 1,
            //         marginTop: -3,
            //     },
            //     '& .MuiSlider-markActive': {
            //         backgroundColor: 'currentColor',
            //     }
            // }}
            />

            <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                    {minLabel}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                    Value: {sliderValue}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {maxLabel}
                </Typography>
            </Stack>
        </SliderContainer>
    );
};

export default ParameterSlider;
