/**
 * Polar Grid Renderer Module
 * Handles all polar coordinate grid generation and labeling with advanced features:
 * - Configurable number of circles and radial divisions
 * - Label every Nth radial division (starting at 0)
 * - Smart innermost circle simplification to prevent visual clutter
 * - Degree or radian labeling with proper π notation
 */

export class PolarRenderer {
    /**
     * Initialize the polar renderer
     * @param {SVGElement} svg - The SVG element to draw into
     */
    constructor(svg) {
        this.svg = svg;
        this.gridGroupId = 'polarGrid';
    }

    /**
     * Draw a complete polar grid with all features
     * @param {Object} params - Configuration parameters
     * @param {number} params.centerX - X coordinate of the polar grid center
     * @param {number} params.centerY - Y coordinate of the polar grid center
     * @param {number} params.maxRadius - Maximum radius of the polar grid
     * @param {string} params.minorGridColor - Color for minor grid lines (default: '#a9a9a9')
     * @param {string} params.majorGridColor - Color for major radial lines and labels (default: '#555555')
     * @param {number} params.polarNumCircles - Number of concentric circles (default: 8)
     * @param {number} params.polarNumRadials - Number of radial divisions (default: 12)
     * @param {number} params.polarDegrees - Total degrees for outer circle (default: 360)
     * @param {string} params.polarLabelType - 'degrees' or 'radians' (default: 'degrees')
     * @param {number} params.polarLabelEvery - Label every Nth radial division (default: 1)
     * @param {number} params.polarInnerRadials - Number of radials to show in innermost circle (default: 4)
     * @param {number} params.polarSecondInnerRadials - Number of radials to show in second innermost circle (default: polarNumRadials)
     * @param {boolean} params.polarHalfCircleLabels - Label as two half-circles (0-180, 0-180) (default: false)
     */
    draw(params) {
        const { 
            centerX,
            centerY,
            maxRadius,
            minorGridColor = '#a9a9a9', 
            majorGridColor = '#555555',
            polarNumCircles = 8,
            polarNumRadials = 12,
            polarDegrees = 360,
            polarLabelType = 'degrees',
            polarLabelEvery = 1, // Label every Nth radial
            polarInnerRadials = 4, // Number of radials in innermost circle
            polarSecondInnerRadials = polarNumRadials, // Number of radials in second innermost circle
            polarHalfCircleLabels = false // Label as two half-circles
        } = params;

        const radiusStep = maxRadius / polarNumCircles;
        
        // Create container group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', this.gridGroupId);

        // Draw concentric circles
        this._drawCircles(g, centerX, centerY, polarNumCircles, radiusStep, minorGridColor);

        // Draw radial lines with smart innermost circle simplification
        this._drawRadials(
            g, 
            centerX, 
            centerY, 
            polarNumCircles, 
            polarNumRadials, 
            radiusStep, 
            polarDegrees,
            polarInnerRadials,
            polarSecondInnerRadials,
            minorGridColor,
            majorGridColor,
            polarLabelEvery
        );        // Add labels around the outer circle
        this._drawLabels(
            g, 
            centerX, 
            centerY, 
            maxRadius, 
            polarNumRadials, 
            polarDegrees, 
            polarLabelEvery,
            polarLabelType, 
            majorGridColor,
            polarHalfCircleLabels
        );

        this.svg.appendChild(g);
    }

    /**
     * Draw concentric circles
     * @private
     */
    _drawCircles(g, centerX, centerY, numCircles, radiusStep, color) {
        for (let i = 1; i <= numCircles; i++) {
            const radius = i * radiusStep;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', centerX);
            circle.setAttribute('cy', centerY);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', color);
            circle.setAttribute('stroke-width', '0.5');
            g.appendChild(circle);
        }
    }

    /**
     * Draw radial lines with smart innermost circle simplification
     * The innermost circle only shows a limited number of radials to prevent blob effect
     * The second innermost circle can have a different number of radials
     * Major radials (labeled ones) are drawn with majorGridColor for visual distinction
     * @private
     */
    _drawRadials(
        g, 
        centerX, 
        centerY, 
        numCircles, 
        numRadials, 
        radiusStep, 
        degrees,
        innerRadials,
        secondInnerRadials,
        minorColor,
        majorColor,
        labelEvery
    ) {
        const angleStep = (degrees * Math.PI / 180) / numRadials;
        
        // Calculate which radials to show in the innermost circle
        // If innerRadials is 0, skip all radials in innermost circle
        // Otherwise, show every Nth radial where N = numRadials / innerRadials
        let innerRadialStep = Infinity; // Default to skipping all
        if (innerRadials > 0) {
            innerRadialStep = Math.max(1, Math.round(numRadials / innerRadials));
        }
        
        // Calculate which radials to show in the second innermost circle
        let secondInnerRadialStep = Infinity; // Default to skipping all
        if (secondInnerRadials > 0) {
            secondInnerRadialStep = Math.max(1, Math.round(numRadials / secondInnerRadials));
        }
        
        for (let i = 0; i < numRadials; i++) {
            const angle = i * angleStep;
            
            // Determine if this radial should be shown in the innermost circle
            const showInInnermost = (innerRadials > 0) && (i % innerRadialStep === 0);
            
            // Determine if this radial should be shown in the second innermost circle
            const showInSecondInnermost = (secondInnerRadials > 0) && (i % secondInnerRadialStep === 0);
            
            // Determine if this is a major radial (one that gets labeled)
            const isMajor = (i % labelEvery === 0);
            
            // Draw line segments for each circle ring
            for (let circleIdx = 1; circleIdx <= numCircles; circleIdx++) {
                const isInnermostCircle = (circleIdx === 1);
                const isSecondInnermostCircle = (circleIdx === 2);
                
                // Skip this radial in the innermost circle if it's not one of the selected few
                if (isInnermostCircle && !showInInnermost) continue;
                
                // Skip this radial in the second innermost circle if it's not one of the selected few
                if (isSecondInnermostCircle && !showInSecondInnermost) continue;
                
                const startRadius = (circleIdx - 1) * radiusStep;
                const endRadius = circleIdx * radiusStep;
                
                const x1 = centerX + startRadius * Math.cos(angle);
                const y1 = centerY + startRadius * Math.sin(angle);
                const x2 = centerX + endRadius * Math.cos(angle);
                const y2 = centerY + endRadius * Math.sin(angle);
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                // Use majorColor for labeled radials, minorColor for others
                line.setAttribute('stroke', isMajor ? majorColor : minorColor);
                line.setAttribute('stroke-width', isMajor ? '1' : '0.5');
                g.appendChild(line);
            }
        }
    }

    /**
     * Draw degree/radian labels around outer circle
     * Labels every Nth radial division, starting at 0
     * Supports half-circle labeling mode (0-180, 0-180) for refraction experiments
     * @private
     */
    _drawLabels(
        g, 
        centerX, 
        centerY, 
        maxRadius, 
        numRadials, 
        degrees, 
        labelEvery,
        labelType, 
        color,
        halfCircleMode = false
    ) {
        const labelRadius = maxRadius + 20; // Position labels outside the grid
        const angleStep = (degrees * Math.PI / 180) / numRadials;
        
        for (let i = 0; i < numRadials; i++) {
            // Only label every Nth radial (always includes 0)
            if (i % labelEvery !== 0) continue;
            
            const angle = i * angleStep;
            const deg = (i * degrees / numRadials) % 360;
            
            // Apply half-circle labeling if enabled
            let labelValue = deg;
            if (halfCircleMode) {
                // For degrees >= 180, reset to 0-180 range
                labelValue = deg > 180 ? deg - 180 : deg;
            }
            
            const labelText = this._formatLabel(labelValue, labelType);
            
            const x = centerX + labelRadius * Math.cos(angle);
            const y = centerY + labelRadius * Math.sin(angle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('fill', color);
            text.textContent = labelText;
            g.appendChild(text);
        }
    }

    /**
     * Format label based on type (degrees or radians)
     * Radians use π notation, always expressed as fractions
     * @private
     */
    _formatLabel(degrees, labelType) {
        if (labelType === 'radians') {
            const radians = degrees * Math.PI / 180;
            const piMultiple = radians / Math.PI;
            
            // Special case for zero
            if (Math.abs(piMultiple) < 0.0001) return '0';
            
            // Convert to fraction
            const fraction = this._decimalToFraction(piMultiple);
            
            if (fraction.numerator === 0) return '0';
            if (fraction.numerator === fraction.denominator) return 'π';
            if (fraction.denominator === 1) return `${fraction.numerator}π`;
            
            // Format the fraction
            if (fraction.numerator === 1) {
                return `π/${fraction.denominator}`;
            } else {
                return `${fraction.numerator}π/${fraction.denominator}`;
            }
        }
        
        // Return degrees with degree symbol
        return degrees.toString() + '°';
    }

    /**
     * Convert a decimal to a simplified fraction
     * Uses a more reliable algorithm for accurate fraction representation
     * @private
     */
    _decimalToFraction(decimal, maxDenominator = 1000) {
        if (Math.abs(decimal) < 0.00001) return { numerator: 0, denominator: 1 };
        
        const sign = decimal < 0 ? -1 : 1;
        decimal = Math.abs(decimal);
        
        // Handle whole numbers
        if (Math.abs(decimal - Math.round(decimal)) < 0.00001) {
            return { numerator: sign * Math.round(decimal), denominator: 1 };
        }
        
        // Try all denominators up to maxDenominator and find the best match
        let bestNum = Math.round(decimal);
        let bestDen = 1;
        let bestError = Math.abs(decimal - bestNum);
        
        for (let den = 2; den <= maxDenominator; den++) {
            const num = Math.round(decimal * den);
            const error = Math.abs(decimal - num / den);
            
            if (error < bestError) {
                bestNum = num;
                bestDen = den;
                bestError = error;
                
                // If we found an exact match (or very close), use it
                if (error < 0.00001) {
                    break;
                }
            }
        }
        
        // Simplify by finding GCD
        const gcd = this._gcd(bestNum, bestDen);
        bestNum = Math.round(bestNum / gcd);
        bestDen = Math.round(bestDen / gcd);
        
        return { numerator: sign * bestNum, denominator: bestDen };
    }

    /**
     * Calculate Greatest Common Divisor
     * @private
     */
    _gcd(a, b) {
        a = Math.abs(Math.round(a));
        b = Math.abs(Math.round(b));
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    /**
     * Clear the polar grid from SVG
     * Useful before redrawing
     */
    clear() {
        const existing = this.svg.querySelector(`#${this.gridGroupId}`);
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Helper to create SVG elements
     * @private
     */
    _createSVGElement(tagName, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        for (const key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                element.setAttribute(key, attributes[key]);
            }
        }
        return element;
    }
}
