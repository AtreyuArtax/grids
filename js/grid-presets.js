// This module defines various predefined grid configurations.

export const gridPresets = {
    "standardMath": {
        squareSizeInput: 15,
        xMin: 0, xMax: 10, xIncrement: 1, xLabelEvery: 1, xAxisLabel: "x", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 10, yIncrement: 1, yLabelEvery: 1, yAxisLabel: "y", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "negativeAndPositive": {
        squareSizeInput: 15,
        xMin: -10, xMax: 10, xIncrement: 1, xLabelEvery: 2, xAxisLabel: "x", xLabelOnZero: true, xAxisLabelOnRight: true, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yAxisLabel: "y", yLabelEvery: 2, yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: true, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "trigGraph": {
        squareSizeInput: 15,
        xMin: null, xMax: null, xIncrement: null, // Overridden by radian settings
        xLabelEvery: 1, xAxisLabel: "", xLabelOnZero: true, xAxisLabelOnRight: true, xAxisLabelType: 'radians',
        yMin: -3, yMax: 3, yIncrement: 0.5, yLabelEvery: 2, yAxisLabel: "", yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: 0, xMaxRadians: 2, radianStepMultiplier: 0.5, // 0 to 2π, steps of π/2
        xGridUnitsPerRadianStep: 6 // Each π/2 spans 3 minor grid units
    },
    "trigGraphDegrees": {
        squareSizeInput: 15,
        xMin: 0, xMax: 360, xIncrement: 15, xLabelEvery: 3, xAxisLabel: "Angle (°)", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'degrees',
        yMin: -3, yMax: 3, yIncrement: 0.5, yLabelEvery: 2, yAxisLabel: "y", yLabelOnZero: true, yAxisLabelOnTop: true,
        suppressZeroLabel: false, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "velocity": {
        squareSizeInput: 15,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Velocity (m/s [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "position": {
        squareSizeInput: 15,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Position (m [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "acceleration": {
        squareSizeInput: 15,
        xMin: 0, xMax: 15, xIncrement: 0.5, xLabelEvery: 0, xAxisLabel: "Time (s)", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "Acceleration (m/s^2 [E])", yLabelOnZero: true, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: true,
        showLineArrows: true, showAxes: true,
        minorGridColor: "#a9a9a9",
        majorGridColor: "#555555",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1_4in": {
        squareSizeInput: 15, // 1/4 inch at 96dpi is 24px
        xMin: 0, xMax: 34, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 43, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true, showAxes: false,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1_5in": {
        squareSizeInput: 15, // 1/5 inch at 96dpi is 19.2px
        xMin: 0, xMax: 42, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 53, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true, showAxes: false,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_1cm": {
        squareSizeInput: 15, // 1cm ≈ 37.8px at 96dpi
        xMin: 0, xMax: 21, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 27, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true, showAxes: false,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "graphPaperLetter_5mm": {
        squareSizeInput: 15, // 5mm ≈ 18.9px at 96dpi
        xMin: 0, xMax: 43, xIncrement: 1, xLabelEvery: 0, xAxisLabel: "", xLabelOnZero: false, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
        yMin: 0, yMax: 55, yIncrement: 1, yLabelEvery: 0, yAxisLabel: "", yLabelOnZero: false, yAxisLabelOnTop: false,
        suppressZeroLabel: true, showAxisArrows: false,
        showLineArrows: true, showAxes: false,
        minorGridColor: "#323232",
        majorGridColor: "#323232",
        xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null
    },
    "polar": {
    squareSizeInput: 15,
    xMin: -10, xMax: 10, xIncrement: 1, xLabelEvery: 1, xAxisLabel: "x", xLabelOnZero: true, xAxisLabelOnRight: false, xAxisLabelType: 'numbers',
    yMin: -10, yMax: 10, yIncrement: 1, yLabelEvery: 1, yAxisLabel: "y", yLabelOnZero: true, yAxisLabelOnTop: false,
    suppressZeroLabel: false, showAxisArrows: false,
    showLineArrows: false, showAxes: false,
    minorGridColor: "#a9a9a9",
    majorGridColor: "#555555",
    xMinRadians: null, xMaxRadians: null, radianStepMultiplier: null, xGridUnitsPerRadianStep: null,
    paperStyle: 'polar'
}

};
