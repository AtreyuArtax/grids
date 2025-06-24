// This module defines various predefined grid configurations.

export const gridPresets = {
    "standardMath": {
        squareSizeInput: 40,
        xMin: 0, xMax: 10, xIncrement: 1, xLabelEvery: 1, xAxisLabel: "𝑥", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 10, yIncrement: 1, yLabelEvery: 1, yAxisLabel: "𝑦", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "negativeAndPositive": {
        squareSizeInput: 20,
        xMin: -10, xMax: 10, xIncrement: 1, xLabelEvery: 2, xAxisLabel: "𝑥", xLabelOnZero: true, xAxisLabelOnRight: true, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yAxisLabel: "𝑦", yLabelEvery: 2, yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: true, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "trigGraph": {
        squareSizeInput: 30,
        xMin: null, xMax: null, xIncrement: null, // Overridden by radian settings
        xLabelEvery: 1, xAxisLabel: "", xLabelOnZero: true, xAxisLabelOnRight: true, xAxisLabelType: 'radians',
        yMin: -3, yMax: 3, yIncrement: 0.5, yLabelEvery: 2, yAxisLabel: "", yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: 0, xMaxRadians: 2, radianStepMultiplier: 0.5, // 0 to 2π, steps of π/2
        xGridUnitsPerRadianStep: 6 // Each π/2 spans 3 minor grid units
    },
    "trigGraphDegrees": {
        squareSizeInput: 30,
        xMin: 0, xMax: 360, xIncrement: 15, xLabelEvery: 3, xAxisLabel: "Angle (°)", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'degrees',
        yMin: -3, yMax: 3, yIncrement: 0.5, yLabelEvery: 2, yAxisLabel: "y", yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "velocity": {
        squareSizeInput: 25,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Velocity (m/s [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "position": {
        squareSizeInput: 25,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Position (m [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "acceleration": {
        squareSizeInput: 25,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Acceleration (m/s^2 [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1_4in": {
        squareSizeInput: 24, // 1/4 inch at 96dpi is 24px
        xMin: 0, xMax: 34, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 43, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1_5in": {
        squareSizeInput: 19.2, // 1/5 inch at 96dpi is 19.2px
        xMin: 0, xMax: 42, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 53, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1cm": {
        squareSizeInput: 37.8, // 1cm ≈ 37.8px at 96dpi
        xMin: 0, xMax: 21, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 27, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_5mm": {
        squareSizeInput: 18.9, // 5mm ≈ 18.9px at 96dpi
        xMin: 0, xMax: 43, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 55, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "blank": {
        squareSizeInput: 50,
        xMin: null, xMax: null, xIncrement: null,
        xLabelEvery: 1, xAxisLabel: "", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'radians',
        yMin: -3, yMax: 3, yIncrement: 0.5, yLabelEvery: 2, yAxisLabel: "", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: 0, xMaxRadians: 2, radianStepMultiplier: 0.5,
        xGridUnitsPerRadianStep: 3
    }
};
