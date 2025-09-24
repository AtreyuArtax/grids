// This module handles drawing the grid, axes, and plotting equations using SVG elements.
import { EPSILON, parseSuperscript, formatRadianLabel, formatEquationTextForDisplay, ZERO_LINE_EXTENSION, AXIS_TITLE_SPACING, ARROW_HEAD_SIZE, LINE_STYLES, SHADE_ALPHA } from './utils.js';
import { setTransform } from './modules/gridAPI.js';
import { calculateDynamicMargins, dynamicMarginLeft, dynamicMarginRight,
         dynamicMarginTop, dynamicMarginBottom, doesOverlap } from './labels.js';
import { equationsToDraw } from './equations.js'; // Assuming equationsToDraw is a mutable array where labelPosition can be updated.
import { errorHandler } from './modules/errorHandler.js';

// Math.js is needed for compiling expressions for plotting
// Ensure math.js is loaded in index.html like:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.0/math.js"></script>
let math;
if (typeof window !== 'undefined' && window.math) {
    math = window.math;
} else {
    errorHandler.fatal("math.js library not found. Please ensure it is loaded.", {
        component: 'plotter',
        action: 'initialization'
    });
    // Fallback or error handling if math.js is not available
    math = { compile: (expr) => ({ evaluate: (scope) => NaN }) }; // Dummy math object
}


// --- Global variables for drag functionality ---
let currentDraggedLabel = null;
let startX = 0; // Initial mouse X coordinate
let startY = 0; // Initial mouse Y coordinate
let initialLabelX = 0; // Initial label X coordinate
let initialLabelY = 0; // Initial label Y coordinate

// --- Global variable for live equation preview ---
let previewEquation = null;

/**
 * Sets the equation to be displayed as a live preview.
 * This function should be called whenever the user types into the equation input field.
 * @param {Object|null} eqData - An object containing the equation data (rawExpression, color, etc.)
 * or null to clear the preview.
 * Must include 'rawExpression' and 'color'.
 * Optionally includes 'lineStyle', 'inequalityType', 'domainStart', 'domainEnd'.
 * @returns {void}
 */
export function setPreviewEquation(eqData) {
    if (eqData && eqData.rawExpression) {
        try {
            // Compile the expression for efficiency during plotting
            const compiledExpression = math.compile(eqData.rawExpression);
            previewEquation = {
                ...eqData,
                compiledExpression: compiledExpression,
                // Assign a temporary unique ID for the preview, if needed for any internal tracking
                id: 'preview-eq',
                // Default styles for preview
                color: eqData.color || '#888888', // Default to a neutral gray if no color is provided
                lineStyle: 'dashed', // Always dashed line for preview (can be made configurable later)
                isPreview: true, // Flag to easily identify preview equation in drawGrid
                labelType: 'none', // No label for preview
                showLineArrows: false // No arrows for preview
                // inequalityType is now directly taken from eqData, allowing preview shading
            };
        } catch (e) {
            // If the expression is invalid, clear the preview or show an error
            previewEquation = null;
            errorHandler.warn("Invalid expression for preview", {
                component: 'plotter',
                action: 'setPreviewEquation',
                context: { expression: eqData.rawExpression, error: e.message }
            });
        }
    } else {
        previewEquation = null;
    }
    // Redraw the grid to show/hide the preview
    drawGrid();
}


/**
 * Creates an SVG element with the specified tag name and attributes.
 * @param {string} tagName - The SVG tag name (e.g., 'line', 'rect', 'text', 'path').
 * @param {Object} attributes - An object where keys are attribute names and values are their values.
 * @returns {SVGElement} The created SVG element.
 */
function createSVGElement(tagName, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (const key in attributes) {
        if (attributes.hasOwnProperty(key)) {
            element.setAttribute(key, attributes[key]);
        }
    }
    return element;
}

/**
 * Draws an arrowhead as an SVG path element at a given tip (x, y) and angle.
 * @param {number} tipX - X coordinate of the arrow's tip.
 * @param {number} tipY - Y coordinate of the arrow's tip.
 * @param {number} angle - The angle (in radians) the arrow should be pointing. 0 for right, Math.PI/2 for down, etc.
 * @param {string} color - Color of the arrowhead.
 * @param {number} [size=ARROW_HEAD_SIZE] - Size of the arrowhead (length of the arrow sides).
 * @returns {SVGPathElement} The SVG path element representing the arrowhead.
 */
function createArrowheadPath(tipX, tipY, angle, color, size = ARROW_HEAD_SIZE) {
    const halfArrowAngle = Math.PI / 8; // Half the angle of the arrowhead (e.g., 22.5 degrees for a 45 degree total opening)

    // Calculate the two points at the base of the arrowhead
    const point1X = tipX - size * Math.cos(angle - halfArrowAngle);
    const point1Y = tipY - size * Math.sin(angle - halfArrowAngle);

    const point2X = tipX - size * Math.cos(angle + halfArrowAngle);
    const point2Y = tipY - size * Math.sin(angle + halfArrowAngle);

    const pathData = `M ${tipX},${tipY} L ${point1X},${point1Y} L ${point2X},${point2Y} Z`;
    return createSVGElement('path', {
        d: pathData,
        fill: color,
        stroke: color,
        'stroke-width': 1
    });
}

/**
 * Draws a grid of dots on the SVG.
 * @param {SVGElement} group - The SVG group element to append the dots to.
 * @param {Object} options - Options for drawing the dots.
 * @param {number} options.offsetX - X-offset for the grid.
 * @param {number} options.offsetY - Y-offset for the grid.
 * @param {number} options.numMinorGridRows - Number of rows of minor grid squares.
 * @param {number} options.numMinorGridCols - Number of columns of minor grid squares.
 * @param {number} options.minorSquareSize - Size (width/height) of each minor grid square in pixels.
 * @param {string} options.dotColor - Color of the dots.
 * @param {number} options.dotRadius - Radius of each dot.
 */
function drawDotGrid(group, options) {
    const {
        offsetX, offsetY,
        numMinorGridRows, numMinorGridCols,
        minorSquareSize,
        dotColor,
        dotRadius
    } = options;

    // Draw horizontal and vertical grid of dots
    for (let r = 0; r <= numMinorGridRows; r++) {
        const y = offsetY + r * minorSquareSize;
        for (let c = 0; c <= numMinorGridCols; c++) {
            const x = offsetX + c * minorSquareSize;
            group.appendChild(createSVGElement('circle', {
                cx: x,
                cy: y,
                r: dotRadius,
                fill: dotColor,
                stroke: 'none' // Dots typically don't have a stroke
            }));
        }
    }
}


/**
 * Downloads the SVG content as an SVG image file.
 */
export function downloadSVG() {
    const svgElement = document.getElementById('gridSVG');
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Add XML declaration and DOCTYPE for standalone SVG file
    const xmlHeader = '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n';
    svgString = xmlHeader + svgString;

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getMinutes())}`;
    const filename = `grid_${timestamp}.svg`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
// plotter.js

// -- Helper: Download data URI as file
function downloadDataUri(filename, uri) {
    const link = document.createElement('a');
    link.href = uri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// -- Export SVG as PNG
export function exportSVGtoPNG() {
    const svgElement = document.getElementById('gridSVG');
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    // Get SVG viewBox for crisp output
    let width, height;
    if (svgElement.viewBox && svgElement.viewBox.baseVal) {
        width = svgElement.viewBox.baseVal.width;
        height = svgElement.viewBox.baseVal.height;
    } else {
        // fallback, try width/height attribute
        width = parseInt(svgElement.getAttribute('width'), 10) || 800;
        height = parseInt(svgElement.getAttribute('height'), 10) || 600;
    }

    // Optional: allow user to scale up (for printing), e.g. 2x resolution
    const scale = 3; // or 1 for "actual size"
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0); // scale everything

    // Draw background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Draw the SVG
    const img = new window.Image();
    const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);
    img.onload = function() {
        ctx.drawImage(img, 0, 0, width, height);
        const pngUri = canvas.toDataURL('image/png');
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        downloadDataUri(`grid_${timestamp}.png`, pngUri);
        URL.revokeObjectURL(url);
    };
    img.src = url;
}


// -- Export SVG as PDF (requires jsPDF library)
/**
 * Displays a custom message box instead of using alert().
 * This function creates a temporary DOM element to show messages.
 * @param {string} message The message to display.
 * @param {string} type The type of message ('error', 'info', etc.) to influence styling.
 */
function showMessageBox(message, type = 'error') {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box'; // Assign a class for potential styling

    // Basic inline styling for the message box
    let bgColor, textColor, borderColor, buttonBg;
    switch (type) {
        case 'error':
            bgColor = '#f8d7da'; // Light red
            textColor = '#721c24'; // Dark red
            borderColor = '#f5c6cb'; // Red border
            buttonBg = '#dc3545'; // Error button color
            break;
        case 'info':
        default:
            bgColor = '#d1ecf1'; // Light blue
            textColor = '#0c5460'; // Dark blue
            borderColor = '#bee5eb'; // Blue border
            buttonBg = '#17a2b8'; // Info button color
            break;
    }

    messageBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: ${bgColor};
        color: ${textColor};
        border: 1px solid ${borderColor};
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        font-family: 'Inter', sans-serif; /* Ensure consistent font if loaded */
        text-align: center;
        max-width: 350px;
        min-width: 250px;
        line-height: 1.5;
    `;

    messageBox.innerHTML = `
        <p>${message}</p>
        <button onclick="this.parentNode.remove()" style="
            background-color: ${buttonBg};
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
            font-size: 1rem;
            transition: background-color 0.2s ease;
        ">OK</button>
    `;
    document.body.appendChild(messageBox);
}

/**
 * Exports an SVG element to a PDF, scaling it to fill a letter-size sheet
 * with margins, adjusting orientation based on SVG aspect ratio.
 * @param {string} svgId The ID of the SVG element to export. Defaults to 'gridSVG'.
 * (Note: The original code didn't take an ID parameter,
 * but this allows for more flexibility if needed).
 */
export function exportSVGtoPDF(svgId = 'gridSVG') {
    const svgElement = document.getElementById(svgId);
    if (!svgElement) {
        errorHandler.error(`SVG element with ID '${svgId}' not found.`, {
            component: 'plotter',
            action: 'exportSVGtoPDF'
        });
        return;
    }

    // US Letter dimensions in points (1 inch = 72 points)
    const PAGE_WIDTH_PT = 612; // 8.5 * 72
    const PAGE_HEIGHT_PT = 792; // 11 * 72
    const MARGIN_PT = 25; // 0.5 inch * 72 pt/inch --> at 36pt which is standard, but shrunk to 20 here to maximize size

    // Get SVG original dimensions. Prefer viewBox for intrinsic size,
    // fallback to width/height attributes, then getBoundingClientRect.
    let svgOriginalWidth, svgOriginalHeight;

    const vb = svgElement.viewBox && svgElement.viewBox.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
        svgOriginalWidth = vb.width;
        svgOriginalHeight = vb.height;
    } else if (svgElement.width?.baseVal?.value > 0 && svgElement.height?.baseVal?.value > 0) {
        // Fallback to width/height attributes if viewBox is missing or invalid
        svgOriginalWidth = svgElement.width.baseVal.value;
        svgOriginalHeight = svgElement.height.baseVal.value;
    } else {
        // Last resort: use the element's rendered size. Less ideal for intrinsic export,
        // but better than failing if no explicit size info.
        const bbox = svgElement.getBoundingClientRect();
        svgOriginalWidth = bbox.width;
        svgOriginalHeight = bbox.height;
        if (svgOriginalWidth <= 0 || svgOriginalHeight <= 0) {
            console.error("Could not determine SVG dimensions reliably.");
            showMessageBox("Error: Could not determine SVG dimensions reliably for export. Please ensure SVG has valid dimensions (viewBox, width/height attributes, or rendered size).", 'error');
            return;
        }
    }

    // Determine PDF page orientation based on SVG's aspect ratio
    const svgAspect = svgOriginalWidth / svgOriginalHeight;
    let pageW = PAGE_WIDTH_PT, pageH = PAGE_HEIGHT_PT, orientation = 'portrait';

    // If SVG is wider than tall, set PDF to landscape and swap page dimensions
    if (svgAspect > 1) {
        orientation = 'landscape';
        pageW = PAGE_HEIGHT_PT; // Width becomes height (e.g., 11 inches)
        pageH = PAGE_WIDTH_PT;  // Height becomes width (e.g., 8.5 inches)
    }

    // Calculate usable area on the PDF page after applying margins
    const usableW = pageW - 2 * MARGIN_PT;
    const usableH = pageH - 2 * MARGIN_PT;

    // Calculate the scale factor to fit the SVG entirely within the usable area.
    // This ensures the SVG is scaled down if too large, or scaled up if too small,
    // while maintaining its aspect ratio and fitting within the margins.
    const scale = Math.min(usableW / svgOriginalWidth, usableH / usableH);

    // Calculate the final dimensions of the SVG content when drawn on the PDF
    const scaledContentW = svgOriginalWidth * scale;
    const scaledContentH = svgOriginalHeight * scale;

    // Calculate offsets to center the scaled SVG content within the usable area.
    // This places the content horizontally and vertically centered within the margins.
    const xOffset = MARGIN_PT + (usableW - scaledContentW) / 2;
    const yOffset = MARGIN_PT + (usableH - scaledContentH) / 2;

    // Defensive checks for jsPDF and svg2pdf libraries
    const jspdf = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : window.jspdf;
    const svg2pdf = window.svg2pdf && window.svg2pdf.svg2pdf ? window.svg2pdf.svg2pdf : window.svg2pdf;

    if (typeof jspdf !== "function" || typeof svg2pdf !== "function") {
        errorHandler.error("jsPDF or svg2pdf.js library not found. Please ensure they are loaded via <script> tags.", {
            component: 'plotter',
            action: 'exportSVGtoPDF'
        });
        return;
    }

    // Initialize jsPDF document with determined orientation and format
    const pdf = new jspdf({
        orientation: orientation,
        unit: 'pt',
        format: [pageW, pageH]
    });

    // Use svg2pdf to draw the SVG onto the PDF.
    // Crucially, we pass 'width' and 'height' as the *target scaled dimensions*
    // and 'x'/'y' as the computed offsets. We do NOT pass a separate 'scale'
    // parameter to svg2pdf to avoid potential double scaling issues, as the
    // width/height parameters implicitly handle the scaling.
    svg2pdf(svgElement, pdf, {
        x: xOffset,
        y: yOffset,
        width: scaledContentW,
        height: scaledContentH,
        // The 'scale' property is intentionally omitted here.
        // The desired scaling is achieved by setting 'width' and 'height'
        // to the calculated 'scaledContentW' and 'scaledContentH'.
    }).then(() => {
        // Generate a timestamp for the filename
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        pdf.save(`grid_${timestamp}.pdf`);
    }).catch(err => {
        console.error("Error exporting SVG to PDF:", err);
        showMessageBox(`Error exporting SVG to PDF: ${err.message}`, 'error');
    });
}


/**
 * Sets up mouse event listeners for dragging equation labels.
 * This function should be called once when the DOM is ready.
 */
export function setupDragging() {
    const svg = document.getElementById('gridSVG');
    if (!svg) {
        console.warn("SVG element not found for setting up dragging.");
        return;
    }

    // Remove existing listeners to prevent multiple bindings on redraws
    svg.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Add new listeners
    svg.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/**
 * Handles the mousedown event to initiate dragging of equation labels.
 * @param {MouseEvent} event The mouse event.
 */
function onMouseDown(event) {
    // Only allow dragging with the left mouse button
    if (event.button !== 0) return;

    // Check if the clicked element is an equation label.
    // Use closest() to find the parent SVG <text> element with the class.
    const target = event.target.closest('.draggable-equation-label');

    if (target) {
        currentDraggedLabel = target;
        // Prevent browser's default drag behavior for images/links
        event.preventDefault();

        // Get the current position of the label in SVG coordinates
        // getAttribute('x') and getAttribute('y') are reliable for SVG text elements
        initialLabelX = parseFloat(currentDraggedLabel.getAttribute('x'));
        initialLabelY = parseFloat(currentDraggedLabel.getAttribute('y'));

        // Get the mouse position relative to the SVG container
        const svgRect = currentDraggedLabel.ownerSVGElement.getBoundingClientRect();
        startX = event.clientX - svgRect.left;
        startY = event.clientY - svgRect.top;

        // Change cursor to indicate dragging
        currentDraggedLabel.style.cursor = 'grabbing';
    }
}

/**
 * Handles the mousemove event during dragging.
 * @param {MouseEvent} event The mouse event.
 */
function onMouseMove(event) {
    if (currentDraggedLabel) {
        // Prevent default text selection during drag
        event.preventDefault();

        const svgRect = currentDraggedLabel.ownerSVGElement.getBoundingClientRect();
        const currentMouseX = event.clientX - svgRect.left;
        const currentMouseY = event.clientY - svgRect.top;

        // Calculate new position based on initial label position and mouse movement
        const newX = initialLabelX + (currentMouseX - startX);
        const newY = initialLabelY + (currentMouseY - startY);

        currentDraggedLabel.setAttribute('x', newX);
        currentDraggedLabel.setAttribute('y', newY);
    }
}

/**
 * Handles the mouseup event to end dragging and save the new position.
 * @param {MouseEvent} event The mouse event.
 */
function onMouseUp(event) {
    if (currentDraggedLabel) {
        currentDraggedLabel.style.cursor = 'grab'; // Reset cursor

        const eqid = currentDraggedLabel.dataset.eqid;
        
        // Check if the dragged label element is still in the DOM
        // If not, the grid was redrawn during drag operation
        if (!document.contains(currentDraggedLabel)) {
            console.log('Drag operation interrupted by grid redraw, ignoring position update');
            currentDraggedLabel = null;
            return;
        }
        
        const finalX = parseFloat(currentDraggedLabel.getAttribute('x'));
        const finalY = parseFloat(currentDraggedLabel.getAttribute('y'));
        
        // Get the reference point for this label (stored during label creation)
        const refPointX = parseFloat(currentDraggedLabel.dataset.refx || '0');
        const refPointY = parseFloat(currentDraggedLabel.dataset.refy || '0');

        // Find the corresponding equation in the equationsToDraw array
        // IMPORTANT: This assumes each equation in equationsToDraw has a unique 'id' property.
        // Convert eqid to number for proper comparison since dataset values are always strings
        const numericEqId = parseInt(eqid, 10);
        console.log(`Looking for equation with ID ${numericEqId} in equations:`, equationsToDraw.map(eq => ({ id: eq.id, rawExpression: eq.rawExpression })));
        const eqIndex = equationsToDraw.findIndex(eq => eq.id === numericEqId);

        if (eqIndex !== -1) {
            // Calculate and store the offset from the reference point (similar to points system)
            const offsetX = finalX - refPointX;
            const offsetY = finalY - refPointY;
            console.log(`Storing offset (${offsetX}, ${offsetY}) for equation ${numericEqId}`);
            equationsToDraw[eqIndex].labelOffset = { x: offsetX, y: offsetY };
            
            // Clear the old absolute positioning system
            delete equationsToDraw[eqIndex].labelPosition;
            
            // Optional: If you want to persist across page loads, save equationsToDraw to localStorage here.
            // e.g., localStorage.setItem('equations', JSON.stringify(equationsToDraw));
        } else {
            console.warn(`Equation with ID ${eqid} not found to update label position.`);
        }

        currentDraggedLabel = null; // Reset dragged label
    }
}

/**
 * Checks if a drag operation is currently in progress
 * @returns {boolean} True if a label is currently being dragged
 */
function isDragInProgress() {
    return currentDraggedLabel !== null;
}

/**
 * Safely calls drawGrid, deferring the call if a drag is in progress
 */
export function safeDrawGrid() {
    if (isDragInProgress()) {
        // If drag is in progress, defer the redraw
        console.log('Deferring grid redraw due to active drag operation');
        setTimeout(() => safeDrawGrid(), 50);
        return;
    }
    drawGrid();
}

/**
 * Helper function to draw grid lines and axis labels for either X or Y axis.
 * @param {Object} axisOptions - Options specific to the axis (min, max, increment, etc.).
 * @param {Object} gridOptions - General grid drawing options.
 * @param {SVGElement} gridGroup - The SVG group to append elements to.
 */
function drawAxisLabelsAndLines(axisOptions, gridOptions, gridGroup) {
    const {
        isXAxis, min, max, increment, labelEvery, labelOnZero, labelOffsetCoord,
        xAxisLabelType, // Only for X-axis
        fixedCoord // For drawing the grid lines (the 'y' for horizontal, 'x' for vertical)
    } = axisOptions;

    const {
        offsetX, offsetY, actualGridWidth, actualGridHeight, minorSquareSize,
        minorLineThickness, majorLineThickness, majorGridColor, minorGridColor,
        labelFontSize, showMainAxes, suppressZeroLabel, paperStyle,
        zeroXGridPos, zeroYGridPos // For origin suppression logic
    } = gridOptions;

    const numSteps = (max - min) / increment;
    const valuePerMinorSquare = isXAxis ? gridOptions.xValuePerMinorSquare : increment;

    // --- Draw minor grid lines for X-axis in radians mode ---
    if (isXAxis && xAxisLabelType === 'radians' && paperStyle === 'grid') {
        const minorStep = gridOptions.xValuePerMinorSquare;
        const numMinorSteps = Math.round((max - min) / minorStep);
        for (let i = 0; i <= numMinorSteps; i++) {
            const value = min + i * minorStep;
            const coord = offsetX + (value - min) / minorStep * minorSquareSize;
            // Don't draw over the major lines (they'll be drawn later)
            gridGroup.appendChild(createSVGElement('line', {
                x1: coord, y1: offsetY,
                x2: coord, y2: offsetY + actualGridHeight,
                stroke: minorGridColor,
                'stroke-width': minorLineThickness
            }));
        }
    }
    for (let i = 0; i <= numSteps; i++) {
        const value = min + i * increment;
        let coord; // The canvas coordinate for the current line/label
        if (isXAxis) {
            coord = offsetX + (value - min) / valuePerMinorSquare * minorSquareSize;
        } else {
            coord = offsetY + actualGridHeight - (value - min) / valuePerMinorSquare * minorSquareSize;
        }

        const isMathematicalZeroLine = Math.abs(value) < EPSILON;
        const drawAsMajorAxis = showMainAxes && isMathematicalZeroLine;
        const strokeWidth = drawAsMajorAxis ? majorLineThickness : minorLineThickness;
        const stroke = drawAsMajorAxis ? majorGridColor : minorGridColor;

        // Draw grid lines
        if (paperStyle === 'grid') {
            const lineAttrs = isXAxis
                ? { x1: coord, y1: offsetY, x2: coord, y2: offsetY + actualGridHeight }
                : { x1: offsetX, y1: coord, x2: offsetX + actualGridWidth, y2: coord };
            gridGroup.appendChild(createSVGElement('line', { ...lineAttrs, stroke: stroke, 'stroke-width': strokeWidth }));
        }

        // Labeling Logic
        let shouldLabel = false;
        if (labelEvery > 0) {
            if (isXAxis && xAxisLabelType === 'radians') {
                const xGridUnitsPerRadianStep = parseInt(document.getElementById('xGridUnitsPerRadianStep').value, 10) || 6;
                const radianStepMultiplier = parseFloat(document.getElementById('radianStepMultiplier').value) || 0.5;
                const theoreticalMajorStepVal = Math.round((value - min) / (radianStepMultiplier * Math.PI));
                if (xGridUnitsPerRadianStep > 0 && Math.round((value - min) / valuePerMinorSquare) % xGridUnitsPerRadianStep === 0 && theoreticalMajorStepVal % labelEvery === 0) {
                    shouldLabel = true;
                }
            } else {
                if (Math.round((value - min) / valuePerMinorSquare) % labelEvery === 0) {
                    shouldLabel = true;
                }
            }
        }

        if (isMathematicalZeroLine && showMainAxes && labelOnZero) {
            shouldLabel = true;
        }

        if (shouldLabel) {
            if (value === 0 && suppressZeroLabel) {
                continue;
            }
            // Suppress X-axis '0' if Y-axis is showing '0' and both pass through origin
            if (isXAxis && isMathematicalZeroLine && showMainAxes && gridOptions.yLabelOnZero && zeroYGridPos !== -1 && zeroXGridPos !== -1) {
                continue;
            }

            let labelText;
            if (isXAxis) {
                if (xAxisLabelType === 'radians') {
                    labelText = formatRadianLabel(value);
                } else if (xAxisLabelType === 'degrees') {
                    labelText = value.toFixed(increment.toString().includes('.') ? increment.toString().split('.')[1].length : 0) + '°';
                } else {
                    labelText = value.toFixed(increment.toString().includes('.') ? increment.toString().split('.')[1].length : 0);
                }
            } else { // Y-axis
                labelText = value.toFixed(increment.toString().includes('.') ? increment.toString().split('.')[1].length : 0);
            }

            const textAttrs = {};
            if (isXAxis) {
                textAttrs.x = coord;
                textAttrs.y = (showMainAxes && labelOnZero && zeroYGridPos !== -1) ? zeroYGridPos + Math.round(labelFontSize * 0.6) : offsetY + actualGridHeight + Math.round(labelFontSize * 0.6);
                textAttrs['text-anchor'] = 'middle';
                textAttrs['dominant-baseline'] = 'middle';    // <-- KEY: perfect vertical center in all browsers
                textAttrs['dy'] = '0.35em';                   // <-- Tweak: nudges the baseline just right
            } else { // Y-axis
                textAttrs.x = (showMainAxes && labelOnZero && zeroXGridPos !== -1) ? zeroXGridPos - 5 : offsetX - 10;
                textAttrs.y = coord;
                textAttrs['text-anchor'] = 'end';
                textAttrs['dominant-baseline'] = 'middle';    // <-- Vertical center for y labels
                textAttrs['dy'] = '';
            }

            const textEl = createSVGElement('text', {
                ...textAttrs,
                'font-family': 'Inter, sans-serif',
                'font-size': `${labelFontSize}px`,
                fill: '#333'
            });
            textEl.textContent = labelText;
            gridGroup.appendChild(textEl);
        }
    }
}

/**
 * Draws the shading for inequalities.
 * @param {SVGElement} equationGroup - The SVG group for the current equation.
 * @param {Object} eq - The equation object.
 * @param {Array<Array<Object>>} segments - Array of line segments for the equation.
 * @param {Object} gridOptions - General grid drawing options.
 */
function drawEquationShading(equationGroup, eq, segments, gridOptions) {
    // Skip shading if inequality type is not defined or is '='
    if (!eq.inequalityType || eq.inequalityType === '=') {
        return;
    }

    const { offsetX, offsetY, actualGridWidth, actualGridHeight, yMin, yIncrement, minorSquareSize, xValuePerMinorSquare, xMin, currentXAxisLabelType } = gridOptions;
    const fillOpacity = SHADE_ALPHA;
    const fillColor = eq.color;

    const allClippedPoints = [];
    segments.forEach(seg => {
        seg.forEach(pt => {
            const clippedY = Math.max(offsetY, Math.min(offsetY + actualGridHeight, pt.y));
            allClippedPoints.push({ x: pt.x, y: clippedY });
        });
    });
    allClippedPoints.sort((a, b) => a.x - b.x);

    let polygonPoints = [];
    if (allClippedPoints.length > 0) {
        if (eq.inequalityType === '<' || eq.inequalityType === '<=' ) {
            polygonPoints.push(`${offsetX},${offsetY + actualGridHeight}`); // Bottom-left of grid
            polygonPoints.push(...allClippedPoints.map(p => `${p.x},${p.y}`));
            polygonPoints.push(`${offsetX + actualGridWidth},${offsetY + actualGridHeight}`); // Bottom-right of grid
        } else if (eq.inequalityType === '>' || eq.inequalityType === '>=') {
            polygonPoints.push(`${offsetX},${offsetY}`); // Top-left of grid
            polygonPoints.push(...allClippedPoints.map(p => `${p.x},${p.y}`));
            polygonPoints.push(`${offsetX + actualGridWidth},${offsetY}`); // Top-right of grid
        }
    } else {
        // Attempt to shade entire grid if no valid points for the curve
        let shouldShadeEntireGrid = false;
        try {
            let testXForShading = xMin - xValuePerMinorSquare;
            if (eq.domainStart !== null) {
                testXForShading = Math.max(testXForShading, eq.domainStart - xValuePerMinorSquare);
            }
            if (currentXAxisLabelType === 'degrees') {
                testXForShading = math.unit(testXForShading, 'deg').toNumber('rad');
            }

            const testYForShading = eq.compiledExpression.evaluate({ x: testXForShading });

            const midGridGraphY = yMin + (actualGridHeight / 2) * (yIncrement / minorSquareSize);

            if (isFinite(testYForShading)) {
                if ((eq.inequalityType === '<' || eq.inequalityType === '<=') && testYForShading > midGridGraphY) {
                    shouldShadeEntireGrid = true;
                } else if ((eq.inequalityType === '>' || eq.inequalityType === '>=') && testYForShading < midGridGraphY) {
                    shouldShadeEntireGrid = true;
                }
            }
        } catch (e) {
            shouldShadeEntireGrid = false;
        }

        if (shouldShadeEntireGrid) {
             polygonPoints = [
                `${offsetX},${offsetY}`,
                `${offsetX + actualGridWidth},${offsetY}`,
                `${offsetX + actualGridWidth},${offsetY + actualGridHeight}`,
                `${offsetX},${offsetY + actualGridHeight}`
             ];
        }
    }

    if (polygonPoints.length > 0) {
        const polygon = createSVGElement('polygon', {
            points: polygonPoints.join(' '),
            fill: fillColor,
            'fill-opacity': fillOpacity,
            'clip-path': 'url(#gridClip)' // Apply clipping
        });
        equationGroup.appendChild(polygon);
    }
}

/**
 * Draws arrows or dots at the ends of equation lines based on domain and showLineArrows setting.
 * @param {SVGElement} equationGroup - The SVG group for the current equation.
 * @param {Object} eq - The equation object.
 * @param {Array<Array<Object>>} segments - Array of line segments for the equation.
 * @param {Object} gridOptions - General grid drawing options.
 */
function drawEquationEndpoints(equationGroup, eq, segments, gridOptions) {
    // Skip endpoints for preview equations
    if (eq.isPreview || !eq.showLineArrows || segments.length === 0) {
        return;
    }

    const { offsetX, offsetY, actualGridWidth, actualGridHeight } = gridOptions;

    // Grid bounds and helpers
    const GRID_RECT = {
        left: offsetX,
        right: offsetX + actualGridWidth,
        top: offsetY,
        bottom: offsetY + actualGridHeight
    };
    const EPSILON_FOR_BOUNDARY = 1e-6;

    function isStrictlyInside(p) {
        return (
            p.x > GRID_RECT.left + EPSILON_FOR_BOUNDARY &&
            p.x < GRID_RECT.right - EPSILON_FOR_BOUNDARY &&
            p.y > GRID_RECT.top + EPSILON_FOR_BOUNDARY &&
            p.y < GRID_RECT.bottom - EPSILON_FOR_BOUNDARY
        );
    }

    function getLineRectIntersection(pInside, pOutside) {
        const dx = pOutside.x - pInside.x;
        const dy = pOutside.y - pInside.y;
        let tBest = 1;

        function tryEdge(t) {
            if (t >= -EPSILON_FOR_BOUNDARY && t <= 1 + EPSILON_FOR_BOUNDARY) tBest = Math.min(tBest, t);
        }

        if (Math.abs(dx) > EPSILON_FOR_BOUNDARY) {
            tryEdge((GRID_RECT.left - pInside.x) / dx);
            tryEdge((GRID_RECT.right - pInside.x) / dx);
        }
        if (Math.abs(dy) > EPSILON_FOR_BOUNDARY) {
            tryEdge((GRID_RECT.top - pInside.y) / dy);
            tryEdge((GRID_RECT.bottom - pInside.y) / dy);
        }
        return { x: pInside.x + tBest * dx, y: pInside.y + tBest * dy };
    }

    function createEndpointDot(x, y, color, r = 2) { //this changes the size of the equation end point dot.
        return createSVGElement('circle', {
            cx: x,
            cy: y,
            r: r,
            fill: color
        });
    }

    // Find first crossing pair (entry to grid)
    function findFirstCrossingPair(segment) {
        for (let i = 0; i < segment.length - 1; i++) {
            const p1 = segment[i];
            const p2 = segment[i + 1];
            if (!isStrictlyInside(p1) && isStrictlyInside(p2)) {
                return { pOut: p1, pIn: p2 };
            }
        }
        return null;
    }

    // Find last crossing pair (exit from grid)
    function findLastCrossingPair(segment) {
        for (let i = segment.length - 2; i >= 0; i--) {
            const p1 = segment[i];
            const p2 = segment[i + 1];
            if (isStrictlyInside(p1) && !isStrictlyInside(p2)) {
                return { pIn: p1, pOut: p2 };
            }
        }
        return null;
    }

    // ARROW/DOT logic for the first segment
    const firstSegmentPoints = segments[0];
    if (firstSegmentPoints.length >= 2) {
        if (eq.domainStart !== null) {
            const firstDomainPoint = firstSegmentPoints.find(p => Math.abs(p.graphX - eq.domainStart) < EPSILON_FOR_BOUNDARY);
            if (firstDomainPoint && isStrictlyInside(firstDomainPoint)) {
                equationGroup.appendChild(createEndpointDot(firstDomainPoint.x, firstDomainPoint.y, eq.color));
            } else {
                const crossingPair = findFirstCrossingPair(firstSegmentPoints);
                if (crossingPair) {
                    const { pOut, pIn } = crossingPair;
                    const intersection = getLineRectIntersection(pIn, pOut);
                    equationGroup.appendChild(createEndpointDot(intersection.x, intersection.y, eq.color));
                }
            }
        } else {
            const crossingPair = findFirstCrossingPair(firstSegmentPoints);
            if (crossingPair) {
                const { pOut, pIn } = crossingPair;
                const edge = getLineRectIntersection(pIn, pOut);
                const angle = Math.atan2(pIn.y - edge.y, pIn.x - edge.x) + Math.PI; // Pointing outward
                equationGroup.appendChild(createArrowheadPath(edge.x, edge.y, angle, eq.color));
            }
        }
    }

    // ARROW/DOT logic for the last segment
    const lastSegmentPoints = segments[segments.length - 1];
    if (lastSegmentPoints.length >= 2) {
        if (eq.domainEnd !== null) {
            const lastDomainPoint = lastSegmentPoints.find(p => Math.abs(p.graphX - eq.domainEnd) < EPSILON_FOR_BOUNDARY);
            if (lastDomainPoint && isStrictlyInside(lastDomainPoint)) {
                equationGroup.appendChild(createEndpointDot(lastDomainPoint.x, lastDomainPoint.y, eq.color));
            } else {
                const crossingPair = findLastCrossingPair(lastSegmentPoints);
                if (crossingPair) {
                    const { pIn, pOut } = crossingPair;
                    const intersection = getLineRectIntersection(pIn, pOut);
                    equationGroup.appendChild(createEndpointDot(intersection.x, intersection.y, eq.color));
                }
            }
        } else {
            const crossingPair = findLastCrossingPair(lastSegmentPoints);
            if (crossingPair) {
                const { pIn, pOut } = crossingPair;
                const edge = getLineRectIntersection(pIn, pOut);
                const angle = Math.atan2(edge.y - pIn.y, edge.x - pIn.x); // Pointing outward
                equationGroup.appendChild(createArrowheadPath(edge.x, edge.y, angle, eq.color));
            }
        }
    }
}

/**
 * Places the equation label, handling custom positions, auto-positioning, and overlap.
 * @param {SVGElement} equationGroup - The SVG group for the current equation.
 * @param {Object} eq - The equation object.
 * @param {string} labelText - The formatted text for the label.
 * @param {Object} gridOptions - General grid drawing options.
 * @param {Array<Object>} placedLabelRects - Array of bounding boxes of already placed labels.
 * @param {Array<Array<Object>>} segments - Array of line segments for the equation, used for auto-positioning.
 */
function placeEquationLabel(equationGroup, eq, labelText, gridOptions, placedLabelRects, segments) {
    // Skip labels for preview equations or equations without labels
    if (eq.isPreview || !labelText) {
        return;
    }
    
    // Skip equations without valid IDs (this shouldn't happen for regular equations)
    if (!eq.id && eq.id !== 0) {
        console.warn("Equation missing ID, skipping label positioning:", eq);
        return;
    }

    const { offsetX, offsetY, actualGridWidth, actualGridHeight, equationLabelFontSize,
            xMin, yMin, yIncrement, minorSquareSize, xValuePerMinorSquare, currentXAxisLabelType } = gridOptions;

    const labelTextEl = createSVGElement('text', {
        'font-family': 'Inter, sans-serif',
        'font-size': `${equationLabelFontSize}px`,
        fill: eq.color,
        'cursor': 'grab',
        'pointer-events': 'all'
    });
    labelTextEl.textContent = labelText;
    labelTextEl.classList.add('draggable-equation-label');
    labelTextEl.dataset.eqid = eq.id;

    let proposedLabelX, proposedLabelY;
    let chosenAnchor = 'start';
    let chosenBaseline = 'middle';
    
    // Calculate a stable reference point for this equation based on mathematical properties
    // Use a consistent x-value (like the center of the visible area) to get a stable reference
    const referenceXGraph = (gridOptions.xMin + gridOptions.xMax) / 2; // Center of the graph
    let referenceXForEvaluation = referenceXGraph;
    if (currentXAxisLabelType === 'degrees') {
        referenceXForEvaluation = math.unit(referenceXForEvaluation, 'deg').toNumber('rad');
    }
    
    let labelRefPoint = null;
    try {
        const referenceYGraph = eq.compiledExpression.evaluate({ x: referenceXForEvaluation });
        if (isFinite(referenceYGraph)) {
            // Convert to canvas coordinates
            const referenceXCanvas = offsetX + ((referenceXGraph - gridOptions.xMin) / gridOptions.xIncrement) * minorSquareSize;
            const referenceYCanvas = offsetY + actualGridHeight - ((referenceYGraph - yMin) / yIncrement) * minorSquareSize;
            labelRefPoint = { x: referenceXCanvas, y: referenceYCanvas };
        }
    } catch (e) {
        // If evaluation fails at center, try the right edge as fallback
        const testX = gridOptions.xMax;
        let xForEvaluation = testX;
        if (currentXAxisLabelType === 'degrees') {
            xForEvaluation = math.unit(xForEvaluation, 'deg').toNumber('rad');
        }
        try {
            const testGraphY = eq.compiledExpression.evaluate({ x: xForEvaluation });
            if (isFinite(testGraphY)) {
                const testCanvasX = offsetX + actualGridWidth;
                const testCanvasY = offsetY + actualGridHeight - ((testGraphY - yMin) / yIncrement) * minorSquareSize;
                labelRefPoint = { x: testCanvasX, y: testCanvasY };
            }
        } catch (e2) {
            // If all else fails, use a default position
            labelRefPoint = { x: offsetX + actualGridWidth * 0.8, y: offsetY + actualGridHeight * 0.2 };
        }
    }

    if (!labelRefPoint) {
        return; // No suitable reference point found
    }

    // Check if equation has a custom label offset (like points system)
    if (eq.labelOffset && typeof eq.labelOffset.x === "number" && typeof eq.labelOffset.y === "number") {
        // Use custom offset from the reference point
        console.log(`Using stored offset for equation ${eq.id}: (${eq.labelOffset.x}, ${eq.labelOffset.y})`);
        proposedLabelX = labelRefPoint.x + eq.labelOffset.x;
        proposedLabelY = labelRefPoint.y + eq.labelOffset.y;
        chosenAnchor = 'middle';
        chosenBaseline = 'middle';
    } else {
        // Auto-calculated positioning from reference point
        // For auto-positioning, try to find a visible point on the curve for better placement
        let visualRefPoint = null;
        for (let i = segments.length - 1; i >= 0; i--) {
            const segment = segments[i];
            for (let j = segment.length - 1; j >= 0; j--) {
                const p = segment[j];
                if (p.x >= offsetX && p.x <= (offsetX + actualGridWidth) &&
                    p.y >= offsetY && p.y <= (offsetY + actualGridHeight)) {
                    visualRefPoint = p;
                    break;
                }
            }
            if (visualRefPoint) break;
        }
        
        // Use visual reference for auto-positioning if available, otherwise use mathematical reference
        const autoPositionRef = visualRefPoint || labelRefPoint;
        
        const potentialPositions = [
            { dx: 5, dy: 0, anchor: 'start', baseline: 'middle' },
            { dx: -5, dy: 0, anchor: 'end', baseline: 'middle' },
            { dx: 0, dy: -15, anchor: 'middle', baseline: 'alphabetic' },
            { dx: 0, dy: 15, anchor: 'middle', baseline: 'hanging' },
            { dx: 5, dy: -15, anchor: 'start', baseline: 'alphabetic' },
            { dx: 5, dy: 15, anchor: 'start', baseline: 'hanging' }
        ];

        let autoPositionFound = false;
        for (const pos of potentialPositions) {
            proposedLabelX = autoPositionRef.x + pos.dx;
            proposedLabelY = autoPositionRef.y + pos.dy;
            chosenAnchor = pos.anchor;
            chosenBaseline = pos.baseline;

            labelTextEl.setAttribute('x', proposedLabelX);
            labelTextEl.setAttribute('y', proposedLabelY);
            labelTextEl.setAttribute('text-anchor', chosenAnchor);
            labelTextEl.setAttribute('alignment-baseline', chosenBaseline);
            equationGroup.appendChild(labelTextEl);

            const bbox = labelTextEl.getBBox();
            const currentLabelRect = { left: bbox.x, right: bbox.x + bbox.width, top: bbox.y, bottom: bbox.y + bbox.height };

            const safeAreaBuffer = 50;
            const safeAreaLeft = offsetX - safeAreaBuffer;
            const safeAreaRight = offsetX + actualGridWidth + safeAreaBuffer;
            const safeAreaTop = offsetY - safeAreaBuffer;
            const safeAreaBottom = offsetY + actualGridHeight + safeAreaBuffer;

            if (currentLabelRect.right < safeAreaLeft || currentLabelRect.left > safeAreaRight ||
                currentLabelRect.bottom < safeAreaTop || currentLabelRect.top > safeAreaBottom) {
                equationGroup.removeChild(labelTextEl);
                continue;
            }

            let overlapsExisting = false;
            for (const existingRect of placedLabelRects) {
                if (doesOverlap(currentLabelRect, existingRect)) {
                    overlapsExisting = true;
                    break;
                }
            }

            if (!overlapsExisting) {
                placedLabelRects.push(currentLabelRect);
                autoPositionFound = true;
                break;
            }
            equationGroup.removeChild(labelTextEl);
        }

        if (!autoPositionFound) {
            proposedLabelX = autoPositionRef.x + 5;
            proposedLabelY = autoPositionRef.y;
            chosenAnchor = 'start';
            chosenBaseline = 'middle';
        }
    }

    // Set final position and store reference point for drag operations
    labelTextEl.setAttribute('x', proposedLabelX);
    labelTextEl.setAttribute('y', proposedLabelY);
    labelTextEl.setAttribute('text-anchor', chosenAnchor);
    labelTextEl.setAttribute('alignment-baseline', chosenBaseline);
    
    // Store the stable mathematical reference point for drag calculations
    labelTextEl.dataset.refx = labelRefPoint.x;
    labelTextEl.dataset.refy = labelRefPoint.y;

    if (!labelTextEl.parentNode) {
        equationGroup.appendChild(labelTextEl);
        // Only track auto-positioned labels to avoid overlaps
        if (!eq.labelOffset) {
            placedLabelRects.push(labelTextEl.getBBox());
        }
    }
}


/**
 * Draws the Cartesian grid, axes, and all registered equations on the SVG element.
 */
export function drawGrid() {
    const svg = document.getElementById('gridSVG');
    const gridErrorMessage = document.getElementById('gridErrorMessage');
    gridErrorMessage.textContent = ''; // Clear previous messages

    // Clear previous SVG content
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }

    // Recalculate all dynamic margins before drawing
    calculateDynamicMargins();

    const minorSquareSizeValue = parseFloat(document.getElementById('squareSizeInput').value) || 40;

    // Collect all grid and axis settings into a single options object
    const gridOptions = {
        marginLeft: dynamicMarginLeft,
        marginRight: dynamicMarginRight,
        marginTop: dynamicMarginTop,
        marginBottom: dynamicMarginBottom,
        minorSquareSize: minorSquareSizeValue,
        minorLineThickness: Math.max(0.5, minorSquareSizeValue * 0.025),
        majorLineThickness: Math.max((Math.max(0.5, minorSquareSizeValue * 0.025)) * 1.8, minorSquareSizeValue * 0.06),
        labelFontSize: Math.max(9, Math.min(Math.round(minorSquareSizeValue * 0.38), 60)),
        axisTitleFontSize: Math.max(12, Math.min(Math.round(minorSquareSizeValue * 0.48), 80)),
        equationLabelFontSize: Math.max(9, Math.min(Math.round(minorSquareSizeValue * 0.32), 48)),
        yMin: parseFloat(document.getElementById('yMin').value) || 0,
        yMax: parseFloat(document.getElementById('yMax').value) || 10,
        yIncrement: parseFloat(document.getElementById('yIncrement').value) || 1,
        yLabelEvery: parseInt(document.getElementById('yLabelEvery').value, 10),
        yLabelOnZero: document.getElementById('yLabelOnZero').checked,
        yAxisLabelOnTop: document.getElementById('yAxisLabelOnTop').checked,
        arrowHeadSize: Math.max(5, Math.round(minorSquareSizeValue * 0.35)),
        zeroLineExtension: Math.max(10, Math.round(minorSquareSizeValue * 0.75)),
        axisTitleSpacing: Math.max(10, Math.round(minorSquareSizeValue * 0.65)),
        showMainAxes: document.getElementById('showAxes') ? document.getElementById('showAxes').checked : true,
        showAxisArrows: document.getElementById('showAxisArrows') ? document.getElementById('showAxisArrows').checked : true,
        xAxisLabelType: document.getElementById('xAxisLabelType').value,
        xMin: 0, xMax: 10, xIncrement: 1, xValuePerMinorSquare: 1, // Will be updated below
        xLabelEvery: parseInt(document.getElementById('xLabelEvery').value, 10),
        xLabelOnZero: document.getElementById('xLabelOnZero').checked,
        xAxisLabelOnRight: document.getElementById('xAxisLabelOnRight').checked,
        xAxisLabel: parseSuperscript(document.getElementById('xAxisLabel').value),
        yAxisLabel: parseSuperscript(document.getElementById('yAxisLabel').value),
        suppressZeroLabel: document.getElementById('suppressZeroLabel').checked,
        minorGridColor: document.getElementById('minorGridColor').value,
        majorGridColor: document.getElementById('majorGridColor').value,
        paperStyle: document.getElementById('paperStyle').value || 'grid'
    };

    if (gridOptions.xAxisLabelType === 'radians') {
        const xMinRadians = parseFloat(document.getElementById('xMinRadians').value) || 0;
        const xMaxRadians = parseFloat(document.getElementById('xMaxRadians').value) || (2 * Math.PI / Math.PI);
        const radianStepMultiplier = parseFloat(document.getElementById('radianStepMultiplier').value) || 0.5;
        const xGridUnitsPerRadianStep = parseInt(document.getElementById('xGridUnitsPerRadianStep').value, 10) || 6;

        gridOptions.xMin = xMinRadians * Math.PI;
        gridOptions.xMax = xMaxRadians * Math.PI;
        gridOptions.xIncrement = radianStepMultiplier * Math.PI;
        gridOptions.xValuePerMinorSquare = gridOptions.xIncrement / xGridUnitsPerRadianStep;

        if (radianStepMultiplier <= 0 || xGridUnitsPerRadianStep <= 0 || !isFinite(radianStepMultiplier) || !isFinite(xGridUnitsPerRadianStep)) {
            gridErrorMessage.textContent = "Error: Radian Step Multiplier and Grid Units per Radian Step must be positive numbers.";
            return;
        }
    } else {
        gridOptions.xMin = parseFloat(document.getElementById('xMin').value) || 0;
        gridOptions.xMax = parseFloat(document.getElementById('xMax').value) || 10;
        gridOptions.xIncrement = parseFloat(document.getElementById('xIncrement').value) || 1;
        gridOptions.xValuePerMinorSquare = gridOptions.xIncrement;
    }

    // --- Input Validation ---
    if (gridOptions.yIncrement <= 0 || gridOptions.xIncrement <= 0 || gridOptions.minorSquareSize <= 0 || !isFinite(gridOptions.yIncrement) || !isFinite(gridOptions.xIncrement) || !isFinite(gridOptions.minorSquareSize)) {
        gridErrorMessage.textContent = "Error: Increment and Square Size values must be positive numbers.";
        return;
    }

    const yRange = gridOptions.yMax - gridOptions.yMin;
    const xRange = gridOptions.xMax - gridOptions.xMin;

    if (yRange < 0 || xRange < 0) {
        gridErrorMessage.textContent = "Error: Max axis value must be greater than Min axis value.";
        return;
    }

    gridOptions.numMinorGridRows = yRange / gridOptions.yIncrement;
    gridOptions.numMinorGridCols = xRange / gridOptions.xValuePerMinorSquare;

    if (!isFinite(gridOptions.numMinorGridRows) || !isFinite(gridOptions.numMinorGridCols)) {
        gridErrorMessage.textContent = "Error: Invalid axis ranges or increments resulting in non-finite grid dimensions.";
        return;
    }

    gridOptions.actualGridHeight = gridOptions.numMinorGridRows * gridOptions.minorSquareSize;
    gridOptions.actualGridWidth = gridOptions.numMinorGridCols * gridOptions.minorSquareSize;

    const requiredSVGWidth = gridOptions.actualGridWidth + gridOptions.marginLeft + gridOptions.marginRight;
    const requiredSVGHeight = gridOptions.actualGridHeight + gridOptions.marginTop + gridOptions.marginBottom;

    if (!isFinite(requiredSVGWidth) || !isFinite(requiredSVGHeight) || requiredSVGWidth <= 0 || requiredSVGHeight <= 0) {
        gridErrorMessage.textContent = "Error: Calculated grid dimensions are invalid. Check input values and preset settings.";
        console.error("Invalid SVG dimensions calculated:", { requiredSVGWidth, requiredSVGHeight });
        svg.setAttribute('width', 1);
        svg.setAttribute('height', 1);
        svg.setAttribute('viewBox', '0 0 1 1');
        return;
    }

    svg.setAttribute('viewBox', `0 0 ${requiredSVGWidth} ${requiredSVGHeight}`);
    svg.style.backgroundColor = '#fff';

    const gridGroup = createSVGElement('g', { id: 'gridGroup' });
    svg.appendChild(gridGroup);

    gridOptions.offsetX = gridOptions.marginLeft;
    gridOptions.offsetY = gridOptions.marginTop;

    // Find the Y-position of the zero line relative to the grid top
    gridOptions.zeroYGridPos = (gridOptions.yMin <= 0 && gridOptions.yMax >= 0)
        ? gridOptions.offsetY + (gridOptions.yMax / gridOptions.yIncrement) * gridOptions.minorSquareSize
        : -1;

    // Find the X-position of the zero line relative to the grid left
    gridOptions.zeroXGridPos = (gridOptions.xMin <= 0 && gridOptions.xMax >= 0)
        ? gridOptions.offsetX + (-gridOptions.xMin / gridOptions.xValuePerMinorSquare) * gridOptions.minorSquareSize
        : -1;


    // --- Draw Dot Grid if selected ---
    if (gridOptions.paperStyle === 'dot') {
        drawDotGrid(gridGroup, {
            offsetX: gridOptions.offsetX,
            offsetY: gridOptions.offsetY,
            numMinorGridRows: gridOptions.numMinorGridRows,
            numMinorGridCols: gridOptions.numMinorGridCols,
            minorSquareSize: gridOptions.minorSquareSize,
            dotColor: gridOptions.minorGridColor,
            dotRadius: Math.max(1.2, gridOptions.minorSquareSize * 0.11)
        });
    } else if (gridOptions.paperStyle === 'polar') {
        // Polar grid drawing
        const centerX = gridOptions.offsetX + gridOptions.actualGridWidth / 2;
        const centerY = gridOptions.offsetY + gridOptions.actualGridHeight / 2;
        const maxRadius = Math.min(gridOptions.actualGridWidth, gridOptions.actualGridHeight) / 2;

        // Get polar input values
        let polarNumCircles = parseInt(document.getElementById('polarNumCircles').value, 10) || 8;
        let polarNumRadials = parseInt(document.getElementById('polarNumRadials').value, 10) || 12;
        let polarDegrees = parseInt(document.getElementById('polarDegrees').value, 10) || 360;

        // Draw concentric circles
        for (let i = 1; i <= polarNumCircles; i++) {
            let r = (maxRadius * i) / polarNumCircles;
            gridGroup.appendChild(createSVGElement('circle', {
                cx: centerX,
                cy: centerY,
                r: r,
                stroke: gridOptions.minorGridColor,
                'stroke-width': 1,
                fill: 'none'
            }));
        }

        // Draw radial lines
        for (let i = 0; i < polarNumRadials; i++) {
            let angle = (polarDegrees * Math.PI / 180 * i) / polarNumRadials; // Convert degrees to radians
            let x2 = centerX + maxRadius * Math.cos(angle);
            let y2 = centerY + maxRadius * Math.sin(angle);
            gridGroup.appendChild(createSVGElement('line', {
                x1: centerX,
                y1: centerY,
                x2: x2,
                y2: y2,
                stroke: gridOptions.minorGridColor,
                'stroke-width': 1
            }));
        }
        // Notify overlays to disable (no Cartesian transform)
        try { setTransform(null); } catch (e) { /* gridAPI may not be loaded yet */ }
        // Skip further grid drawing and return if using polar
        return;
    }

    // --- Draw Y-axis grid lines and labels ---
    drawAxisLabelsAndLines({
        isXAxis: false,
        min: gridOptions.yMin,
        max: gridOptions.yMax,
        increment: gridOptions.yIncrement,
        labelEvery: gridOptions.yLabelEvery,
        labelOnZero: gridOptions.yLabelOnZero
    }, gridOptions, gridGroup);

    // --- Draw X-axis grid lines and labels ---
    drawAxisLabelsAndLines({
        isXAxis: true,
        min: gridOptions.xMin,
        max: gridOptions.xMax,
        increment: gridOptions.xIncrement,
        labelEvery: gridOptions.xLabelEvery,
        labelOnZero: gridOptions.xLabelOnZero,
        xAxisLabelType: gridOptions.xAxisLabelType
    }, gridOptions, gridGroup);


    // Calculate axis line end points - extension must match arrow size for seamless join
    const extension = gridOptions.showAxisArrows ? Math.max(gridOptions.zeroLineExtension, gridOptions.arrowHeadSize) : 0;

    const xAxisLineStartExtended = gridOptions.offsetX - (gridOptions.xMin < -EPSILON ? extension : 0);
    const xAxisLineEndExtended = gridOptions.offsetX + gridOptions.actualGridWidth + (gridOptions.xMax > EPSILON ? extension : 0);
    const yAxisLineStartExtended = gridOptions.offsetY - (gridOptions.yMax > EPSILON ? extension : 0);
    const yAxisLineEndExtended = gridOptions.offsetY + gridOptions.actualGridHeight + (gridOptions.yMin < -EPSILON ? extension : 0);


    // --- Draw X-axis (the horizontal line representing y=0 or the bottom edge) ---
    if (gridOptions.showMainAxes) {
        const xAxisLineY = gridOptions.zeroYGridPos !== -1 ? gridOptions.zeroYGridPos : gridOptions.offsetY + gridOptions.actualGridHeight;
        
        gridGroup.appendChild(createSVGElement('line', {
            x1: xAxisLineStartExtended, y1: xAxisLineY,
            x2: xAxisLineEndExtended, y2: xAxisLineY,
            stroke: gridOptions.majorGridColor, 'stroke-width': gridOptions.majorLineThickness
        }));

        const xAxisTitleEl = createSVGElement('text', {
            'font-family': 'Inter, sans-serif', 'font-size': `${gridOptions.axisTitleFontSize}px`, fill: '#333'
        });
        xAxisTitleEl.textContent = gridOptions.xAxisLabel;

        if (gridOptions.xAxisLabelOnRight && gridOptions.xAxisLabel && gridOptions.xMax > EPSILON) {
            xAxisTitleEl.setAttribute('x', xAxisLineEndExtended + gridOptions.axisTitleSpacing);
            xAxisTitleEl.setAttribute('y', xAxisLineY);
            xAxisTitleEl.setAttribute('text-anchor', 'start');
            xAxisTitleEl.setAttribute('alignment-baseline', 'middle');
        } else if (gridOptions.xAxisLabel) {
            xAxisTitleEl.setAttribute('x', gridOptions.offsetX + gridOptions.actualGridWidth / 2);
            xAxisTitleEl.setAttribute('y', gridOptions.offsetY + gridOptions.actualGridHeight + (gridOptions.marginBottom / 2));
            xAxisTitleEl.setAttribute('text-anchor', 'middle');
            xAxisTitleEl.setAttribute('alignment-baseline', 'middle');
        }
        gridGroup.appendChild(xAxisTitleEl);
    }

    // --- Draw Y-axis (the vertical line representing x=0 or the left edge) ---
    if (gridOptions.showMainAxes) {
        const yAxisLineX = gridOptions.zeroXGridPos !== -1 ? gridOptions.zeroXGridPos : gridOptions.offsetX;
        
        gridGroup.appendChild(createSVGElement('line', {
            x1: yAxisLineX, y1: yAxisLineStartExtended,
            x2: yAxisLineX, y2: yAxisLineEndExtended,
            stroke: gridOptions.majorGridColor, 'stroke-width': gridOptions.majorLineThickness
        }));

        const yAxisTitleEl = createSVGElement('text', {
            'font-family': 'Inter, sans-serif', 'font-size': `${gridOptions.axisTitleFontSize}px`, fill: '#333'
        });
        yAxisTitleEl.textContent = gridOptions.yAxisLabel;

        if (gridOptions.yAxisLabelOnTop && gridOptions.yAxisLabel && gridOptions.yMax > EPSILON) {
            yAxisTitleEl.setAttribute('x', yAxisLineX);
            yAxisTitleEl.setAttribute('y', yAxisLineStartExtended - gridOptions.axisTitleSpacing);
            yAxisTitleEl.setAttribute('transform', '');
            yAxisTitleEl.setAttribute('text-anchor', 'middle');
            yAxisTitleEl.setAttribute('alignment-baseline', 'alphabetic');
        } else if (gridOptions.yAxisLabel) {
            yAxisTitleEl.setAttribute('x', gridOptions.marginLeft / 2);
            yAxisTitleEl.setAttribute('y', gridOptions.offsetY + gridOptions.actualGridHeight / 2);
            yAxisTitleEl.setAttribute('transform', `rotate(-90 ${gridOptions.marginLeft / 2},${gridOptions.offsetY + gridOptions.actualGridHeight / 2})`);
            yAxisTitleEl.setAttribute('text-anchor', 'middle');
            yAxisTitleEl.setAttribute('alignment-baseline', 'middle');
        }
        gridGroup.appendChild(yAxisTitleEl);
    }


    // --- Draw Axis Arrows ---
if (gridOptions.showAxisArrows) {
    const arrowColor = gridOptions.majorGridColor;
    const minLineLengthForArrow = 10;

    // X-axis positive direction (right)
    if (gridOptions.xMax > EPSILON && (xAxisLineEndExtended - xAxisLineStartExtended) >= minLineLengthForArrow) {
        // Arrowhead tip is exactly at the end of the axis line
        gridGroup.appendChild(
            createArrowheadPath(
                xAxisLineEndExtended,
                gridOptions.zeroYGridPos !== -1 ? gridOptions.zeroYGridPos : gridOptions.offsetY + gridOptions.actualGridHeight,
                0,
                arrowColor
            )
        );
    }
    // X-axis negative direction (left)
    if (gridOptions.xMin < -EPSILON && (xAxisLineEndExtended - xAxisLineStartExtended) >= minLineLengthForArrow) {
        gridGroup.appendChild(
            createArrowheadPath(
                xAxisLineStartExtended,
                gridOptions.zeroYGridPos !== -1 ? gridOptions.zeroYGridPos : gridOptions.offsetY + gridOptions.actualGridHeight,
                Math.PI,
                arrowColor
            )
        );
    }
    // Y-axis positive direction (up)
    if (gridOptions.yMax > EPSILON && (yAxisLineEndExtended - yAxisLineStartExtended) >= minLineLengthForArrow) {
        gridGroup.appendChild(
            createArrowheadPath(
                gridOptions.zeroXGridPos !== -1 ? gridOptions.zeroXGridPos : gridOptions.offsetX,
                yAxisLineStartExtended,
                -Math.PI / 2,
                arrowColor
            )
        );
    }
    // Y-axis negative direction (down)
    if (gridOptions.yMin < -EPSILON && (yAxisLineEndExtended - yAxisLineStartExtended) >= minLineLengthForArrow) {
        gridGroup.appendChild(
            createArrowheadPath(
                gridOptions.zeroXGridPos !== -1 ? gridOptions.zeroXGridPos : gridOptions.offsetX,
                yAxisLineEndExtended,
                Math.PI / 2,
                arrowColor
            )
        );
    }
} 

    // --- Create a clipping path for equation lines ---
    const defs = createSVGElement('defs');
    const clipPath = createSVGElement('clipPath', { id: 'gridClip' });
    const clipRect = createSVGElement('rect', {
        x: gridOptions.offsetX,
        y: gridOptions.offsetY,
        width: gridOptions.actualGridWidth,
        height: gridOptions.actualGridHeight
    });
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    // Stores bounding boxes of already placed labels.
    const placedLabelRects = [];

    // Combine actual equations and the preview equation for plotting
    const allEquationsToPlot = [...equationsToDraw];
    if (previewEquation) {
        allEquationsToPlot.push(previewEquation);
    }

    // --- Draw Equations ---
    allEquationsToPlot.forEach(eq => {
        const equationGroup = createSVGElement('g');
        svg.appendChild(equationGroup);

        const segments = [];
        let currentSegment = [];
        let lastCanvasY = null;

        const plotResolution = gridOptions.actualGridWidth * 2;
        const plotStepX = (gridOptions.xMax - gridOptions.xMin) / plotResolution;
        const jumpThreshold = requiredSVGHeight * 0.5;

        for (let i = 0; i <= plotResolution; i++) {
            const graphX = gridOptions.xMin + i * plotStepX;
            const canvasX = gridOptions.offsetX + (graphX - gridOptions.xMin) / gridOptions.xValuePerMinorSquare * gridOptions.minorSquareSize;

            const inDomain = (eq.domainStart === null || graphX >= eq.domainStart - EPSILON) &&
                             (eq.domainEnd === null || graphX <= eq.domainEnd + EPSILON);

            let graphY;
            let validPoint = false;

            try {
                if (inDomain) {
                    let xForEvaluation = graphX;
                    if (gridOptions.xAxisLabelType === 'degrees') {
                        xForEvaluation = math.unit(xForEvaluation, 'deg').toNumber('rad');
                    }
                    graphY = eq.compiledExpression.evaluate({ x: xForEvaluation });

                    if (isFinite(graphY)) {
                        const canvasY = gridOptions.offsetY + gridOptions.actualGridHeight - ((graphY - gridOptions.yMin) / gridOptions.yIncrement) * gridOptions.minorSquareSize;

                        if (currentSegment.length > 0 && Math.abs(canvasY - lastCanvasY) > jumpThreshold) {
                            segments.push(currentSegment);
                            currentSegment = [];
                        }

                        currentSegment.push({ x: canvasX, y: canvasY, graphX: graphX, graphY: graphY });
                        lastCanvasY = canvasY;
                        validPoint = true;
                    }
                }
            }
            catch (e) {
                validPoint = false;
            }

            if (!validPoint && currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
                lastCanvasY = null;
            } else if (!validPoint) {
                currentSegment = [];
                lastCanvasY = null;
            }
        }
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        // Draw shading
        // The check for eq.isPreview is removed to allow shading for preview equations.
        // Shading is still skipped if inequalityType is not defined or is '=' within drawEquationShading.
        drawEquationShading(equationGroup, eq, segments, {
            offsetX: gridOptions.offsetX, offsetY: gridOptions.offsetY,
            actualGridWidth: gridOptions.actualGridWidth, actualGridHeight: gridOptions.actualGridHeight,
            yMin: gridOptions.yMin, yIncrement: gridOptions.yIncrement, minorSquareSize: gridOptions.minorSquareSize,
            xValuePerMinorSquare: gridOptions.xValuePerMinorSquare, xMin: gridOptions.xMin,
            currentXAxisLabelType: gridOptions.xAxisLabelType
        });

        // Draw line
        const stroke = eq.color;
        // Use a slightly thinner line for preview, or a specific color if desired
        const equationLineThickness = eq.isPreview ?
                                     Math.max(0.8, Math.min(gridOptions.minorSquareSize * 0.04, 2)) : // Thinner for preview
                                     Math.max(1.2, Math.min(gridOptions.minorSquareSize * 0.06, 3.5));
        let strokeDasharray = LINE_STYLES[eq.lineStyle] || "0";

        // Always dashed for preview inequalities or strict inequalities for non-preview
        if (eq.isPreview || eq.inequalityType === '<' || eq.inequalityType === '>') {
            strokeDasharray = LINE_STYLES.dashed;
        }

        segments.forEach(seg => {
            if (seg.length < 2) return;
            const pathData = seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
            const path = createSVGElement('path', {
                d: pathData,
                stroke: stroke,
                'stroke-width': equationLineThickness,
                'stroke-dasharray': strokeDasharray,
                fill: 'none',
                'clip-path': 'url(#gridClip)',
                // Add opacity for preview lines (both line and shading)
                'stroke-opacity': eq.isPreview ? 0.6 : 1
            });
            equationGroup.appendChild(path);
        });

        // Draw line arrows and domain dots (skipped for preview equations in drawEquationEndpoints)
        drawEquationEndpoints(equationGroup, eq, segments, {
            offsetX: gridOptions.offsetX, offsetY: gridOptions.offsetY,
            actualGridWidth: gridOptions.actualGridWidth, actualGridHeight: gridOptions.actualGridHeight,
            yMin: gridOptions.yMin, yIncrement: gridOptions.yIncrement, minorSquareSize: gridOptions.minorSquareSize,
            xValuePerMinorSquare: gridOptions.xValuePerMinorSquare, xMin: gridOptions.xMin,
            currentXAxisLabelType: gridOptions.xAxisLabelType
        });

        // Label Placement (skipped for preview equations in placeEquationLabel)
        let labelText = '';
        if (eq.labelType === 'custom' && eq.customLabel.trim() !== '') {
            labelText = formatEquationTextForDisplay(eq.customLabel);
        } else if (eq.labelType === 'equation') {
            labelText = formatEquationTextForDisplay(`y ${eq.inequalityType || '='} ${eq.rawExpression}`);
        }

        placeEquationLabel(equationGroup, eq, labelText, gridOptions, placedLabelRects, segments);
    });

    // Re-attach drag event listeners after all SVG elements are redrawn
    setupDragging();

    // Emit current transform for overlays (points, etc.).
    try {
        const xMin = gridOptions.xMin;
        const xMax = gridOptions.xMax;
        const yMin = gridOptions.yMin;
        const yMax = gridOptions.yMax;
        const plotX = gridOptions.offsetX;
        const plotY = gridOptions.offsetY;
        const plotWidth = gridOptions.actualGridWidth;
        const plotHeight = gridOptions.actualGridHeight;
        const squareSizePx = gridOptions.minorSquareSize;
        const xValuePerMinorSquare = gridOptions.xValuePerMinorSquare;
        const yIncrement = gridOptions.yIncrement;
        setTransform({ xMin, xMax, yMin, yMax, plotX, plotY, plotWidth, plotHeight, squareSizePx, xValuePerMinorSquare, yIncrement });
    } catch (e) {
        // no-op if gridAPI not available
    }
}
