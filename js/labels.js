// This module handles calculations for dynamic margins and axis label visibility.
import { parseSuperscript, formatRadianLabel, formatEquationTextForDisplay, EPSILON, ZERO_LINE_EXTENSION, AXIS_TITLE_SPACING, ARROW_HEAD_SIZE, safeParseFloat, safeParseInt } from './utils.js';
import { equationsToDraw } from './equations.js'; // Import equationsToDraw
import { errorHandler } from './modules/errorHandler.js';

export let dynamicMarginLeft = 60;
export let dynamicMarginRight = 80;
export let dynamicMarginTop = 31;
export let dynamicMarginBottom = 60;

/**
 * Creates a temporary SVG text element to measure its dimensions.
 * This is necessary because SVG elements don't have a `getContext('2d')` method like canvas.
 * @param {string} textContent - The text content to measure.
 * @param {string} fontSize - CSS font-size property (e.g., '14px').
 * @param {string} fontFamily - CSS font-family property (e.g., 'Inter, sans-serif').
 * @returns {Object} An object containing the text's width, height, and approximated ascent/descent.
 */
function measureSVGText(textContent, fontSize, fontFamily) {
    const svg = document.getElementById('gridSVG');
    if (!svg) {
        // Fallback or error handling if SVG element is not yet in DOM
        errorHandler.warn("SVG element not found for text measurement", {
            component: 'labels',
            action: 'measureSVGText'
        });
        return { width: 0, height: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };
    }

    // Create a temporary SVG text element
    const tempText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tempText.textContent = textContent;
    tempText.setAttribute('font-size', fontSize);
    tempText.setAttribute('font-family', fontFamily);
    // Append to SVG, measure, then remove. Needed for getBBox() to work reliably.
    // The element must be in the DOM to get accurate measurements.
    svg.appendChild(tempText);
    let bbox = { width: 0, height: 0, x: 0, y: 0 }; // Default to zero, added error handling
    try {
        bbox = tempText.getBBox();
    } catch (e) {
        errorHandler.warn("Error getting BBox for text", {
            component: 'labels',
            action: 'measureSVGText',
            context: { textContent, error: e.message }
        });
        // Fallback to default zero bbox if getBBox fails
    }
    svg.removeChild(tempText);

    // Approximate actualBoundingBoxAscent and Descent from bbox.
    // getBBox().y is often the top of the bounding box, which can be negative if text extends above its baseline.
    // getBBox().height is the total height of the bounding box.
    // For general text, actualBoundingBoxAscent is usually the distance from the baseline to the top of the tallest glyph.
    // actualBoundingBoxDescent is the distance from the baseline to the bottom of the lowest glyph.
    // A simple approximation:
    const actualBoundingBoxAscent = -bbox.y;
    const actualBoundingBoxDescent = bbox.height + bbox.y;

    return {
        width: bbox.width,
        height: bbox.height,
        actualBoundingBoxAscent: actualBoundingBoxAscent,
        actualBoundingBoxDescent: actualBoundingBoxDescent
    };
}

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
 * Calculates the dynamic margins needed to prevent labels and axis titles from being cut off.
 * This function should be called when settings change that affect label sizes or positions.
 */
export function calculateDynamicMargins() {
    
    const generalLabelFontSize = '14px';
    const generalLabelFontFamily = 'Inter, sans-serif'; // Font for axis numbers
    const axisTitleFontSize = '16px';
    const axisTitleFontFamily = 'Inter, sans-serif'; // Font for axis titles

    const paddingBuffer = 25; // General padding from edge of labels to grid lines
    const axisLabelSpacing = 35; // Space between numbers/grid and axis title (for non-extreme titles)

    let maxLeftLabelWidth = 0;
    let maxRightEquationLabelWidth = 0;
    let maxBottomLabelHeight = 0;
    // These store the *calculated* height/width needed for the axis titles based on their text and position.
    let calculatedTopAxisTitleHeight = 0; 
    let calculatedRightAxisTitleWidth = 0;
    let maxBottomAxisTitleHeight = 0;
    let maxLeftAxisTitleWidth = 0; // for rotated y-axis label

    // Retrieve settings using safe getters
    const yMin = getElementValue('yMin', 'float', 0);
    const yMax = getElementValue('yMax', 'float', 10);
    const yIncrement = getElementValue('yIncrement', 'float', 1);
    const yLabelEvery = getElementValue('yLabelEvery', 'int', 1);
    const yLabelOnZero = getElementValue('yLabelOnZero', 'boolean', false);
    const suppressZeroLabel = getElementValue('suppressZeroLabel', 'boolean', false);
    const xMin = getElementValue('xMin', 'float', 0);
    const xMax = getElementValue('xMax', 'float', 10);
    const xIncrement = getElementValue('xIncrement', 'float', 1);
    const xAxisLabelType = getElementValue('xAxisLabelType', 'string', 'numbers');
    const xLabelEvery = getElementValue('xLabelEvery', 'int', 1);
    const showAxisArrows = getElementValue('showAxisArrows', 'boolean', false);

    // Initialize dynamic margins with minimums (e.g., for arrows only or just some padding)
    dynamicMarginLeft = 20; 
    dynamicMarginRight = 20;
    dynamicMarginTop = 20;
    dynamicMarginBottom = 20;

    // --- Calculate space required for Top/Right axis arrows even if no title is present ---
    if (showAxisArrows && yMax > EPSILON) { // Arrow at the top of Y-axis
        dynamicMarginTop = Math.max(dynamicMarginTop, ZERO_LINE_EXTENSION + ARROW_HEAD_SIZE + 5); // 5 is a small buffer
    }
    if (showAxisArrows && xMax > EPSILON) { // Arrow at the right of X-axis
        dynamicMarginRight = Math.max(dynamicMarginRight, ZERO_LINE_EXTENSION + ARROW_HEAD_SIZE + 5); // 5 is a small buffer
    }

    // --- Y-axis Left Margin Calculation (Numbers & Rotated Label) ---
    if (yIncrement > 0 && isFinite(yIncrement)) {
        for (let val = yMin; val <= yMax; val += yIncrement) {
            const value = val;
            const isZeroLine = Math.abs(value) < yIncrement / 2;
            if ((Math.round(val / yIncrement) % yLabelEvery === 0) || (yLabelOnZero && isZeroLine)) {
                if (value === 0 && suppressZeroLabel) {
                    continue;
                }
                const labelText = value.toFixed(yIncrement.toString().includes('.') ? yIncrement.toString().split('.')[1].length : 0);
                const metrics = measureSVGText(labelText, generalLabelFontSize, generalLabelFontFamily);
                maxLeftLabelWidth = Math.max(maxLeftLabelWidth, metrics.width);
            }
        }
    }

    const yAxisLabel = parseSuperscript(getElementValue('yAxisLabel', 'string', ''));
    const yAxisLabelOnTop = getElementValue('yAxisLabelOnTop', 'boolean', false);

    if (!yAxisLabelOnTop && yAxisLabel) { // If Y-axis label is on the left (rotated)
        const metrics = measureSVGText(yAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        maxLeftAxisTitleWidth = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent; // Rotated, so its height is its width impact
        dynamicMarginLeft = Math.max(dynamicMarginLeft, maxLeftLabelWidth + axisLabelSpacing + maxLeftAxisTitleWidth);
    } else { // If Y-axis label is not on the left, still need space for tick labels
        dynamicMarginLeft = Math.max(dynamicMarginLeft, maxLeftLabelWidth + paddingBuffer);
    }
    
    // If yAxisLabel is on top, its width also impacts left margin if xMin >= 0
    // This is for the "y" label above the X-axis zero point.
    if (yAxisLabelOnTop && yAxisLabel && xMin >= -EPSILON) { // If grid starts at or right of Y-axis
        const metrics = measureSVGText(yAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        dynamicMarginLeft = Math.max(dynamicMarginLeft, metrics.width / 2 + paddingBuffer); // Half width of label + buffer
    }

    // --- Top Margin Calculation (Y-axis Label on Top) ---
    if (yAxisLabelOnTop && yAxisLabel) {
        const metrics = measureSVGText(yAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        // The top margin needs to accommodate the zero line extension, arrow, spacing, and the label's ascent.
        calculatedTopAxisTitleHeight = ZERO_LINE_EXTENSION + ARROW_HEAD_SIZE + AXIS_TITLE_SPACING + metrics.actualBoundingBoxAscent;
        dynamicMarginTop = Math.max(dynamicMarginTop, calculatedTopAxisTitleHeight);
    }

    // --- Bottom Margin Calculation (X-axis Labels & Label below) ---
    let xValuePerMinorSquare = xIncrement;
    if (xAxisLabelType === 'radians') {
        const radianStepMultiplier = getElementValue('radianStepMultiplier', 'float', 0.5);
        const xGridUnitsPerRadianStep = getElementValue('xGridUnitsPerRadianStep', 'int', 6);
        if (xGridUnitsPerRadianStep > 0) {
            xValuePerMinorSquare = radianStepMultiplier * Math.PI / xGridUnitsPerRadianStep;
        }
    }

    if (xValuePerMinorSquare > 0 && isFinite(xValuePerMinorSquare)) {
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
                if (value === 0 && suppressZeroLabel) {
                    continue;
                }
                let labelText;
                if (xAxisLabelType === 'radians') {
                    labelText = formatRadianLabel(value);
                } else if (xAxisLabelType === 'degrees') {
                    labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0) + '°';
                } else {
                    labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0);
                }
                const metrics = measureSVGText(labelText, generalLabelFontSize, generalLabelFontFamily);
                maxBottomLabelHeight = Math.max(maxBottomLabelHeight, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
            }
        }
    }

    const xAxisLabel = parseSuperscript(getElementValue('xAxisLabel', 'string', ''));
    const xAxisLabelOnRight = getElementValue('xAxisLabelOnRight', 'boolean', false);

    if (!xAxisLabelOnRight && xAxisLabel) { // If X-axis label is below
        const metrics = measureSVGText(xAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        maxBottomAxisTitleHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        dynamicMarginBottom = Math.max(dynamicMarginBottom, maxBottomLabelHeight + axisLabelSpacing + maxBottomAxisTitleHeight);
    } else { // If X-axis label is not below, still need space for tick labels
        dynamicMarginBottom = Math.max(dynamicMarginBottom, maxBottomLabelHeight + paddingBuffer);
    }

    // If xAxisLabel is on right, its height also impacts bottom margin if yMin <= 0
    // This is for the "x" label beside the Y-axis zero point.
    if (xAxisLabelOnRight && xAxisLabel && yMin <= EPSILON) { // If grid extends down to X-axis
        const metrics = measureSVGText(xAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        dynamicMarginBottom = Math.max(dynamicMarginBottom, (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 2 + paddingBuffer);
    }

    // --- Right Margin Calculation (Equation Labels & X-axis Label on Right) ---
    const equationLabelFontSize = '12px';
    const equationLabelFontFamily = 'Inter, sans-serif';

    equationsToDraw.forEach(eq => {
        let labelText = '';
        const labelType = eq.labelType || 'equation'; // Default to 'equation' if not set
        const customLabel = eq.customLabel || ''; // Default to empty string if not set
        const rawExpression = eq.rawExpression || ''; // Default to empty string if not set
        
        if (labelType === 'custom' && customLabel.trim() !== '') {
            labelText = formatEquationTextForDisplay(customLabel);
        } else if (labelType === 'equation' && rawExpression.trim() !== '') {
            labelText = formatEquationTextForDisplay(`y ${eq.inequalityType || '='} ${rawExpression}`);
        }
        if (labelText) {
            const metrics = measureSVGText(labelText, equationLabelFontSize, equationLabelFontFamily);
            maxRightEquationLabelWidth = Math.max(maxRightEquationLabelWidth, metrics.width);
        }
    });
    dynamicMarginRight = Math.max(dynamicMarginRight, maxRightEquationLabelWidth + 10); // Default buffer for equation labels

    if (xAxisLabelOnRight && xAxisLabel) {
        const metrics = measureSVGText(xAxisLabel, axisTitleFontSize, axisTitleFontFamily);
        // The right margin needs to accommodate the zero line extension, arrow, spacing, and the label's width.
        calculatedRightAxisTitleWidth = ZERO_LINE_EXTENSION + ARROW_HEAD_SIZE + AXIS_TITLE_SPACING + metrics.width;
        dynamicMarginRight = Math.max(dynamicMarginRight, calculatedRightAxisTitleWidth);
    }
}

/**
 * Toggles the visibility of X-axis settings based on the selected label type (numbers, radians, degrees).
 */
export function toggleXAxisSettings() {
    const xAxisLabelType = getElementValue('xAxisLabelType', 'string', 'numbers');
    const numericalSettings = document.getElementById('numericalXAxisSettings');
    const radianSettings = document.getElementById('radianXAxisSettings');

    if (!numericalSettings || !radianSettings) return;

    numericalSettings.classList.add('hidden');
    radianSettings.classList.add('hidden');

    if (xAxisLabelType === 'radians') {
        radianSettings.classList.remove('hidden');
    } else {
        numericalSettings.classList.remove('hidden');
    }
}

/**
 * Helper for label overlap detection.
 * @param {Object} rect1 - First rectangle {left, right, top, bottom}.
 * @param {Object} rect2 - Second rectangle {left, right, top, bottom}.
 * @returns {boolean} True if the rectangles overlap, false otherwise.
 */
export function doesOverlap(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    
    const buffer = 2; // Small buffer for spacing between labels
    return rect1.left < rect2.right + buffer &&
           rect1.right > rect2.left - buffer &&
           rect1.top < rect2.bottom + buffer &&
           rect2.bottom > rect2.top - buffer;
}