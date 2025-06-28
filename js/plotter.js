// This module handles the core grid drawing functionality and export features.
import { 
    parseSuperscript, 
    formatRadianLabel, 
    formatEquationTextForDisplay, 
    LINE_STYLES, 
    SHADE_ALPHA, 
    EPSILON, 
    ZERO_LINE_EXTENSION, 
    AXIS_TITLE_SPACING, 
    getArrowHeadSize,
    getFontSizes,
    getLineRectIntersection,
    drawEndpointDot,
    drawArrowhead,
    safeParseFloat,
    safeParseInt
} from './utils.js';
import { dynamicMarginLeft, dynamicMarginRight, dynamicMarginTop, dynamicMarginBottom } from './labels.js';
import { equationsToDraw } from './equations.js';

/**
 * Safely gets element value with fallback.
 * @param {string} id - Element ID.
 * @param {string} type - Type of value to get ('float', 'int', 'boolean', 'string').
 * @param {*} fallback - Fallback value.
 * @returns {*} The element value or fallback.
 */
function getElementValue(id, type, fallback) {
    const element = document.getElementById(id);
    if (!element) return fallback;
    
    switch (type) {
        case 'float':
            return safeParseFloat(element.value, fallback);
        case 'int':
            return safeParseInt(element.value, fallback);
        case 'boolean':
            return element.checked;
        case 'string':
        default:
            return element.value || fallback;
    }
}

/**
 * Creates an SVG text element with proper positioning and styling.
 * @param {string} textContent - The text content.
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {Object} options - Styling options.
 * @returns {SVGTextElement} The created text element.
 */
function createSVGText(textContent, x, y, options = {}) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = textContent;
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    
    // Set default attributes
    const defaults = {
        'font-family': 'Inter, sans-serif',
        'font-size': '14px',
        'fill': '#333',
        'text-anchor': 'middle',
        'dominant-baseline': 'central'
    };
    
    // Apply defaults and options
    Object.assign(defaults, options);
    Object.entries(defaults).forEach(([key, value]) => {
        text.setAttribute(key, value);
    });
    
    return text;
}

/**
 * Creates an SVG text element with PDF-compatible positioning.
 * For PDF export, we need to adjust the baseline positioning.
 * @param {string} textContent - The text content.
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {Object} options - Styling options.
 * @param {boolean} isPDFExport - Whether this is for PDF export.
 * @returns {SVGTextElement} The created text element.
 */
function createSVGTextWithPDFCompat(textContent, x, y, options = {}, isPDFExport = false) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = textContent;
    text.setAttribute('x', x);
    
    // Adjust y positioning for PDF compatibility
    let adjustedY = y;
    if (isPDFExport) {
        // For PDF export, we need to manually adjust the baseline
        // SVG 'central' baseline doesn't translate well to PDF
        const fontSize = parseFloat(options['font-size'] || '14px');
        adjustedY = y + (fontSize * 0.35); // Approximate adjustment for central alignment
    }
    text.setAttribute('y', adjustedY);
    
    // Set default attributes
    const defaults = {
        'font-family': 'Inter, sans-serif',
        'font-size': '14px',
        'fill': '#333',
        'text-anchor': 'middle',
        'dominant-baseline': isPDFExport ? 'baseline' : 'central'
    };
    
    // Apply defaults and options
    Object.assign(defaults, options);
    Object.entries(defaults).forEach(([key, value]) => {
        text.setAttribute(key, value);
    });
    
    return text;
}

/**
 * Draws the main grid based on current settings.
 */
export function drawGrid() {
    const svg = document.getElementById('gridSVG');
    if (!svg) return;

    // Clear existing content
    svg.innerHTML = '';

    const paperStyle = getElementValue('paperStyle', 'string', 'grid');
    
    if (paperStyle === 'polar') {
        drawPolarGrid(svg);
    } else {
        drawCartesianGrid(svg);
    }
}

/**
 * Draws a polar grid.
 * @param {SVGElement} svg - The SVG element to draw on.
 */
function drawPolarGrid(svg) {
    const numCircles = getElementValue('polarNumCircles', 'int', 8);
    const numRadials = getElementValue('polarNumRadials', 'int', 12);
    const degrees = getElementValue('polarDegrees', 'int', 360);
    const minorGridColor = getElementValue('minorGridColor', 'string', '#a9a9a9');
    
    const svgWidth = 800;
    const svgHeight = 600;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;
    
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    // Draw concentric circles
    for (let i = 1; i <= numCircles; i++) {
        const radius = (i / numCircles) * maxRadius;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', centerX);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', minorGridColor);
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);
    }

    // Draw radial lines
    const angleStep = degrees / numRadials;
    for (let i = 0; i < numRadials; i++) {
        const angle = (i * angleStep) * Math.PI / 180;
        const x2 = centerX + maxRadius * Math.cos(angle);
        const y2 = centerY + maxRadius * Math.sin(angle);
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', minorGridColor);
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }
}

/**
 * Draws a Cartesian grid.
 * @param {SVGElement} svg - The SVG element to draw on.
 * @param {boolean} isPDFExport - Whether this is for PDF export.
 */
function drawCartesianGrid(svg, isPDFExport = false) {
    // Get all settings
    const squareSize = getElementValue('squareSizeInput', 'float', 15);
    const yMin = getElementValue('yMin', 'float', 0);
    const yMax = getElementValue('yMax', 'float', 10);
    const yIncrement = getElementValue('yIncrement', 'float', 1);
    const yLabelEvery = getElementValue('yLabelEvery', 'int', 1);
    const yAxisLabel = parseSuperscript(getElementValue('yAxisLabel', 'string', ''));
    const yLabelOnZero = getElementValue('yLabelOnZero', 'boolean', false);
    const yAxisLabelOnTop = getElementValue('yAxisLabelOnTop', 'boolean', false);
    
    const xAxisLabelType = getElementValue('xAxisLabelType', 'string', 'numbers');
    let xMin, xMax, xIncrement;
    
    if (xAxisLabelType === 'radians') {
        const xMinRadians = getElementValue('xMinRadians', 'float', 0);
        const xMaxRadians = getElementValue('xMaxRadians', 'float', 2);
        const radianStepMultiplier = getElementValue('radianStepMultiplier', 'float', 0.5);
        const xGridUnitsPerRadianStep = getElementValue('xGridUnitsPerRadianStep', 'int', 6);
        
        xMin = xMinRadians * Math.PI;
        xMax = xMaxRadians * Math.PI;
        xIncrement = radianStepMultiplier * Math.PI / xGridUnitsPerRadianStep;
    } else {
        xMin = getElementValue('xMin', 'float', 0);
        xMax = getElementValue('xMax', 'float', 10);
        xIncrement = getElementValue('xIncrement', 'float', 1);
    }
    
    const xLabelEvery = getElementValue('xLabelEvery', 'int', 1);
    const xAxisLabel = parseSuperscript(getElementValue('xAxisLabel', 'string', ''));
    const xLabelOnZero = getElementValue('xLabelOnZero', 'boolean', false);
    const xAxisLabelOnRight = getElementValue('xAxisLabelOnRight', 'boolean', false);
    
    const suppressZeroLabel = getElementValue('suppressZeroLabel', 'boolean', false);
    const showAxisArrows = getElementValue('showAxisArrows', 'boolean', false);
    const showAxes = getElementValue('showAxes', 'boolean', true);
    const minorGridColor = getElementValue('minorGridColor', 'string', '#a9a9a9');
    const majorGridColor = getElementValue('majorGridColor', 'string', '#555555');
    const paperStyle = getElementValue('paperStyle', 'string', 'grid');

    // Get current font sizes and arrow size
    const fontSizes = getFontSizes();
    const arrowHeadSize = getArrowHeadSize();

    // Calculate grid dimensions
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xSquares = Math.ceil(xRange / xIncrement);
    const ySquares = Math.ceil(yRange / yIncrement);
    
    const gridWidth = xSquares * squareSize;
    const gridHeight = ySquares * squareSize;
    const totalWidth = gridWidth + dynamicMarginLeft + dynamicMarginRight;
    const totalHeight = gridHeight + dynamicMarginTop + dynamicMarginBottom;
    
    svg.setAttribute('width', totalWidth);
    svg.setAttribute('height', totalHeight);
    svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    // Helper functions for coordinate conversion
    const xToSVG = (x) => dynamicMarginLeft + ((x - xMin) / xIncrement) * squareSize;
    const yToSVG = (y) => dynamicMarginTop + gridHeight - ((y - yMin) / yIncrement) * squareSize;

    // Draw grid lines
    if (paperStyle === 'grid') {
        // Vertical lines
        for (let i = 0; i <= xSquares; i++) {
            const x = dynamicMarginLeft + i * squareSize;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', x);
            line.setAttribute('y1', dynamicMarginTop);
            line.setAttribute('x2', x);
            line.setAttribute('y2', dynamicMarginTop + gridHeight);
            line.setAttribute('stroke', minorGridColor);
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }

        // Horizontal lines
        for (let i = 0; i <= ySquares; i++) {
            const y = dynamicMarginTop + i * squareSize;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', dynamicMarginLeft);
            line.setAttribute('y1', y);
            line.setAttribute('x2', dynamicMarginLeft + gridWidth);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', minorGridColor);
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }
    } else if (paperStyle === 'dot') {
        // Draw dots at grid intersections
        for (let i = 0; i <= xSquares; i++) {
            for (let j = 0; j <= ySquares; j++) {
                const x = dynamicMarginLeft + i * squareSize;
                const y = dynamicMarginTop + j * squareSize;
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute('cx', x);
                dot.setAttribute('cy', y);
                dot.setAttribute('r', '1');
                dot.setAttribute('fill', minorGridColor);
                svg.appendChild(dot);
            }
        }
    }

    // Draw axes
    if (showAxes) {
        const zeroX = xToSVG(0);
        const zeroY = yToSVG(0);

        // Y-axis (vertical line)
        if (zeroX >= dynamicMarginLeft && zeroX <= dynamicMarginLeft + gridWidth) {
            const yAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const yStart = Math.max(dynamicMarginTop, yToSVG(yMax));
            const yEnd = Math.min(dynamicMarginTop + gridHeight, yToSVG(yMin));
            
            yAxisLine.setAttribute('x1', zeroX);
            yAxisLine.setAttribute('y1', showAxisArrows && yMax > EPSILON ? yStart - ZERO_LINE_EXTENSION : yStart);
            yAxisLine.setAttribute('x2', zeroX);
            yAxisLine.setAttribute('y2', yEnd);
            yAxisLine.setAttribute('stroke', majorGridColor);
            yAxisLine.setAttribute('stroke-width', '2');
            svg.appendChild(yAxisLine);

            // Y-axis arrow
            if (showAxisArrows && yMax > EPSILON) {
                const arrowY = yStart - ZERO_LINE_EXTENSION;
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = [
                    [zeroX, arrowY],
                    [zeroX - arrowHeadSize/2, arrowY + arrowHeadSize],
                    [zeroX + arrowHeadSize/2, arrowY + arrowHeadSize]
                ].map(p => p.join(',')).join(' ');
                arrow.setAttribute('points', points);
                arrow.setAttribute('fill', majorGridColor);
                svg.appendChild(arrow);
            }
        }

        // X-axis (horizontal line)
        if (zeroY >= dynamicMarginTop && zeroY <= dynamicMarginTop + gridHeight) {
            const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const xStart = Math.max(dynamicMarginLeft, xToSVG(xMin));
            const xEnd = Math.min(dynamicMarginLeft + gridWidth, xToSVG(xMax));
            
            xAxisLine.setAttribute('x1', xStart);
            xAxisLine.setAttribute('y1', zeroY);
            xAxisLine.setAttribute('x2', showAxisArrows && xMax > EPSILON ? xEnd + ZERO_LINE_EXTENSION : xEnd);
            xAxisLine.setAttribute('y2', zeroY);
            xAxisLine.setAttribute('stroke', majorGridColor);
            xAxisLine.setAttribute('stroke-width', '2');
            svg.appendChild(xAxisLine);

            // X-axis arrow
            if (showAxisArrows && xMax > EPSILON) {
                const arrowX = xEnd + ZERO_LINE_EXTENSION;
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const points = [
                    [arrowX, zeroY],
                    [arrowX - arrowHeadSize, zeroY - arrowHeadSize/2],
                    [arrowX - arrowHeadSize, zeroY + arrowHeadSize/2]
                ].map(p => p.join(',')).join(' ');
                arrow.setAttribute('points', points);
                arrow.setAttribute('fill', majorGridColor);
                svg.appendChild(arrow);
            }
        }
    }

    // Draw Y-axis labels
    if (yIncrement > 0) {
        for (let val = yMin; val <= yMax; val += yIncrement) {
            const value = val;
            const isZeroLine = Math.abs(value) < yIncrement / 2;
            
            if ((Math.round(val / yIncrement) % yLabelEvery === 0) || (yLabelOnZero && isZeroLine)) {
                if (value === 0 && suppressZeroLabel) continue;
                
                const labelText = value.toFixed(yIncrement.toString().includes('.') ? yIncrement.toString().split('.')[1].length : 0);
                const y = yToSVG(value);
                const x = dynamicMarginLeft - 10;
                
                const text = createSVGTextWithPDFCompat(labelText, x, y, {
                    'text-anchor': 'end',
                    'font-size': `${fontSizes.axisNumbers}px`
                }, isPDFExport);
                svg.appendChild(text);
            }
        }
    }

    // Draw X-axis labels
    let xValuePerMinorSquare = xIncrement;
    if (xAxisLabelType === 'radians') {
        const radianStepMultiplier = getElementValue('radianStepMultiplier', 'float', 0.5);
        const xGridUnitsPerRadianStep = getElementValue('xGridUnitsPerRadianStep', 'int', 6);
        if (xGridUnitsPerRadianStep > 0) {
            xValuePerMinorSquare = radianStepMultiplier * Math.PI / xGridUnitsPerRadianStep;
        }
    }

    if (xValuePerMinorSquare > 0) {
        for (let val = xMin; val <= xMax; val += xValuePerMinorSquare) {
            const value = val;
            const isZeroLine = Math.abs(value) < xValuePerMinorSquare / 2;
            let shouldLabel = false;

            if (xAxisLabelType === 'radians') {
                const xGridUnitsPerRadianStep = getElementValue('xGridUnitsPerRadianStep', 'int', 6);
                const radianStepMultiplier = getElementValue('radianStepMultiplier', 'float', 0.5);
                const majorStepIndex = Math.round((value - xMin) / (radianStepMultiplier * Math.PI));
                if (xGridUnitsPerRadianStep > 0 && (Math.round(value / xValuePerMinorSquare) % xGridUnitsPerRadianStep === 0) && (majorStepIndex % xLabelEvery === 0)) {
                    shouldLabel = true;
                }
            } else {
                if (Math.round((value - xMin) / xValuePerMinorSquare) % xLabelEvery === 0) {
                    shouldLabel = true;
                }
            }

            if (yLabelOnZero && isZeroLine) {
                shouldLabel = true;
            }

            if (shouldLabel) {
                if (value === 0 && suppressZeroLabel) continue;
                
                let labelText;
                if (xAxisLabelType === 'radians') {
                    labelText = formatRadianLabel(value);
                } else if (xAxisLabelType === 'degrees') {
                    labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0) + '°';
                } else {
                    labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0);
                }
                
                const x = xToSVG(value);
                const y = dynamicMarginTop + gridHeight + 20;
                
                const text = createSVGTextWithPDFCompat(labelText, x, y, {
                    'text-anchor': 'middle',
                    'font-size': `${fontSizes.axisNumbers}px`
                }, isPDFExport);
                svg.appendChild(text);
            }
        }
    }

    // Draw axis titles
    if (yAxisLabel) {
        if (yAxisLabelOnTop) {
            const zeroX = xToSVG(0);
            if (zeroX >= dynamicMarginLeft && zeroX <= dynamicMarginLeft + gridWidth) {
                const titleY = dynamicMarginTop - AXIS_TITLE_SPACING;
                const text = createSVGTextWithPDFCompat(yAxisLabel, zeroX, titleY, {
                    'text-anchor': 'middle',
                    'font-size': `${fontSizes.axisTitles}px`,
                    'font-weight': 'bold'
                }, isPDFExport);
                svg.appendChild(text);
            }
        } else {
            const titleX = 20;
            const titleY = dynamicMarginTop + gridHeight / 2;
            const text = createSVGTextWithPDFCompat(yAxisLabel, titleX, titleY, {
                'text-anchor': 'middle',
                'font-size': `${fontSizes.axisTitles}px`,
                'font-weight': 'bold',
                'transform': `rotate(-90 ${titleX} ${titleY})`
            }, isPDFExport);
            svg.appendChild(text);
        }
    }

    if (xAxisLabel) {
        if (xAxisLabelOnRight) {
            const zeroY = yToSVG(0);
            if (zeroY >= dynamicMarginTop && zeroY <= dynamicMarginTop + gridHeight) {
                const titleX = dynamicMarginLeft + gridWidth + AXIS_TITLE_SPACING + (showAxisArrows ? ZERO_LINE_EXTENSION + arrowHeadSize : 0);
                const text = createSVGTextWithPDFCompat(xAxisLabel, titleX, zeroY, {
                    'text-anchor': 'start',
                    'font-size': `${fontSizes.axisTitles}px`,
                    'font-weight': 'bold'
                }, isPDFExport);
                svg.appendChild(text);
            }
        } else {
            const titleX = dynamicMarginLeft + gridWidth / 2;
            const titleY = dynamicMarginTop + gridHeight + dynamicMarginBottom - 10;
            const text = createSVGTextWithPDFCompat(xAxisLabel, titleX, titleY, {
                'text-anchor': 'middle',
                'font-size': `${fontSizes.axisTitles}px`,
                'font-weight': 'bold'
            }, isPDFExport);
            svg.appendChild(text);
        }
    }

    // Draw equations
    drawEquations(svg, xToSVG, yToSVG, xMin, xMax, yMin, yMax, gridWidth, gridHeight, isPDFExport);
}

/**
 * Draws all equations on the grid.
 * @param {SVGElement} svg - The SVG element.
 * @param {Function} xToSVG - Function to convert x values to SVG coordinates.
 * @param {Function} yToSVG - Function to convert y values to SVG coordinates.
 * @param {number} xMin - Minimum x value.
 * @param {number} xMax - Maximum x value.
 * @param {number} yMin - Minimum y value.
 * @param {number} yMax - Maximum y value.
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @param {boolean} isPDFExport - Whether this is for PDF export.
 */
function drawEquations(svg, xToSVG, yToSVG, xMin, xMax, yMin, yMax, gridWidth, gridHeight, isPDFExport = false) {
    equationsToDraw.forEach((eq, index) => {
        try {
            drawSingleEquation(svg, eq, xToSVG, yToSVG, xMin, xMax, yMin, yMax, gridWidth, gridHeight, index, isPDFExport);
        } catch (error) {
            console.error(`Error drawing equation ${eq.rawExpression}:`, error);
        }
    });
}

/**
 * Draws a single equation on the grid.
 * @param {SVGElement} svg - The SVG element.
 * @param {Object} equation - The equation object.
 * @param {Function} xToSVG - Function to convert x values to SVG coordinates.
 * @param {Function} yToSVG - Function to convert y values to SVG coordinates.
 * @param {number} xMin - Minimum x value.
 * @param {number} xMax - Maximum x value.
 * @param {number} yMin - Minimum y value.
 * @param {number} yMax - Maximum y value.
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @param {number} index - Index of the equation for label positioning.
 * @param {boolean} isPDFExport - Whether this is for PDF export.
 */
function drawSingleEquation(svg, equation, xToSVG, yToSVG, xMin, xMax, yMin, yMax, gridWidth, gridHeight, index, isPDFExport = false) {
    const { compiledExpression, domainStart, domainEnd, inequalityType, color, lineStyle, labelType, customLabel, showLineArrows } = equation;
    
    const effectiveXMin = domainStart !== null ? Math.max(domainStart, xMin) : xMin;
    const effectiveXMax = domainEnd !== null ? Math.min(domainEnd, xMax) : xMax;
    
    if (effectiveXMin >= effectiveXMax) return;
    
    const step = (effectiveXMax - effectiveXMin) / 1000;
    const points = [];
    
    // Generate points
    for (let x = effectiveXMin; x <= effectiveXMax; x += step) {
        try {
            const y = compiledExpression.evaluate({ x });
            if (isFinite(y) && y >= yMin && y <= yMax) {
                points.push({ x, y });
            }
        } catch (e) {
            // Skip invalid points
        }
    }
    
    if (points.length < 2) return;
    
    // Create path
    const pathData = points.map((point, i) => {
        const svgX = xToSVG(point.x);
        const svgY = yToSVG(point.y);
        return `${i === 0 ? 'M' : 'L'} ${svgX} ${svgY}`;
    }).join(' ');
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    
    if (lineStyle && LINE_STYLES[lineStyle]) {
        path.setAttribute('stroke-dasharray', LINE_STYLES[lineStyle]);
    }
    
    svg.appendChild(path);
    
    // Draw arrows if enabled
    if (showLineArrows && points.length >= 2) {
        const arrowHeadSize = getArrowHeadSize();
        
        // Arrow at start
        if (points.length >= 2) {
            const start = points[0];
            const second = points[1];
            const startSVG = { x: xToSVG(start.x), y: yToSVG(start.y) };
            const secondSVG = { x: xToSVG(second.x), y: yToSVG(second.y) };
            
            const arrow1 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const angle1 = Math.atan2(secondSVG.y - startSVG.y, secondSVG.x - startSVG.x) + Math.PI;
            const points1 = [
                [startSVG.x, startSVG.y],
                [startSVG.x + arrowHeadSize * Math.cos(angle1 + 0.5), startSVG.y + arrowHeadSize * Math.sin(angle1 + 0.5)],
                [startSVG.x + arrowHeadSize * Math.cos(angle1 - 0.5), startSVG.y + arrowHeadSize * Math.sin(angle1 - 0.5)]
            ].map(p => p.join(',')).join(' ');
            arrow1.setAttribute('points', points1);
            arrow1.setAttribute('fill', color);
            svg.appendChild(arrow1);
        }
        
        // Arrow at end
        if (points.length >= 2) {
            const end = points[points.length - 1];
            const secondLast = points[points.length - 2];
            const endSVG = { x: xToSVG(end.x), y: yToSVG(end.y) };
            const secondLastSVG = { x: xToSVG(secondLast.x), y: yToSVG(secondLast.y) };
            
            const arrow2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const angle2 = Math.atan2(endSVG.y - secondLastSVG.y, endSVG.x - secondLastSVG.x);
            const points2 = [
                [endSVG.x, endSVG.y],
                [endSVG.x - arrowHeadSize * Math.cos(angle2 + 0.5), endSVG.y - arrowHeadSize * Math.sin(angle2 + 0.5)],
                [endSVG.x - arrowHeadSize * Math.cos(angle2 - 0.5), endSVG.y - arrowHeadSize * Math.sin(angle2 - 0.5)]
            ].map(p => p.join(',')).join(' ');
            arrow2.setAttribute('points', points2);
            arrow2.setAttribute('fill', color);
            svg.appendChild(arrow2);
        }
    }
    
    // Draw equation label
    if ((labelType === 'custom' && customLabel.trim() !== '') || labelType === 'equation') {
        let labelText = '';
        if (labelType === 'custom' && customLabel.trim() !== '') {
            labelText = formatEquationTextForDisplay(customLabel);
        } else if (labelType === 'equation') {
            labelText = formatEquationTextForDisplay(`y ${inequalityType || '='} ${equation.rawExpression}`);
        }
        
        if (labelText) {
            const fontSizes = getFontSizes();
            const labelX = dynamicMarginLeft + gridWidth + 10;
            const labelY = dynamicMarginTop + 20 + (index * 20);
            
            const text = createSVGTextWithPDFCompat(labelText, labelX, labelY, {
                'text-anchor': 'start',
                'font-size': `${fontSizes.equationLabels}px`,
                'fill': color
            }, isPDFExport);
            svg.appendChild(text);
        }
    }
}

/**
 * Downloads the current grid as an SVG file.
 */
export function downloadSVG() {
    const svg = document.getElementById('gridSVG');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const link = document.createElement('a');
    link.download = `grid_${timestamp}.svg`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Exports the current grid as a PNG image.
 */
export function exportSVGtoPNG() {
    const svg = document.getElementById('gridSVG');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        
        const link = document.createElement('a');
        link.download = `grid_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.src = url;
}

/**
 * Exports the current grid as a PDF file.
 */
export function exportSVGtoPDF() {
    const svg = document.getElementById('gridSVG');
    if (!svg) return;
    
    // Create a copy of the SVG for PDF export with adjusted text positioning
    const svgCopy = svg.cloneNode(true);
    
    // Clear the copy and redraw with PDF-compatible positioning
    svgCopy.innerHTML = '';
    
    // Temporarily replace the original SVG with our copy
    const originalParent = svg.parentNode;
    const originalNextSibling = svg.nextSibling;
    originalParent.replaceChild(svgCopy, svg);
    
    // Set the copy's ID so our drawing function can find it
    svgCopy.id = 'gridSVG';
    
    try {
        // Redraw the grid with PDF-compatible text positioning
        const paperStyle = getElementValue('paperStyle', 'string', 'grid');
        if (paperStyle === 'polar') {
            drawPolarGrid(svgCopy);
        } else {
            drawCartesianGrid(svgCopy, true); // true = isPDFExport
        }
        
        // Get SVG dimensions
        const svgWidth = parseFloat(svgCopy.getAttribute('width'));
        const svgHeight = parseFloat(svgCopy.getAttribute('height'));
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [svgWidth, svgHeight]
        });
        
        // Convert SVG to PDF
        svg2pdf(svgCopy, pdf, {
            xOffset: 0,
            yOffset: 0,
            scale: 1
        }).then(() => {
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
            
            pdf.save(`grid_${timestamp}.pdf`);
        }).catch(error => {
            console.error('Error generating PDF:', error);
        });
        
    } finally {
        // Restore the original SVG
        originalParent.replaceChild(svg, svgCopy);
    }
}