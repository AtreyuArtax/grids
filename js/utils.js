// This module contains general utility functions used across the application.

import { errorHandler } from './modules/errorHandler.js';

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
 * Note: Only simple exponents (single digit, variable, or operator) are converted to superscript.
 * Complex expressions with parentheses are kept as-is for readability.
 */
export function parseSuperscript(text) {
    if (!text || typeof text !== 'string') return '';
    
    const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³',
        '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷',
        '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', '=': '₌',
        'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
        'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
        'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': 'ᵍ', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ',
        'y': 'ʸ', 'z': 'ᶻ',
        'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ',
        'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
        'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'Q': 'ᵠ', 'R': 'ᴿ',
        'S': 'ˢ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ᴱ', 'W': 'ᴹ', 'X': 'ˣ',
        'Y': 'ʸ', 'Z': 'ᶻ'
    };
    
    // Match ^ followed by exponent content:
    // - Single digit: [0-9]
    // - Or a single variable/letter: [a-zA-Z]
    // - Or simple operators/signs: [+\-=]
    // Notably, we do NOT convert parenthesized expressions as they render poorly in superscript
    return text.replace(/\^([0-9a-zA-Z+\-=])/g, (match, char) => {
        return superscriptMap[char] || match;
    });
}

/**
 * Helper function to simplify fractions for radian labels.
 * @param {number} numerator - The numerator of the fraction.
 * @param {number} denominator - The denominator of the fraction.
 * @returns {number[]} An array containing the simplified numerator and denominator.
 */
export function simplifyFraction(numerator, denominator) {
    if (denominator === 0) {
        errorHandler.error('Denominator cannot be zero', {
            component: 'utils',
            action: 'simplifyFraction'
        });
        return [numerator, 1]; // Return safe fallback
    }
    
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
 * Converts math.js syntax to LaTeX for rendering with KaTeX.
 * @param {string} expression The math.js expression (e.g., "(2x-3)/(x-1)", "sin(x^2)").
 * @returns {string} The LaTeX formatted string (e.g., "\\frac{2x-3}{x-1}", "\\sin(x^2)").
 */
export function convertMathToLaTeX(expression) {
    if (!expression || typeof expression !== 'string') return '';
    
    let latex = expression;
    
    // Helper function to find matching closing parenthesis
    function findMatchingParen(str, startIndex) {
        let depth = 1;
        for (let i = startIndex; i < str.length; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }
    
    // First, handle exponents with parentheses (may contain fractions)
    // We need to process these before general fraction conversion
    let result = '';
    let i = 0;
    while (i < latex.length) {
        if (latex[i] === '^' && latex[i + 1] === '(') {
            // Find the matching closing parenthesis
            const closeIndex = findMatchingParen(latex, i + 2);
            if (closeIndex !== -1) {
                const exponent = latex.substring(i + 2, closeIndex);
                
                // Check if the exponent contains a division
                if (exponent.includes('/')) {
                    // Convert fractions within the exponent
                    let processedExponent = exponent;
                    // Match (a)/(b) pattern
                    processedExponent = processedExponent.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
                    // Match simple a/b pattern
                    processedExponent = processedExponent.replace(/([^\/\s]+)\s*\/\s*([^\/\s]+)/g, '\\frac{$1}{$2}');
                    result += `^{${processedExponent}}`;
                } else {
                    result += `^{${exponent}}`;
                }
                i = closeIndex + 1;
                continue;
            }
        }
        result += latex[i];
        i++;
    }
    latex = result;
    
    // Convert remaining fractions: (a)/(b) -> \frac{a}{b}
    // This regex matches patterns like (anything)/(anything)
    latex = latex.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
    
    // Convert simple fractions: a/b -> \frac{a}{b} (where a and b are single terms)
    latex = latex.replace(/(\w+|\d+)\s*\/\s*(\w+|\d+)/g, '\\frac{$1}{$2}');
    
    // Convert remaining simple exponents: x^2 -> x^{2}
    latex = latex.replace(/\^(\w)/g, '^{$1}'); // Single character exponent
    latex = latex.replace(/\^(\d+)/g, '^{$1}'); // Multi-digit exponent
    
    // Convert math functions to LaTeX commands
    const functions = {
        'sin': '\\sin',
        'cos': '\\cos',
        'tan': '\\tan',
        'sec': '\\sec',
        'csc': '\\csc',
        'cot': '\\cot',
        'asin': '\\arcsin',
        'acos': '\\arccos',
        'atan': '\\arctan',
        'sinh': '\\sinh',
        'cosh': '\\cosh',
        'tanh': '\\tanh',
        'log': '\\log',
        'log10': '\\log_{10}',
        'log2': '\\log_{2}',
        'ln': '\\ln',
        'exp': '\\exp',
        'sqrt': '\\sqrt',
        'abs': '\\left|', // Will need special handling
        'nthRoot': '\\sqrt'
    };
    
    // Replace function names with LaTeX equivalents
    for (const [func, latexFunc] of Object.entries(functions)) {
        if (func === 'abs') {
            // Special case: abs(x) -> |x|
            latex = latex.replace(new RegExp(`\\b${func}\\(([^)]+)\\)`, 'g'), `\\left|$1\\right|`);
        } else if (func === 'sqrt') {
            // sqrt(x) -> \sqrt{x}
            latex = latex.replace(new RegExp(`\\b${func}\\(([^)]+)\\)`, 'g'), `${latexFunc}{$1}`);
        } else if (func === 'nthRoot') {
            // nthRoot(x,n) -> \sqrt[n]{x}
            latex = latex.replace(/\bnthRoot\(([^,]+),\s*([^)]+)\)/g, '\\sqrt[$2]{$1}');
        } else {
            // Standard functions: sin(x) -> \sin(x)
            latex = latex.replace(new RegExp(`\\b${func}\\b`, 'g'), latexFunc);
        }
    }
    
    // Convert Greek letters
    latex = latex.replace(/\bpi\b/g, '\\pi');
    latex = latex.replace(/\bPi\b/g, '\\Pi');
    latex = latex.replace(/\btheta\b/g, '\\theta');
    latex = latex.replace(/\bTheta\b/g, '\\Theta');
    latex = latex.replace(/\balpha\b/g, '\\alpha');
    latex = latex.replace(/\bbeta\b/g, '\\beta');
    latex = latex.replace(/\bgamma\b/g, '\\gamma');
    latex = latex.replace(/\bGamma\b/g, '\\Gamma');
    latex = latex.replace(/\bdelta\b/g, '\\delta');
    latex = latex.replace(/\bDelta\b/g, '\\Delta');
    
    // Convert inequality symbols
    latex = latex.replace(/<=\s*/g, '\\leq ');
    latex = latex.replace(/>=\s*/g, '\\geq ');
    latex = latex.replace(/!=/g, '\\neq');
    
    // Handle special math constants
    latex = latex.replace(/\be\b/g, 'e'); // Euler's number stays as 'e'
    
    // Clean up multiplication signs (optional - LaTeX handles implicit multiplication)
    latex = latex.replace(/\*/g, '\\cdot ');
    
    return latex;
}

/**
 * Renders a LaTeX expression to HTML using KaTeX.
 * @param {string} latex The LaTeX expression to render.
 * @param {Object} options Optional KaTeX rendering options.
 * @returns {string} HTML string of the rendered expression.
 */
export function renderLaTeXToHTML(latex, options = {}) {
    if (!latex || typeof latex !== 'string') return '';
    
    // Check if KaTeX is available
    if (typeof katex === 'undefined') {
        console.warn('KaTeX is not loaded, falling back to plain text');
        return latex;
    }
    
    try {
        return katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
            ...options
        });
    } catch (e) {
        console.error('KaTeX rendering error:', e);
        return latex; // Fallback to plain text
    }
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
        errorHandler.error('Invalid parameters for line-rectangle intersection', {
            component: 'utils',
            action: 'getLineRectIntersection'
        });
        return { x: 0, y: 0 }; // Return safe fallback
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
        errorHandler.error('Canvas element not found', {
            component: 'utils',
            action: 'downloadPNG'
        });
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
 * @param {string} confirmText - The text for the confirm button (optional, defaults to 'Remove').
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false if cancelled.
 */
export function showConfirmDialog(message, title = 'Confirm Action', confirmText = 'OK') {
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
        confirmButton.textContent = confirmText;
        confirmButton.className = 'confirm-yes';
        
        // Style confirm button based on action type
        if (confirmText === 'Continue' || confirmText === 'Save' || confirmText === 'Load' || confirmText === 'OK') {
            confirmButton.style.backgroundColor = '#28a745'; // Green for positive actions
            confirmButton.addEventListener('mouseover', () => {
                confirmButton.style.backgroundColor = '#218838';
            });
            confirmButton.addEventListener('mouseout', () => {
                confirmButton.style.backgroundColor = '#28a745';
            });
        }
        // Default red styling is already applied by CSS for destructive actions like Delete/Remove
        
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

/**
 * Shows a custom input dialog for text input.
 * @param {string} message - The message to display in the input dialog.
 * @param {string} title - The title of the input dialog.
 * @param {string} defaultValue - The default value for the input field.
 * @param {string} inputLabel - The label for the input field.
 * @returns {Promise<string|null>} A promise that resolves to the input value if confirmed, null if cancelled.
 */
export function showInputDialog(message, title = 'Input', defaultValue = '', inputLabel = 'Value:') {
    return new Promise((resolve) => {
        // Create modal elements
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        
        const content = document.createElement('div');
        content.className = 'confirm-modal-content';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        // Optional message
        if (message) {
            const messageElement = document.createElement('p');
            messageElement.textContent = message;
            messageElement.style.cssText = 'margin-bottom: 16px; color: #666;';
            content.appendChild(titleElement);
            content.appendChild(messageElement);
        } else {
            content.appendChild(titleElement);
        }
        
        const inputLabelElement = document.createElement('label');
        inputLabelElement.textContent = inputLabel;
        inputLabelElement.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; text-align: left;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 1em; box-sizing: border-box;';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'confirm-modal-buttons';
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'confirm-yes';
        saveButton.style.backgroundColor = '#28a745';
        saveButton.addEventListener('mouseover', () => {
            saveButton.style.backgroundColor = '#218838';
        });
        saveButton.addEventListener('mouseout', () => {
            saveButton.style.backgroundColor = '#28a745';
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'confirm-no';
        
        // Event handlers
        const handleSave = () => {
            const value = input.value.trim();
            closeModal();
            resolve(value || null);
        };
        
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        };
        
        const handleCancel = () => {
            closeModal();
            resolve(null);
        };
        
        // Click handlers
        saveButton.addEventListener('click', handleSave);
        cancelButton.addEventListener('click', handleCancel);
        
        // Enter key handler
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });
        
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
        buttonContainer.appendChild(saveButton);
        content.appendChild(inputLabelElement);
        content.appendChild(input);
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        
        // Show modal
        document.body.appendChild(modal);
        setTimeout(() => {
            modal.classList.add('show');
            input.focus();
            input.select(); // Select all text for easy replacement
        }, 10);
    });
}