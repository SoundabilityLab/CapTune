import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Tooltip,
    styled,
    alpha,
    useTheme
} from '@mui/material';
import { UserPreference } from './AdapterPage';

interface StyleGridProps {
    preference: UserPreference;
    onPreferenceChange: (preference: UserPreference) => void;
    lowerBound?: {
        detailLevel: number;
        expressiveness: number;
    };
    upperBound?: {
        detailLevel: number;
        expressiveness: number;
    };
    disabled?: boolean;
}

// Define the quadrant labels and descriptions
const quadrants = [
    {
        id: 'minimalist',
        label: 'Minimalist',
        description: 'Simple, direct, straight-to-the-point captions',
        x: 0, // Low detail
        y: 0, // Low expressiveness
        color: '#4dabf5' // Light blue
    },
    {
        id: 'informative',
        label: 'Informative',
        description: 'Informative, factual captions',
        x: 1, // High detail
        y: 0, // Low expressiveness
        color: '#53c4a4' // Teal
    },
    {
        id: 'evocative',
        label: 'Evocative',
        description: 'Concise but emotionally resonant captions',
        x: 0, // Low detail
        y: 1, // High expressiveness
        color: '#ba68c8' // Purple
    },
    {
        id: 'cinematic',
        label: 'Cinematic',
        description: 'Rich, immersive, dramatically expressive captions',
        x: 1, // High detail
        y: 1, // High expressiveness
        color: '#ff7043' // Orange
    }
];

// Constants for grid size
const GRID_SIZE = 10;
const QUADRANT_SIZE = GRID_SIZE / 2;

// Styled components
const GridCell = styled(Paper, {
    shouldForwardProp: (prop) =>
        prop !== 'isSelected' &&
        prop !== 'isOutOfBounds' &&
        prop !== 'cellColor'
})<{
    isSelected: boolean;
    isOutOfBounds: boolean;
    cellColor: string;
}>(({ theme, isSelected, isOutOfBounds, cellColor }) => ({
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isOutOfBounds ? 'not-allowed' : 'pointer',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: isOutOfBounds
        ? theme.palette.grey[200]
        : isSelected
            ? alpha(cellColor, 0.8)
            : alpha(cellColor, 0.2),
    transition: 'all 0.2s ease',
    border: isSelected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
    opacity: isOutOfBounds ? 0.5 : 1,
    '&:hover': {
        backgroundColor: isOutOfBounds
            ? theme.palette.grey[200]
            : isSelected
                ? alpha(cellColor, 0.8)
                : alpha(cellColor, 0.4),
        transform: isOutOfBounds ? 'none' : 'scale(1.02)'
    }
}));

// Removed quadrant corner labels per request

const StyleGrid: React.FC<StyleGridProps> = ({
    preference,
    onPreferenceChange,
    lowerBound = { detailLevel: 1, expressiveness: 1 },
    upperBound = { detailLevel: 10, expressiveness: 10 },
    disabled = false
}) => {
    const theme = useTheme();
    const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);

    useEffect(() => {
        // Calculate current cell position based on preference values
        // With 10x10 grid, we can directly map values to cell positions
        // We subtract 1 from preference values to convert from 1-10 scale to 0-9 grid index
        const cellX = Math.round(preference.detailLevel - 1);
        const cellY = Math.round(preference.expressiveness - 1);

        setSelectedCell([cellX, cellY]);
    }, [preference, lowerBound, upperBound]);

    // Map a grid cell to parameter value
    // With 10x10 grid, the cell position directly maps to parameter values (1-10)
    const mapCellToValue = (cell: number) => {
        // Add 1 to convert from 0-9 grid index to 1-10 parameter scale
        return cell + 1;
    }

    // Check if a cell is out of bounds
    const isCellOutOfBounds = (x: number, y: number): boolean => {
        const detailValue = mapCellToValue(x);
        const expressivenessValue = mapCellToValue(y);

        return (
            detailValue < lowerBound.detailLevel ||
            detailValue > upperBound.detailLevel ||
            expressivenessValue < lowerBound.expressiveness ||
            expressivenessValue > upperBound.expressiveness
        );
    };

    // Handle click on a cell
    const handleCellClick = (x: number, y: number) => {
        if (disabled || isCellOutOfBounds(x, y)) return;

        setSelectedCell([x, y]);

        // Map grid cell to parameter values - direct mapping for 10x10 grid
        const newDetailLevel = mapCellToValue(x);
        const newExpressiveness = mapCellToValue(y);

        // Update preference
        onPreferenceChange({
            ...preference,
            detailLevel: newDetailLevel,
            expressiveness: newExpressiveness
        });

        console.log("Current preference:", {
            ...preference,
            detailLevel: newDetailLevel,
            expressiveness: newExpressiveness
        });
    };

    // Get the color for a cell based on its position relative to quadrants
    const getCellColor = (x: number, y: number): string => {
        // Determine which quadrant this cell belongs to
        const quadrantX = x < QUADRANT_SIZE ? 0 : 1;
        const quadrantY = y < QUADRANT_SIZE ? 0 : 1;

        // Find the corresponding quadrant
        const quadrant = quadrants.find(q => q.x === quadrantX && q.y === quadrantY);

        return quadrant?.color || theme.palette.primary.main;
    };

    return (
        <Box sx={{ position: 'relative', p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
                Caption Style Selection
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Click on a style region that best matches your preference.
                Areas that are grayed out are outside the creator's defined bounds.
            </Typography>

            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 600,
                    margin: '0 auto',
                    mt: 4,
                    mb: 3
                }}>
                {/* Grid container */}
                <Grid container spacing={0.5}>
                    {/* Generate a 10x10 grid */}
                    {Array.from({ length: GRID_SIZE }).map((_, y) => (
                        // We're inverting the y-axis so 0 is at the bottom
                        <Grid container item spacing={0.5} key={GRID_SIZE - 1 - y}>
                            {Array.from({ length: GRID_SIZE }).map((_, x) => {
                                const isSelected = selectedCell[0] === x && selectedCell[1] === (GRID_SIZE - 1 - y);
                                const isOutOfBounds = isCellOutOfBounds(x, GRID_SIZE - 1 - y);
                                const cellColor = getCellColor(x, GRID_SIZE - 1 - y);

                                return (
                                    <Grid item xs={1.2} key={x}>
                                        <Tooltip
                                            title={
                                                isOutOfBounds
                                                    ? "This style is outside the creator's defined bounds"
                                                    : `Detail: ${mapCellToValue(x)}, Expressiveness: ${mapCellToValue(GRID_SIZE - 1 - y)}`
                                            }
                                        >
                                            <Box>
                                                <GridCell
                                                    isSelected={isSelected}
                                                    isOutOfBounds={isOutOfBounds}
                                                    cellColor={cellColor}
                                                    onClick={() => handleCellClick(x, GRID_SIZE - 1 - y)}
                                                    elevation={isSelected ? 3 : 1}
                                                />
                                            </Box>
                                        </Tooltip>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ))}
                </Grid>

                {/* Axis labels */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: -40,
                        top: '50%',
                        transform: 'translateY(-50%) rotate(-90deg)',
                        transformOrigin: 'center center',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Expressiveness
                    </Typography>
                </Box>

                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -25,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Level of Detail
                    </Typography>
                </Box>
            </Box>

            {/* Removed selected style description per request */}
        </Box>
    );
};

export default StyleGrid;
