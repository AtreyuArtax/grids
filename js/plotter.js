// This module handles drawing the grid, axes, and plotting equations using SVG elements.
import { EPSILON, parseSuperscript, formatRadianLabel, formatEquationTextForDisplay, ZERO_LINE_EXTENSION, AXIS_TITLE_SPACING, ARROW_HEAD_SIZE, LINE_STYLES, SHADE_ALPHA } from './utils.js';
import { calculateDynamicMargins, dynamicMarginLeft, dynamicMarginRight,
         dynamicMarginTop, dynamicMarginBottom, doesOverlap } from './labels.js';
import { equationsToDraw } from './equations.js'; // Assuming equationsToDraw is a mutable array where labelPosition can be updated.

// --- Global variables for drag functionality ---
let currentDraggedLabel = null;
let startX = 0; // Initial mouse X coordinate
let startY = 0; // Initial mouse Y coordinate
let initialLabelX = 0; // Initial label X coordinate
let initialLabelY = 0; // Initial label Y coordinate

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
        console.error(`SVG element with ID '${svgId}' not found.`);
        showMessageBox(`Error: SVG element with ID '${svgId}' not found. Please ensure the SVG element exists in the HTML.`, 'error');
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
    const scale = Math.min(usableW / svgOriginalWidth, usableH / svgOriginalHeight);

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
        console.error("jsPDF or svg2pdf.js library not found. Please ensure they are loaded via <script> tags.");
        showMessageBox("Error: Required PDF libraries (jsPDF, svg2pdf.js) not found. Please ensure they are loaded in your HTML.", 'error');
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
        const finalX = parseFloat(currentDraggedLabel.getAttribute('x'));
        const finalY = parseFloat(currentDraggedLabel.getAttribute('y'));

        // Find the corresponding equation in the equationsToDraw array
        // IMPORTANT: This assumes each equation in equationsToDraw has a unique 'id' property.
        // If not, you'll need to modify how equations are identified (e.g., by array index).
        const eqIndex = equationsToDraw.findIndex(eq => eq.id === eqid);

        if (eqIndex !== -1) {
            // Update the labelPosition for persistence across redraws
            equationsToDraw[eqIndex].labelPosition = { x: finalX, y: finalY };
            // Optional: If you want to persist across page loads, save equationsToDraw to localStorage here.
            // e.g., localStorage.setItem('equations', JSON.stringify(equationsToDraw));
        } else {
            console.warn(`Equation with ID ${eqid} not found to update label position.`);
        }

        currentDraggedLabel = null; // Reset dragged label
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

    // Use the dynamically calculated margins
    const marginLeft = dynamicMarginLeft;
    const marginRight = dynamicMarginRight;
    const marginTop = dynamicMarginTop;
    const marginBottom = dynamicMarginBottom;

    // Get input values, with robust fallbacks for NaN
    const minorSquareSize = parseFloat(document.getElementById('squareSizeInput').value) || 40;
    const minorLineThickness = Math.max(0.5, minorSquareSize * 0.025);
    const majorLineThickness = Math.max(minorLineThickness * 1.8, minorSquareSize * 0.06);
    const labelFontSize = Math.max(9, Math.min(Math.round(minorSquareSize * 0.38), 60));        // axis number labels
    const axisTitleFontSize = Math.max(12, Math.min(Math.round(minorSquareSize * 0.48), 80));   // axis titles (x/y)
    const equationLabelFontSize = Math.max(9, Math.min(Math.round(minorSquareSize * 0.32), 48)); // equation labels
    const yMin = parseFloat(document.getElementById('yMin').value) || 0;
    const yMax = parseFloat(document.getElementById('yMax').value) || 10;
    const yIncrement = parseFloat(document.getElementById('yIncrement').value) || 1;
    const yLabelEvery = parseInt(document.getElementById('yLabelEvery').value, 10);
    const yLabelOnZero = document.getElementById('yLabelOnZero').checked;
    const yAxisLabelOnTop = document.getElementById('yAxisLabelOnTop').checked;
    const arrowHeadSize = Math.max(5, Math.round(minorSquareSize * 0.35));
    const zeroLineExtension = Math.max(10, Math.round(minorSquareSize * 0.75)); // tweak the 0.65 factor for taste
    const axisTitleSpacing = Math.max(10, Math.round(minorSquareSize * 0.65)); // tweak as needed

    // Get the state of the "Show Main Axes" checkbox
    const showMainAxes = document.getElementById('showAxes') ? document.getElementById('showAxes').checked : true;
    // Get the state of the "Show Axis Arrows" checkbox (separate control)
    const showAxisArrows = document.getElementById('showAxisArrows') ? document.getElementById('showAxisArrows').checked : true;

    const xAxisLabelType = document.getElementById('xAxisLabelType').value;
    let xMin, xMax, xIncrement; // xIncrement is the major mathematical step (e.g., 1 unit or pi/2 radians)
    let xValuePerMinorSquare; // How much mathematical value one minorSquareSize represents on X-axis

    if (xAxisLabelType === 'radians') {
        const xMinRadians = parseFloat(document.getElementById('xMinRadians').value) || 0;
        const xMaxRadians = parseFloat(document.getElementById('xMaxRadians').value) || (2 * Math.PI / Math.PI); // Default to 2, representing 2π
        const radianStepMultiplier = parseFloat(document.getElementById('radianStepMultiplier').value) || 0.5; // Default to π/2
        const xGridUnitsPerRadianStep = parseInt(document.getElementById('xGridUnitsPerRadianStep').value, 10) || 6;

        xMin = xMinRadians * Math.PI;
        xMax = xMaxRadians * Math.PI;
        xIncrement = radianStepMultiplier * Math.PI; // Mathematical value of one radian step (e.g., pi/2)

        if (radianStepMultiplier <= 0 || xGridUnitsPerRadianStep <= 0 || !isFinite(radianStepMultiplier) || !isFinite(xGridUnitsPerRadianStep)) {
            gridErrorMessage.textContent = "Error: Radian Step Multiplier and Grid Units per Radian Step must be positive numbers.";
            return;
        }
        // Calculate how much X-axis value each minor grid square represents
        xValuePerMinorSquare = xIncrement / xGridUnitsPerRadianStep;
    } else { // numbers or degrees
        xMin = parseFloat(document.getElementById('xMin').value) || 0;
        xMax = parseFloat(document.getElementById('xMax').value) || 10;
        xIncrement = parseFloat(document.getElementById('xIncrement').value) || 1;
        xValuePerMinorSquare = xIncrement;
    }

    const xLabelEvery = parseInt(document.getElementById('xLabelEvery').value, 10);
    const xLabelOnZero = document.getElementById('xLabelOnZero').checked;
    const xAxisLabelOnRight = document.getElementById('xAxisLabelOnRight').checked;
    
    const xAxisLabel = parseSuperscript(document.getElementById('xAxisLabel').value);
    const yAxisLabel = parseSuperscript(document.getElementById('yAxisLabel').value);
    const suppressZeroLabel = document.getElementById('suppressZeroLabel').checked;

    // Get grid line colors
    const minorGridColor = document.getElementById('minorGridColor').value;
    const majorGridColor = document.getElementById('majorGridColor').value;

    // --- Input Validation ---
    if (yIncrement <= 0 || xIncrement <= 0 || minorSquareSize <= 0 || !isFinite(yIncrement) || !isFinite(xIncrement) || !isFinite(minorSquareSize)) {
        gridErrorMessage.textContent = "Error: Increment and Square Size values must be positive numbers.";
        return; // Stop drawing
    }

    const yRange = yMax - yMin;
    const xRange = xMax - xMin;

    // Handle cases where range is 0 or negative
    if (yRange < 0 || xRange < 0) {
        gridErrorMessage.textContent = "Error: Max axis value must be greater than Min axis value.";
        return;
    }

    // Calculate total number of minor grid rows/columns
    const numMinorGridRows = yRange / yIncrement;
    const numMinorGridCols = xRange / xValuePerMinorSquare;

    // Check for finite numbers after division, which handles cases like 0/0 or division by non-finite
    if (!isFinite(numMinorGridRows) || !isFinite(numMinorGridCols)) {
        gridErrorMessage.textContent = "Error: Invalid axis ranges or increments resulting in non-finite grid dimensions.";
        return;
    }

    // Calculate actual grid dimensions in pixels
    const actualGridHeight = numMinorGridRows * minorSquareSize;
    const actualGridWidth = numMinorGridCols * minorSquareSize;

    // --- Dynamic SVG Resizing (using viewBox) ---
    const requiredSVGWidth = actualGridWidth + marginLeft + marginRight;
    const requiredSVGHeight = actualGridHeight + marginTop + marginBottom;

    // Robustness check for SVG dimensions
    if (!isFinite(requiredSVGWidth) || !isFinite(requiredSVGHeight) || requiredSVGWidth <= 0 || requiredSVGHeight <= 0) {
        gridErrorMessage.textContent = "Error: Calculated grid dimensions are invalid. Check input values and preset settings.";
        console.error("Invalid SVG dimensions calculated:", { requiredSVGWidth, requiredSVGHeight });
        // Set minimal valid size to prevent browser errors and show an empty canvas
        svg.setAttribute('width', 1);
        svg.setAttribute('height', 1);
        svg.setAttribute('viewBox', '0 0 1 1');
        return; // Exit drawing if dimensions are bad
    }


    // svg.setAttribute('width', requiredSVGWidth); // No longer needed if using viewBox for scaling
    // svg.setAttribute('height', requiredSVGHeight); // No longer needed if using viewBox for scaling
    svg.setAttribute('viewBox', `0 0 ${requiredSVGWidth} ${requiredSVGHeight}`);
    svg.style.backgroundColor = '#fff'; // Explicit white background

    // Create a group for all grid and axis elements to allow easy clearing
    const gridGroup = createSVGElement('g', { id: 'gridGroup' });
    svg.appendChild(gridGroup);

    // Calculate offset to position the grid within its new, dynamically sized area
    const offsetX = marginLeft;
    const offsetY = marginTop;

    // Get paper style from HTML
    const paperStyle = document.getElementById('paperStyle').value || 'grid';

    // --- Branch for Paper Style: Dot vs. Grid ---
    if (paperStyle === 'dot') {
        // Dot style settings (tweak for taste)
        const dotColor = minorGridColor;
        const dotRadius = Math.max(1.2, minorSquareSize * 0.11); // e.g. 4 for 40px squares

        drawDotGrid(gridGroup, {
            offsetX, offsetY,
            numMinorGridRows, numMinorGridCols,
            minorSquareSize,
            dotColor,
            dotRadius
        });

        // If you want only dots for dot paper, return here to skip drawing lines and axis labels
        // If you want lines AND dots, comment out this return.
        // For standard dot paper, we usually only want dots.
        // Axis lines and labels are drawn after this block.
    }

    // Find the Y-position of the zero line relative to the grid top
    let zeroYGridPos = -1;
    if (yMin <= 0 && yMax >= 0) {
        zeroYGridPos = offsetY + (yMax / yIncrement) * minorSquareSize;
    }

    // Find the X-position of the zero line relative to the grid left
    let zeroXGridPos = -1;
    if (xMin <= 0 && xMax >= 0) {
        zeroXGridPos = offsetX + (-xMin / xValuePerMinorSquare) * minorSquareSize;
    }

    // Calculate axis line end points - ALWAYS calculate full potential extension for arrow placement
    // These values define the potential maximum length of the axis line.
    const xAxisLineStartExtended = offsetX - (xMin < -EPSILON ? zeroLineExtension : 0);
    const xAxisLineEndExtended = offsetX + actualGridWidth + (xMax > EPSILON ? zeroLineExtension : 0);
    const yAxisLineStartExtended = offsetY - (yMax > EPSILON ? zeroLineExtension : 0);
    const yAxisLineEndExtended = offsetY + actualGridHeight + (yMin < -EPSILON ? zeroLineExtension : 0);


    // --- Draw Y-axis grid lines and labels ---
    for (let r = 0; r <= numMinorGridRows; r++) {
        const y = offsetY + r * minorSquareSize;
        const value = yMax - r * yIncrement;

        const isMathematicalZeroLine = Math.abs(value) < EPSILON; // Check for actual zero
        // `drawAsMajorAxis` determines if this grid line should be thicker/major, based on showMainAxes
        const drawAsMajorAxis = showMainAxes && isMathematicalZeroLine;

        const strokeWidth = drawAsMajorAxis ? majorLineThickness : minorLineThickness;
        const stroke = drawAsMajorAxis ? majorGridColor : minorGridColor;

        // Draw grid lines (thickness/color depends on `drawAsMajorAxis`, only draw if grid paper)
        if (paperStyle === 'grid') {
            const line = createSVGElement('line', {
                x1: offsetX,
                y1: y,
                x2: offsetX + actualGridWidth,
                y2: y,
                stroke: stroke,
                'stroke-width': strokeWidth
            });
            gridGroup.appendChild(line);
        }

        // Y-axis Labeling Logic (numbers) - only show '0' if main axes are visible and conditions met
        if (
            yLabelEvery > 0 &&
            (
                (r % yLabelEvery === 0)
                || (showMainAxes && yLabelOnZero && isMathematicalZeroLine) // Only show '0' if main axes are visible
            )
            && !(value === 0 && suppressZeroLabel) // Always respect suppressZeroLabel
        ) {
            // NO extra check or continue here! Y-axis gets to draw '0' at the origin if appropriate.
            // The X-axis will handle the suppression if Y-axis draws it.

            const labelText = value.toFixed(yIncrement.toString().includes('.') ? yIncrement.toString().split('.')[1].length : 0);
            const textEl = createSVGElement('text', {
                x: (showMainAxes && yLabelOnZero && zeroXGridPos !== -1) ? zeroXGridPos - 5 : offsetX - 10, // offset towards X-axis 0 if main axes visible
                y: y,
                'font-family': 'Inter, sans-serif', // Corrected font-family syntax
                'font-size': `${labelFontSize}px`,
                fill: '#333',
                'text-anchor': 'end',
                'alignment-baseline': 'middle'
            });
            textEl.textContent = labelText;
            gridGroup.appendChild(textEl);
        }
    }

    // --- Draw X-axis grid lines and labels ---
    for (let c = 0; c <= numMinorGridCols; c++) {
        const x = offsetX + c * minorSquareSize;
        const value = xMin + c * xValuePerMinorSquare;

        const isMathematicalZeroLine = Math.abs(value) < EPSILON; // Check for actual zero
        // `drawAsMajorAxis` determines if this grid line should be thicker/major, based on showMainAxes
        const drawAsMajorAxis = showMainAxes && isMathematicalZeroLine;

        const strokeWidth = drawAsMajorAxis ? majorLineThickness : minorLineThickness;
        const stroke = drawAsMajorAxis ? majorGridColor : minorGridColor;

        // Draw grid lines (thickness/color depends on `drawAsMajorAxis`, only draw if grid paper)
        if (paperStyle === 'grid') {
            const line = createSVGElement('line', {
                x1: x,
                y1: offsetY,
                x2: x,
                y2: offsetY + actualGridHeight,
                stroke: stroke,
                'stroke-width': strokeWidth
            });
            gridGroup.appendChild(line);
        }

        // X-axis Labeling Logic (numbers or radians) - only show '0' if main axes are visible and conditions met
        let shouldLabel = false;
        if (xLabelEvery > 0) {
            if (xAxisLabelType === 'radians') {
                const xGridUnitsPerRadianStep = parseInt(document.getElementById('xGridUnitsPerRadianStep').value, 10) || 6;
                const radianStepMultiplier = parseFloat(document.getElementById('radianStepMultiplier').value) || 0.5;
                const theoreticalMajorStepVal = Math.round((value - xMin) / (radianStepMultiplier * Math.PI));
                if (
                    xGridUnitsPerRadianStep > 0 &&
                    Math.round((value - xMin) / xValuePerMinorSquare) % xGridUnitsPerRadianStep === 0 &&
                    theoreticalMajorStepVal % xLabelEvery === 0
                ) {
                    shouldLabel = true;
                }
            } else {
                if (
                    Math.round((value - xMin) / xValuePerMinorSquare) % xLabelEvery === 0
                ) {
                    shouldLabel = true;
                }
            }
        }

        // If it's the zero line, and main axes are visible, and xLabelOnZero is checked, then label it.
        if (isMathematicalZeroLine && showMainAxes && xLabelOnZero) {
            shouldLabel = true;
        }

        if (shouldLabel) {
            // Always respect suppressZeroLabel
            if (value === 0 && suppressZeroLabel) {
                continue;
            }
            // NEW: Prevent drawing '0' at origin if Y-axis is configured to show '0' and both axes pass through the origin.
            // Y-axis takes priority for the (0,0) label.
            if (
                isMathematicalZeroLine && // It is the X=0 line
                showMainAxes &&          // Main axes are enabled
                yLabelOnZero &&          // Y-axis is configured to show its '0'
                zeroYGridPos !== -1 &&   // Y-axis zero line is visible in the grid
                zeroXGridPos !== -1      // X-axis zero line is visible in the grid
            ) {
                continue; // Skip drawing X-axis '0' label
            }

            let labelText;
            if (xAxisLabelType === 'radians') {
                labelText = formatRadianLabel(value);
            } else if (xAxisLabelType === 'degrees') {
                labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0) + '°';
            } else {
                labelText = value.toFixed(xIncrement.toString().includes('.') ? xIncrement.toString().split('.')[1].length : 0);
            }

            const labelYOffset = Math.round(labelFontSize * 0.6); // you can adjust this value

            const textEl = createSVGElement('text', {
                x: x,
                y: (showMainAxes && xLabelOnZero && zeroYGridPos !== -1) // Offset towards Y-axis 0 if main axes visible
                    ? zeroYGridPos + labelYOffset
                    : offsetY + actualGridHeight + labelYOffset,
                'font-family': 'Inter, sans-serif', // Corrected font-family syntax
                'font-size': `${labelFontSize}px`,
                fill: '#333',
                'text-anchor': 'middle',
                'alignment-baseline': 'hanging'
            });
            textEl.textContent = labelText;
            gridGroup.appendChild(textEl);
        }
    }


    // --- Draw X-axis (the horizontal line representing y=0 or the bottom edge) ---
    // Only draw main axis line and its label if showMainAxes is true
    if (showMainAxes) {
        const xAxisLineY = zeroYGridPos !== -1 ? zeroYGridPos : offsetY + actualGridHeight;
        
        gridGroup.appendChild(createSVGElement('line', {
            x1: xAxisLineStartExtended, // Use extended line for full potential length
            y1: xAxisLineY,
            x2: xAxisLineEndExtended,   // Use extended line for full potential length
            y2: xAxisLineY,
            stroke: majorGridColor,
            'stroke-width': majorLineThickness
        }));

        // Draw X-axis label (main title 'x')
        const xAxisTitle = createSVGElement('text', {
            'font-family': 'Inter, sans-serif',
            'font-size': `${axisTitleFontSize}px`,
            fill: '#333'
        });
        xAxisTitle.textContent = xAxisLabel;

        if (xAxisLabelOnRight && xAxisLabel && xMax > EPSILON) { // Only show on right if axis extends right
            const xPos = offsetX + actualGridWidth + zeroLineExtension + axisTitleSpacing;
            xAxisTitle.setAttribute('x', xPos);
            xAxisTitle.setAttribute('y', xAxisLineY);
            xAxisTitle.setAttribute('text-anchor', 'start');
            xAxisTitle.setAttribute('alignment-baseline', 'middle');
        } else if (xAxisLabel) { // Position below the grid, centered horizontally
            xAxisTitle.setAttribute('x', offsetX + actualGridWidth / 2);
            xAxisTitle.setAttribute('y', offsetY + actualGridHeight + (marginBottom / 2));
            xAxisTitle.setAttribute('text-anchor', 'middle');
            xAxisTitle.setAttribute('alignment-baseline', 'middle');
        }
        gridGroup.appendChild(xAxisTitle);
    }


    // --- Draw Y-axis (the vertical line representing x=0 or the left edge) ---
    // Only draw main axis line and its label if showMainAxes is true
    if (showMainAxes) {
        const yAxisLineX = zeroXGridPos !== -1 ? zeroXGridPos : offsetX;
        
        gridGroup.appendChild(createSVGElement('line', {
            x1: yAxisLineX,
            y1: yAxisLineStartExtended, // Use extended line for full potential length
            x2: yAxisLineX,
            y2: yAxisLineEndExtended,   // Use extended line for full potential length
            stroke: majorGridColor,
            'stroke-width': majorLineThickness
        }));

        // Draw Y-axis label (main title 'y', rotated)
        const yAxisTitle = createSVGElement('text', {
            'font-family': 'Inter, sans-serif', // Corrected font-family syntax
            'font-size': `${axisTitleFontSize}px`,
            fill: '#333'
        });
        yAxisTitle.textContent = yAxisLabel;

        if (yAxisLabelOnTop && yAxisLabel && yMax > EPSILON) { // Only show on top if axis extends up
            const yPos = offsetY - (zeroLineExtension + axisTitleSpacing);
            yAxisTitle.setAttribute('x', yAxisLineX);
            yAxisTitle.setAttribute('y', yPos);
            yAxisTitle.setAttribute('transform', '');
            yAxisTitle.setAttribute('text-anchor', 'middle');
            yAxisTitle.setAttribute('alignment-baseline', 'alphabetic');
        } else if (yAxisLabel) { // Position to the left of the grid, centered vertically, rotated
            yAxisTitle.setAttribute('x', marginLeft / 2);
            yAxisTitle.setAttribute('y', offsetY + actualGridHeight / 2);
            yAxisTitle.setAttribute('transform', `rotate(-90 ${marginLeft / 2},${offsetY + actualGridHeight / 2})`);
            yAxisTitle.setAttribute('text-anchor', 'middle');
            yAxisTitle.setAttribute('alignment-baseline', 'middle');
        }
        gridGroup.appendChild(yAxisTitle);
    }


    // --- Draw Axis Arrows ---
    // Only draw arrows if showAxisArrows is true (separate control)
    if (showAxisArrows) {
        const arrowColor = majorGridColor;
        const minLineLengthForArrow = 10; // Minimum length for an axis to show an arrow

        // X-axis positive arrow (right side)
        if (xMax > EPSILON && (xAxisLineEndExtended - xAxisLineStartExtended) >= minLineLengthForArrow) {
            gridGroup.appendChild(createArrowheadPath(xAxisLineEndExtended + arrowHeadSize, zeroYGridPos !== -1 ? zeroYGridPos : offsetY + actualGridHeight, 0, arrowColor));
        }

        // X-axis negative arrow (left side)
        if (xMin < -EPSILON && (xAxisLineEndExtended - xAxisLineStartExtended) >= minLineLengthForArrow) {
            gridGroup.appendChild(createArrowheadPath(xAxisLineStartExtended - arrowHeadSize, zeroYGridPos !== -1 ? zeroYGridPos : offsetY + actualGridHeight, Math.PI, arrowColor));
        }

        // Y-axis positive arrow (top side)
        if (yMax > EPSILON && (yAxisLineEndExtended - yAxisLineStartExtended) >= minLineLengthForArrow) {
            gridGroup.appendChild(createArrowheadPath(zeroXGridPos !== -1 ? zeroXGridPos : offsetX, yAxisLineStartExtended - arrowHeadSize, -Math.PI / 2, arrowColor));
        }

        // Y-axis negative arrow (bottom side)
        if (yMin < -EPSILON && (yAxisLineEndExtended - yAxisLineStartExtended) >= minLineLengthForArrow) {
            gridGroup.appendChild(createArrowheadPath(zeroXGridPos !== -1 ? zeroXGridPos : offsetX, yAxisLineEndExtended + arrowHeadSize, Math.PI / 2, arrowColor));
        }
    }

    // --- Create a clipping path for equation lines ---
    const defs = createSVGElement('defs');
    const clipPath = createSVGElement('clipPath', { id: 'gridClip' });
    const clipRect = createSVGElement('rect', {
        x: offsetX,
        y: offsetY,
        width: actualGridWidth,
        height: actualGridHeight
    });
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    // Stores bounding boxes of already placed labels.
    const placedLabelRects = [];


    // --- Draw Equations ---
    equationsToDraw.forEach(eq => {
        const equationGroup = createSVGElement('g'); // Group for each equation's elements
        svg.appendChild(equationGroup); // Append to SVG immediately to apply clipPath

        const currentXAxisLabelType = document.getElementById('xAxisLabelType').value;

        const segments = [];
        let currentSegment = [];
        let lastCanvasY = null;

        const plotResolution = actualGridWidth * 2;
        const plotStepX = (xMax - xMin) / plotResolution;

        const jumpThreshold = requiredSVGHeight * 0.5; // If y jumps by more than half the SVG height, lift the pen

        for (let i = 0; i <= plotResolution; i++) {
            const graphX = xMin + i * plotStepX;
            const canvasX = offsetX + (graphX - xMin) / xValuePerMinorSquare * minorSquareSize;

            const inDomain = (eq.domainStart === null || graphX >= eq.domainStart - EPSILON) &&
                             (eq.domainEnd === null || graphX <= eq.domainEnd + EPSILON);

            let graphY;
            let validPoint = false;

            try {
                if (inDomain) {
                    let xForEvaluation = graphX;
                    if (currentXAxisLabelType === 'degrees') {
                        xForEvaluation = math.unit(xForEvaluation, 'deg').toNumber('rad');
                    }
                    graphY = eq.compiledExpression.evaluate({ x: xForEvaluation });

                    if (isFinite(graphY)) {
                        const canvasY = offsetY + actualGridHeight - ((graphY - yMin) / yIncrement) * minorSquareSize;

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

        // Shading for inequalities
        if (eq.inequalityType && eq.inequalityType !== '=') {
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

        // Line style
        const stroke = eq.color;
        const equationLineThickness = Math.max(1.2, Math.min(minorSquareSize * 0.06, 3.5));
        let strokeDasharray = LINE_STYLES[eq.lineStyle] || "0"; // Default to solid

        if (eq.inequalityType === '<' || eq.inequalityType === '>') {
            strokeDasharray = LINE_STYLES.dashed; // Always dashed for strict inequalities
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
                'clip-path': 'url(#gridClip)' // Apply clipping
            });
            equationGroup.appendChild(path);
        });

        // === Draw line arrows and domain dots (SVG logic, canvas style) ===
        if (eq.showLineArrows && segments.length > 0) {
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
            function getLineRectIntersection(pInside, pOutside, rect) {
                const dx = pOutside.x - pInside.x;
                const dy = pOutside.y - pInside.y;
                let tBest = 1;
                function tryEdge(t) {
                    if (t >= -EPSILON_FOR_BOUNDARY && t <= 1 + EPSILON_FOR_BOUNDARY) tBest = Math.min(tBest, t);
                }
                if (Math.abs(dx) > EPSILON_FOR_BOUNDARY) {
                    tryEdge((rect.left - pInside.x) / dx);
                    tryEdge((rect.right - pInside.x) / dx);
                }
                if (Math.abs(dy) > EPSILON_FOR_BOUNDARY) {
                    tryEdge((rect.top - pInside.y) / dy);
                    tryEdge((rect.bottom - pInside.y) / dy);
                }
                return { x: pInside.x + tBest * dx, y: pInside.y + tBest * dy };
            }
            function createEndpointDot(x, y, color, r = 3) {
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
                    // If p1 is outside/on boundary and p2 is inside
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
                    // If p1 is inside and p2 is outside/on boundary
                    if (isStrictlyInside(p1) && !isStrictlyInside(p2)) {
                        return { pIn: p1, pOut: p2 };
                    }
                }
                return null;
            }

            // ARROW/DOT logic
            const firstSegmentPoints = segments[0];
            if (firstSegmentPoints.length >= 2) {
                if (eq.domainStart !== null) {
                    // Dot at domain start
                    const firstDomainPoint = firstSegmentPoints.find(p => Math.abs(p.graphX - eq.domainStart) < EPSILON_FOR_BOUNDARY);
                    if (firstDomainPoint && isStrictlyInside(firstDomainPoint)) {
                        equationGroup.appendChild(createEndpointDot(firstDomainPoint.x, firstDomainPoint.y, eq.color));
                    } else {
                        // Find where the line enters the visible grid area and place dot there
                        const crossingPair = findFirstCrossingPair(firstSegmentPoints);
                        if (crossingPair) {
                            const { pOut, pIn } = crossingPair;
                            const intersection = getLineRectIntersection(pIn, pOut, GRID_RECT);
                            equationGroup.appendChild(createEndpointDot(intersection.x, intersection.y, eq.color));
                        }
                    }
                } else {
                    // Arrow at left end
                    const crossingPair = findFirstCrossingPair(firstSegmentPoints);
                    if (crossingPair) {
                        const { pOut, pIn } = crossingPair;
                        const edge = getLineRectIntersection(pIn, pOut, GRID_RECT);
                        const angle = Math.atan2(edge.y - pIn.y, edge.x - pIn.x);
                        equationGroup.appendChild(createArrowheadPath(edge.x, edge.y, angle, eq.color));
                    }
                }
            }

            const lastSegmentPoints = segments[segments.length - 1];
            if (lastSegmentPoints.length >= 2) {
                if (eq.domainEnd !== null) {
                    // Dot at domain end
                    const lastDomainPoint = lastSegmentPoints.find(p => Math.abs(p.graphX - eq.domainEnd) < EPSILON_FOR_BOUNDARY);
                    if (lastDomainPoint && isStrictlyInside(lastDomainPoint)) {
                        equationGroup.appendChild(createEndpointDot(lastDomainPoint.x, lastDomainPoint.y, eq.color));
                    } else {
                        // Find where the line exits the visible grid area and place dot there
                        const crossingPair = findLastCrossingPair(lastSegmentPoints);
                        if (crossingPair) {
                            const { pIn, pOut } = crossingPair;
                            const intersection = getLineRectIntersection(pIn, pOut, GRID_RECT);
                            equationGroup.appendChild(createEndpointDot(intersection.x, intersection.y, eq.color));
                        }
                    }
                } else {
                    // Arrow at right end
                    const crossingPair = findLastCrossingPair(lastSegmentPoints);
                    if (crossingPair) {
                        const { pIn, pOut } = crossingPair;
                        const edge = getLineRectIntersection(pIn, pOut, GRID_RECT);
                        const angle = Math.atan2(edge.y - pIn.y, edge.x - pIn.x);
                        equationGroup.appendChild(createArrowheadPath(edge.x, edge.y, angle, eq.color));
                    }
                }
            }
        }
        // === END NEW line arrows/domain dots logic ===


        // --- Label Placement with Overlap Avoidance and Custom Positioning ---
        let labelText = '';
        if (eq.labelType === 'custom' && eq.customLabel.trim() !== '') {
            labelText = formatEquationTextForDisplay(eq.customLabel);
        } else if (eq.labelType === 'equation') {
            labelText = formatEquationTextForDisplay(`y ${eq.inequalityType || '='} ${eq.rawExpression}`);
        }

        if (!labelText) {
            return; // No label to draw
        }

        const labelTextEl = createSVGElement('text', {
            'font-family': 'Inter, sans-serif',
            'font-size': `${equationLabelFontSize}px`,
            fill: eq.color,
            'cursor': 'grab', // Make it clear the label is draggable
            'pointer-events': 'all' // Ensure the entire bounding box captures events
        });
        labelTextEl.textContent = labelText;
        labelTextEl.classList.add('draggable-equation-label'); // Add class for drag detection
        // Ensure eq.id is available and unique for proper tracking
        if (eq.id) {
             labelTextEl.dataset.eqid = eq.id;
        } else {
            console.warn("Equation missing ID, cannot track label position persistently via ID.");
            // Fallback for identification if ID is missing (e.g., use array index, but this is less robust)
            // If equationsToDraw is not constant, using index is problematic after additions/deletions.
        }

        let proposedLabelX, proposedLabelY;
        let chosenAnchor = 'start';
        let chosenBaseline = 'middle';

        // Prefer custom position if available
        if (eq.labelPosition && typeof eq.labelPosition.x === "number" && typeof eq.labelPosition.y === "number") {
            proposedLabelX = eq.labelPosition.x;
            proposedLabelY = eq.labelPosition.y;
            // When using a custom position, assume optimal anchor/baseline for now, or you could store these too
            // For simplicity, we'll keep the default 'start'/'middle' or infer from a `getBBox` later if needed.
            // If the user drags, the position is absolute, so the anchor/baseline becomes less critical for placement
            // but still affects how the text's internal origin aligns to proposedLabelX/Y.
            // For now, let's keep it simple with default as center aligned.
            chosenAnchor = 'middle';
            chosenBaseline = 'middle';
        } else {
            // AUTO-CALCULATED POSITIONING (your existing logic)
            let labelRefPoint = null;
            for (let i = segments.length - 1; i >= 0; i--) {
                const segment = segments[i];
                for (let j = segment.length - 1; j >= 0; j--) {
                    const p = segment[j];
                    // Check if point is within visible grid bounds
                    if (p.x >= offsetX && p.x <= (offsetX + actualGridWidth) &&
                        p.y >= offsetY && p.y <= (offsetY + actualGridHeight)) {
                        labelRefPoint = p;
                        break;
                    }
                }
                if (labelRefPoint) break;
            }

            if (!labelRefPoint) {
                // If no visible point, try to find a point on the extended line just outside the right border
                const testX = xMax + xValuePerMinorSquare; // A bit outside the right bound
                let xForEvaluation = testX;
                if (currentXAxisLabelType === 'degrees') {
                    xForEvaluation = math.unit(xForEvaluation, 'deg').toNumber('rad');
                }
                let testGraphY;
                try {
                    testGraphY = eq.compiledExpression.evaluate({ x: xForEvaluation });
                    if (isFinite(testGraphY)) {
                        const testCanvasY = offsetY + actualGridHeight - ((testGraphY - yMin) / yIncrement) * minorSquareSize;
                        labelRefPoint = {
                            x: offsetX + actualGridWidth + (minorSquareSize / 2), // Slightly to the right of the grid
                            y: testCanvasY
                        };
                    }
                } catch (e) {
                    // Ignore, no fallback point found
                }
            }


            if (labelRefPoint) {
                const pt = labelRefPoint;
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
                    proposedLabelX = pt.x + pos.dx;
                    proposedLabelY = pt.y + pos.dy;
                    chosenAnchor = pos.anchor;
                    chosenBaseline = pos.baseline;

                    // Temporarily apply to measure for overlap
                    labelTextEl.setAttribute('x', proposedLabelX);
                    labelTextEl.setAttribute('y', proposedLabelY);
                    labelTextEl.setAttribute('text-anchor', chosenAnchor);
                    labelTextEl.setAttribute('alignment-baseline', chosenBaseline);
                    equationGroup.appendChild(labelTextEl); // Temporarily append to measure

                    const bbox = labelTextEl.getBBox(); // Get bounding box of the text element

                    // Adjust for text-anchor to calculate bounding box accurately for overlap
                    let currentRectLeft = bbox.x;
                    let currentRectTop = bbox.y;
                    const textWidth = bbox.width;
                    const textHeight = bbox.height;

                    const currentLabelRect = {
                        left: currentRectLeft,
                        right: currentRectLeft + textWidth,
                        top: currentRectTop,
                        bottom: currentRectTop + textHeight
                    };

                    const safeAreaBuffer = 50; // Allow labels to extend a bit beyond the grid for visibility
                    const safeAreaLeft = offsetX - safeAreaBuffer;
                    const safeAreaRight = offsetX + actualGridWidth + safeAreaBuffer;
                    const safeAreaTop = offsetY - safeAreaBuffer;
                    const safeAreaBottom = offsetY + actualGridHeight + safeAreaBuffer;

                    // Check if label is within a reasonable display area
                    if (currentLabelRect.right < safeAreaLeft || currentLabelRect.left > safeAreaRight ||
                        currentLabelRect.bottom < safeAreaTop || currentLabelRect.top > safeAreaBottom) {
                        // Label is too far outside safe area, try next position
                        equationGroup.removeChild(labelTextEl); // Remove temporary element
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
                        placedLabelRects.push(currentLabelRect); // Store the actual left position to correctly handle overlap check later.
                        autoPositionFound = true;
                        break; // Found a good auto position
                    }
                    equationGroup.removeChild(labelTextEl); // Remove temporary element if it overlaps
                }

                if (!autoPositionFound) {
                    // Fallback if no ideal auto-position found without overlap, just place it at the last ref point
                    // and let it overlap. This ensures the label is always drawn.
                    proposedLabelX = pt.x + 5; // Default small offset
                    proposedLabelY = pt.y;
                    chosenAnchor = 'start';
                    chosenBaseline = 'middle';

                     // Still add it to the placedLabelRects to potentially block future labels
                    labelTextEl.setAttribute('x', proposedLabelX);
                    labelTextEl.setAttribute('y', proposedLabelY);
                    labelTextEl.setAttribute('text-anchor', chosenAnchor);
                    labelTextEl.setAttribute('alignment-baseline', chosenBaseline);
                    equationGroup.appendChild(labelTextEl);
                    placedLabelRects.push(labelTextEl.getBBox()); // Get actual bbox after placement
                }
            } else {
                // If no reference point from segments found at all, don't draw label (or draw at a default corner)
                return;
            }
        }

        // Final application of attributes (if not already appended in auto-position logic)
        if (!labelTextEl.parentNode) { // Check if it's already appended by the auto-position logic
            labelTextEl.setAttribute('x', proposedLabelX);
            labelTextEl.setAttribute('y', proposedLabelY);
            labelTextEl.setAttribute('text-anchor', chosenAnchor);
            labelTextEl.setAttribute('alignment-baseline', chosenBaseline);
            equationGroup.appendChild(labelTextEl);
            // If it wasn't added to placedLabelRects during auto-positioning check, add its final bbox now
            if (!eq.labelPosition) { // Only add if it's an auto-placed label, custom labels don't participate in initial overlap avoidance for other labels
                 placedLabelRects.push(labelTextEl.getBBox());
            }
        }
    });

    // Re-attach drag event listeners after all SVG elements are redrawn
    // This is crucial because drawGrid clears and recreates the SVG content.
    setupDragging();
}
