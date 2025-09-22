// This module contains general utility functions used across the application.

// Constants
export const EPSILON = 1e-6; // Small tolerance for floating point comparisons
export const ZERO_LINE_EXTENSION = 10; // Length of the axis line extension beyond the grid
export const AXIS_TITLE_SPACING = 14; // Increased spacing between arrow tip and the start of the axis title
export const ARROW_HEAD_SIZE = 8; // Default size for arrowheads, used in both drawing and margin calculations

// Defines line dash patterns for various line styles.
export const LINE_STYLES = {
    solid: "0", // Solid line, no dash
    dashed: "5 5",
    dots: "1 3", // 1 pixel line, 3 pixel gap
    dotsAndDash: [1, 3, 10, 3] // 1 pixel line, 3 pixel gap, 10 pixel line, 3 pixel gap
};

// Alpha value for shading inequalities.
export const SHADE_ALPHA = 0.2;

/**
 * Utility function to parse superscript syntax (handles '^' character).
 * @param {string} text - The input text possibly containing '^' followed by digits/symbols.
 * @returns {string} The text with '^' notation converted to unicode superscripts.
 */
export function parseSuperscript(text) {
    if (!text || typeof text !== 'string') return '';
    
    const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³',
        '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷',
        '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', '=': '₌',
        '(': '⁽', ')': '⁾'
    };
    return text.replace(/\^([0-9+\-=()]+)/g, (_, exp) => {
        return [...exp].map(c => superscriptMap[c] || c).join('');
    });
}

/**
 * Helper function to simplify fractions for radian labels.
 * @param {number} numerator - The numerator of the fraction.
 * @param {number} denominator - The denominator of the fraction.
 * @returns {number[]} An array containing the simplified numerator and denominator.
 */
export function simplifyFraction(numerator, denominator) {
    if (denominator === 0) throw new Error('Denominator cannot be zero');
    
    function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
    }
    const common = gcd(Math.abs(numerator), Math.abs(denominator));
    return [numerator / common, denominator / common];
}

/**
 * Function to format numerical values into radian labels (e.g., "π/2", "3π", "-π/4").
 * @param {number} rawValue - The numeric value in radians.
 * @returns {string} The formatted radian label.
 */
export function formatRadianLabel(rawValue) {
    if (!isFinite(rawValue)) return '∞';
    if (rawValue === 0) return '0';

    const tol = 1e-9; // Tolerance for floating point comparisons
    const ratioToPi = rawValue / Math.PI;

    // Check for integer multiples of pi
    if (Math.abs(ratioToPi - Math.round(ratioToPi)) < tol) {
        const n = Math.round(ratioToPi);
        if (n === 1) return 'π';
        if (n === -1) return '-π';
        return `${n}π`;
    }

    // Check for common fractions of pi
    const denominators = [2, 3, 4, 6, 8, 12]; // Common denominators to check for
    for (let d of denominators) {
        const num = ratioToPi * d;
        if (Math.abs(num - Math.round(num)) < tol) {
            const n = Math.round(num);
            const [simplifiedN, simplifiedD] = simplifyFraction(Math.abs(n), d); // Simplify with abs value

            const sign = n < 0 ? '-' : '';

            if (simplifiedN === 0) return '0';
            if (simplifiedD === 1) return `${sign}${simplifiedN === 1 ? '' : simplifiedN}π`; // Handles 1π, 2π, etc.
            // If simplifiedN is 1, don't show "1" (e.g., "1π/2")
            return `${sign}${simplifiedN === 1 ? '' : simplifiedN}π/${simplifiedD}`;
        }
    }

    // Fallback for values that aren't simple fractions of pi
    return rawValue.toFixed(2); // Display as decimal if no clean fraction found
}

/**
 * Formats the equation text for display, handling exponents, implied multiplication, and common fractions.
 * @param {string} expression The raw equation expression (e.g., "sin(x), x^2").
 * @returns {string} The formatted string (e.g., "sin(x), x², ½x").
 */
export function formatEquationTextForDisplay(expression) {
    if (!expression || typeof expression !== 'string') return '';
    
    let formattedText = expression;

    // Convert inequality symbols for display
    formattedText = formattedText.replace(/<=\s*/g, '≤ ');
    formattedText = formattedText.replace(/>=\s*/g, '≥ ');

    // Exponents are handled directly by math.js with `^`, and this formatter will convert to unicode superscripts.
    formattedText = parseSuperscript(formattedText);

    // Handle common fractions using Unicode vulgar fractions (if user types 1/2 etc.)
    const vulgarFractions = {
        '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾',
        '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙',
        '5/6': '⅚', '1/7': '⅐', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝',
        '7/8': '⅞', '1/9': '⅑', '1/10': '⅒'
    };
    const sortedFractions = Object.keys(vulgarFractions).sort((a, b) => b.length - a.length);
    for (const frac of sortedFractions) {
        const escapedFrac = frac.replace('/', '\\/');
        formattedText = formattedText.replace(new RegExp(`(?:\\b|\\()${escapedFrac}(?:\\b|\\))`, 'g'), vulgarFractions[frac]);
    }

    // Remove '*' for implied multiplication (e.g., 2*x -> 2x, 3*sin(x) -> 3sin(x))
    const impliedMultPattern = /([0-9\)\u00BC-\u00BE\u2150-\u215Ex])\s*\*\s*(x|\(|\b[a-zA-Z_]\w*\()/g;
    formattedText = formattedText.replace(impliedMultPattern, (match, p1, p2) => {
        // Special case for x*number or x*fraction: reorder to number*x
        if (p1 === 'x' && (/^[\d\u00BC-\u00BE\u2150-\u215E]+$/.test(p2.trim()))) {
            return p2.trim() + 'x';
        }
        return p1 + p2.trim(); // Remove the asterisk and whitespace around it
    });

    return formattedText;
}

/**
 * Draws a dot on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x - X coordinate of the dot.
 * @param {number} y - Y coordinate of the dot.
 * @param {string} colour - Color of the dot.
 * @param {number} [r=4] - Radius of the dot.
 */
export function drawDot(ctx, x, y, colour, r = 4) {
    if (!ctx || !isFinite(x) || !isFinite(y)) return;
    
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
}

/**
 * Finds the intersection point of a line segment (pInside -> pOutside) with a rectangle.
 * The intersection point will be on the rectangle boundary.
 * @param {Object} pInside - A point {x, y} assumed to be inside or very close to the rectangle.
 * @param {Object} pOutside - A point {x, y} assumed to be outside or very close to the rectangle.
 * @param {Object} rect - The rectangle {left, top, right, bottom}.
 * @returns {Object} The intersection point {x, y} on the rectangle boundary.
 */
export function getLineRectIntersection(pInside, pOutside, rect) {
    if (!pInside || !pOutside || !rect) {
        throw new Error('Invalid parameters for line-rectangle intersection');
    }
    
    const dx = pOutside.x - pInside.x;
    const dy = pOutside.y - pInside.y;
    let tBest = 1; // Parametric t-value, 0 = pInside, 1 = pOutside

    // Helper to update tBest if a valid intersection is found
    function tryEdge(t) {
        if (t >= 0 && t <= 1 + EPSILON) tBest = Math.min(tBest, t); // Allow slightly outside due to float precision
    }

    // Check intersections with vertical lines (left and right edges)
    if (Math.abs(dx) > EPSILON) { // Avoid division by zero for vertical lines
        tryEdge((rect.left - pInside.x) / dx);
        tryEdge((rect.right - pInside.x) / dx);
    }
    // Check intersections with horizontal lines (top and bottom edges)
    if (Math.abs(dy) > EPSILON) { // Avoid division by zero for horizontal lines
        tryEdge((rect.top - pInside.y) / dy);
        tryEdge((rect.bottom - pInside.y) / dy);
    }

    // Calculate the intersection point using the best t-value
    return { x: pInside.x + tBest * dx, y: pInside.y + tBest * dy };
}

/**
 * Draws an endpoint dot on a graph line, typically used for domain boundaries.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x - X coordinate of the dot.
 * @param {number} y - Y coordinate of the dot.
 * @param {string} color - Color of the dot.
 * @param {number} [size=3] - Radius of the dot.
 */
export function drawEndpointDot(ctx, x, y, color, size = 3) {
    if (!ctx || !isFinite(x) || !isFinite(y)) return;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

/**
 * Draws an arrowhead at the specified point (x2, y2) pointing in the direction from (x1, y1) to (x2, y2).
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x1 - X coordinate of the "tail" side of the arrow (determines direction).
 * @param {number} y1 - Y coordinate of the "tail" side of the arrow.
 * @param {number} x2 - X coordinate of the "head" of the arrow (where the arrow will be placed).
 * @param {number} y2 - Y coordinate of the "head" of the arrow.
 * @param {string} color - Color of the arrowhead.
 * @param {number} [size=ARROW_HEAD_SIZE] - Size of the arrowhead (length of the arrow sides).
 */
export function drawArrowhead(ctx, x1, y1, x2, y2, color, size = ARROW_HEAD_SIZE) {
    if (!ctx || !isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return;
    
    const angle = Math.atan2(y2 - y1, x2 - x1); // Angle of the line segment
    ctx.save();
    ctx.beginPath();
    ctx.translate(x2, y2); // Move to the arrowhead point
    ctx.rotate(angle);     // Rotate to align with the line
    ctx.moveTo(0, 0);      // Tip of the arrow
    ctx.lineTo(-size, size / 2); // Bottom side of the arrow
    ctx.lineTo(-size, -size / 2); // Top side of the arrow
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

/**
 * Function to show custom message box instead of alert.
 * @param {string} message - The message to display.
 */
export function showMessageBox(message) {
    if (!message) return;
    
    // Remove any existing message boxes
    const existingBoxes = document.querySelectorAll('.custom-message-box');
    existingBoxes.forEach(box => box.remove());
    
    const messageBox = document.createElement('div');
    messageBox.className = 'custom-message-box';
    messageBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000; display: flex; flex-direction: column; align-items: center; gap: 15px;
        max-width: 300px; text-align: center;
    `;
    messageBox.innerHTML = `
        <p>${message}</p>
        <button id="messageBoxClose" style="background-color: #007bff; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer;">OK</button>
    `;
    document.body.appendChild(messageBox);

    const closeButton = document.getElementById('messageBoxClose');
    const closeHandler = () => {
        if (document.body.contains(messageBox)) {
            document.body.removeChild(messageBox);
        }
    };
    
    closeButton.onclick = closeHandler;
    
    // Auto-close after 10 seconds
    setTimeout(closeHandler, 10000);
}

/**
 * Downloads the canvas content as a PNG image.
 */
export function downloadPNG() {
    const canvas = document.getElementById('gridCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    // Create a timestamp string:YYYY-MM-DD_HH-MM-SS
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const link = document.createElement('a');
    link.download = `grid_${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/**
 * Safely parses a numeric input value with fallback.
 * @param {string|number} value - The value to parse.
 * @param {number} fallback - The fallback value if parsing fails.
 * @returns {number} The parsed number or fallback.
 */
export function safeParseFloat(value, fallback = 0) {
    const parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : fallback;
}

/**
 * Safely parses an integer input value with fallback.
 * @param {string|number} value - The value to parse.
 * @param {number} fallback - The fallback value if parsing fails.
 * @returns {number} The parsed integer or fallback.
 */
export function safeParseInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return isFinite(parsed) ? parsed : fallback;
}

/**
 * Debounces a function call.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Shows a custom confirmation dialog.
 * @param {string} message - The message to display in the confirmation dialog.
 * @param {string} title - The title of the confirmation dialog (optional).
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if cancelled.
 */
export function showConfirmDialog(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        // Create modal elements
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        
        const content = document.createElement('div');
        content.className = 'confirm-modal-content';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'confirm-modal-buttons';
        
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Remove';
        confirmButton.className = 'confirm-yes';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'confirm-no';
        
        // Event handlers
        const handleConfirm = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                resolve(true);
            }, 300);
        };
        
        const handleCancel = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                resolve(false);
            }, 300);
        };
        
        // Click handlers
        confirmButton.addEventListener('click', handleConfirm);
        cancelButton.addEventListener('click', handleCancel);
        
        // ESC key handler
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
        
        // Assemble modal
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        content.appendChild(titleElement);
        content.appendChild(messageElement);
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        
        // Add to DOM and show
        document.body.appendChild(modal);
        
        // Trigger show animation after a brief delay
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Focus the cancel button by default
        setTimeout(() => {
            cancelButton.focus();
        }, 350);
    });
}