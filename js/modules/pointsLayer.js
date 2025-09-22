// pointsLayer.js
// Renders user-defined points as an overlay on top of the grid.

import { getTransform, ensureLayer } from './gridAPI.js';

export class PointsLayer {
  constructor() {
    this.points = []; // [{x: number, y: number, label?: string, labelOffset?: {x: number, y: number}, curveIntensity?: number}]
    this.style = {
      dotColor: '#000000',
      lineColor: '#000000',
      dotSize: 5,
      connect: true,
      showLabels: false,
      fillArea: false,
      areaPositiveColor: '#90EE90',
      areaNegativeColor: '#FFB6C1',
    };

    // Re-render when the grid transform changes
    document.addEventListener('grid:updated', () => this.render());
  }

    /**
     * Calculates the net area under the plot (sum of positive and negative areas).
     * Returns area in grid units (not pixels).
     */
    getNetArea() {
      if (this.points.length < 2) return 0;
      // Use same logic as renderAreaFill, but sum areas
      // Assume grid is Cartesian and points are sorted by x
      const sortedPoints = [...this.points].sort((a, b) => a.x - b.x);
      let netArea = 0;
      for (let i = 1; i < sortedPoints.length; i++) {
        const x0 = sortedPoints[i - 1].x;
        const y0 = sortedPoints[i - 1].y;
        const x1 = sortedPoints[i].x;
        const y1 = sortedPoints[i].y;
        // Trapezoid area between two points and x-axis
        // Area = (x1 - x0) * (y0 + y1) / 2
        netArea += (x1 - x0) * (y0 + y1) / 2;
      }
      return netArea;
    }

    /**
     * Calculates the total area under the plot (sum of absolute values of all areas).
     * This represents the total distance traveled, treating all areas as positive.
     * Returns area in grid units (not pixels).
     */
    getTotalArea() {
      if (this.points.length < 2) return 0;
      const sortedPoints = [...this.points].sort((a, b) => a.x - b.x);
      let totalArea = 0;
      
      for (let i = 1; i < sortedPoints.length; i++) {
        const x0 = sortedPoints[i - 1].x;
        const y0 = sortedPoints[i - 1].y;
        const x1 = sortedPoints[i].x;
        const y1 = sortedPoints[i].y;
        
        // Check if the line segment crosses the x-axis (y = 0)
        if ((y0 >= 0 && y1 >= 0) || (y0 <= 0 && y1 <= 0)) {
          // Line segment doesn't cross x-axis, calculate area normally and take absolute value
          const area = (x1 - x0) * (y0 + y1) / 2;
          totalArea += Math.abs(area);
        } else {
          // Line segment crosses x-axis, need to split at crossing point
          // Find x-coordinate where line crosses y = 0
          // Using linear interpolation: x_cross = x0 + (x1 - x0) * (-y0) / (y1 - y0)
          const xCross = x0 + (x1 - x0) * (-y0) / (y1 - y0);
          
          // Calculate area of first part (from x0 to xCross)
          const area1 = (xCross - x0) * y0 / 2; // Triangle from x0 to crossing point
          totalArea += Math.abs(area1);
          
          // Calculate area of second part (from xCross to x1)
          const area2 = (x1 - xCross) * y1 / 2; // Triangle from crossing point to x1
          totalArea += Math.abs(area2);
        }
      }
      return totalArea;
    }

  setStyle(partial) {
    const oldShowLabels = this.style.showLabels;
    this.style = { ...this.style, ...partial };
    
    // If labels were toggled, force a complete recalculation
    if (oldShowLabels !== this.style.showLabels && this.style.showLabels) {
      // Small delay to ensure complete re-render with fresh positioning
      setTimeout(() => this.render(), 0);
    }
    
    this.render();
  }

  addPoint(p) {
    const x = Number(p.x), y = Number(p.y);
    if (!isFinite(x) || !isFinite(y)) return false;
    this.points.push({ 
      x, 
      y, 
      label: p.label || '',
      curveIntensity: p.curveIntensity !== undefined ? Number(p.curveIntensity) : 0
    });
    this.render();
    return true;
  }

  removePoint(index) {
    if (index >= 0 && index < this.points.length) {
      this.points.splice(index, 1);
      this.render();
    }
  }

  clear() {
    this.points = [];
    this.render();
  }

  /**
   * Reset all custom label offsets to use automatic positioning
   */
  resetLabelPositions() {
    this.points.forEach(point => {
      delete point.labelOffset;
    });
    this.render();
  }

  /**
   * Calculate the final slope at the end of a quadratic Bézier curve
   * @param {Object} point1 - Starting point {x, y}
   * @param {Object} point2 - Ending point {x, y, curveIntensity}
   * @returns {number} - Final slope at point2
   */
  calculateFinalSlope(point1, point2) {
    if (point1.curveIntensity === 0) {
      // Linear connection - constant slope
      return (point2.y - point1.y) / (point2.x - point1.x);
    }
    
    const initialSlope = (point2.y - point1.y) / (point2.x - point1.x);
    return 2 * point1.curveIntensity - initialSlope;
  }

  /**
   * Get suggested next point position to continue slope from previous curve
   * @param {Object} lastPoint - The last point in the sequence
   * @param {number} nextX - X coordinate for next point
   * @returns {Object} - Suggested point {x, y, suggested: true}
   */
  getSuggestedNextPoint(lastPoint, nextX) {
    if (this.points.length < 2) return null;
    
    const prevPoint = this.points[this.points.length - 2];
    const finalSlope = this.calculateFinalSlope(prevPoint, lastPoint);
    
    return {
      x: nextX,
      y: lastPoint.y + finalSlope * (nextX - lastPoint.x),
      suggested: true
    };
  }

  /**
   * Generate quadratic Bézier curve points between two points
   * @param {Object} point1 - Starting point {x, y, curveIntensity}
   * @param {Object} point2 - Ending point {x, y}
   * @param {Function} toSvg - Function to convert grid coordinates to SVG
   * @returns {Array} - Array of SVG coordinate points for smooth curve
   */
  generateBezierCurve(point1, point2, toSvg) {
    if (point1.curveIntensity === 0) {
      // Linear connection - just return start and end points
      return [toSvg(point1), toSvg(point2)];
    }

    const numSteps = 30; // More steps for smoother Bézier curves
    const segments = [];
    
    // Calculate control point for quadratic Bézier curve
    // The control point determines the curvature based on curve intensity
    const midX = (point1.x + point2.x) / 2;
    const midY = (point1.y + point2.y) / 2;
    
    // Adjust control point to achieve desired curve intensity
    const deltaX = point2.x - point1.x;
    const controlX = midX;
    const controlY = midY + (point1.curveIntensity * deltaX) / 4;
    
    const controlPoint = { x: controlX, y: controlY };
    
    // Generate quadratic Bézier curve points
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      
      // Quadratic Bézier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      const x = (1 - t) * (1 - t) * point1.x + 
                2 * (1 - t) * t * controlPoint.x + 
                t * t * point2.x;
      const y = (1 - t) * (1 - t) * point1.y + 
                2 * (1 - t) * t * controlPoint.y + 
                t * t * point2.y;
      
      const svgPt = toSvg({ x, y });
      segments.push(svgPt);
    }
    
    return segments;
  }

  render() {
    const g = ensureLayer('pointsOverlay');
    if (!g) return;
    // Clear existing
    while (g.firstChild) g.removeChild(g.firstChild);

    const tr = getTransform();
    if (!tr || this.points.length === 0) return; // Not in Cartesian mode or no points

    const toSvg = (pt) => {
      const { xMin, yMin, yMax, plotX, plotY, plotHeight, squareSizePx, xValuePerMinorSquare, yIncrement } = tr;
      const xPx = plotX + (pt.x - xMin) / xValuePerMinorSquare * squareSizePx;
      const yPx = plotY + plotHeight - ((pt.y - yMin) / yIncrement) * squareSizePx;
      return { x: xPx, y: yPx };
    };

    // Calculate zero line y position
    const zeroY = (() => {
      const { yMin, plotY, plotHeight, squareSizePx, yIncrement } = tr;
      return plotY + plotHeight - ((0 - yMin) / yIncrement) * squareSizePx;
    })();

    // Draw area fill if enabled and points are connected
    if (this.style.fillArea && this.style.connect && this.points.length > 1) {
      this.renderAreaFill(toSvg, zeroY, g);
    }

    // Draw points and collect label positions to avoid overlaps
    const usedLabelPositions = [];
    this.points.forEach((p, index) => {
      const s = toSvg(p);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', s.x);
      c.setAttribute('cy', s.y);
      c.setAttribute('r', Math.max(1.5, this.style.dotSize));
      c.setAttribute('fill', this.style.dotColor);
      g.appendChild(c);

      if (this.style.showLabels && p.label) {
        const labelPos = this.getSmartLabelPosition(p, s, toSvg, this.points, usedLabelPositions);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', labelPos.x);
        t.setAttribute('y', labelPos.y);
        t.setAttribute('font-size', '12');
        t.setAttribute('fill', this.style.lineColor);
        t.setAttribute('cursor', 'move');
        t.setAttribute('data-point-index', index);
        t.textContent = p.label;
        
        // Add drag functionality
        this.makeLabelDraggable(t, index, s);
        
        g.appendChild(t);
        
        // Track this label position to avoid future overlaps
        const labelWidth = p.label.length * 12 * 0.6;
        const labelHeight = 12;
        usedLabelPositions.push({
          left: labelPos.x,
          right: labelPos.x + labelWidth,
          top: labelPos.y - labelHeight,
          bottom: labelPos.y
        });
      }
    });

    // Draw connecting lines/curves
    if (this.style.connect && this.points.length > 1) {
      // Check if any points (except the last) have curve intensity > 0
      const hasCurves = this.points.slice(0, -1).some(p => p.curveIntensity !== 0);
      
      if (hasCurves) {
        // Use Bézier curves for smooth motion
        const allCurvePoints = [];
        
        for (let i = 0; i < this.points.length - 1; i++) {
          const point1 = this.points[i];
          const point2 = this.points[i + 1];
          
          const curveSegment = this.generateBezierCurve(point1, point2, toSvg);
          
          // Add points to the overall path, avoiding duplicates
          if (i === 0) {
            allCurvePoints.push(...curveSegment);
          } else {
            // Skip first point to avoid duplicates
            allCurvePoints.push(...curveSegment.slice(1));
          }
        }
        
        // Create smooth path using SVG path element
        if (allCurvePoints.length > 0) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const pathData = allCurvePoints.map((pt, i) => 
            `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
          ).join(' ');
          
          path.setAttribute('d', pathData);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', this.style.lineColor);
          path.setAttribute('stroke-width', '2');
          g.appendChild(path);
        }
      } else {
        // Use simple polyline for all linear connections
        const pts = this.points.map(p => toSvg(p)).map(s => `${s.x},${s.y}`).join(' ');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        poly.setAttribute('points', pts);
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', this.style.lineColor);
        poly.setAttribute('stroke-width', '2');
        g.appendChild(poly);
      }
    }
  }

  /**
   * Returns smart label position that avoids overlapping with line segments
   * @param {Object} point - The point object {x, y, label}
   * @param {Object} svgPos - The SVG coordinates {x, y} of the point
   * @param {Function} toSvg - Function to convert grid coordinates to SVG
   * @param {Array} allPoints - All points in the layer for line segment calculation
   * @param {Array} usedLabelPositions - Previously placed label bounding boxes
   * @returns {Object} - Best label position {x, y}
   */
  getSmartLabelPosition(point, svgPos, toSvg, allPoints, usedLabelPositions = []) {
    // If the point has a custom label offset, use it
    if (point.labelOffset) {
      return {
        x: svgPos.x + point.labelOffset.x,
        y: svgPos.y + point.labelOffset.y
      };
    }

    const labelText = point.label;
    const fontSize = 12;
    const padding = 4;
    
    // Estimate label dimensions (rough approximation)
    const labelWidth = labelText.length * fontSize * 0.6;
    const labelHeight = fontSize;

    // Define potential label positions around the point
    // Closer distances for better association with points
    const offset = 6;
    const candidatePositions = [
      { x: svgPos.x + offset, y: svgPos.y - offset, name: 'top-right' },      // Default: top-right
      { x: svgPos.x - labelWidth - offset, y: svgPos.y - offset, name: 'top-left' },
      { x: svgPos.x + offset, y: svgPos.y + labelHeight + offset, name: 'bottom-right' },
      { x: svgPos.x - labelWidth - offset, y: svgPos.y + labelHeight + offset, name: 'bottom-left' },
      { x: svgPos.x - labelWidth / 2, y: svgPos.y - labelHeight - offset, name: 'top-center' },
      { x: svgPos.x - labelWidth / 2, y: svgPos.y + labelHeight + offset, name: 'bottom-center' },
      { x: svgPos.x + offset, y: svgPos.y + labelHeight / 2, name: 'middle-right' },
      { x: svgPos.x - labelWidth - offset, y: svgPos.y + labelHeight / 2, name: 'middle-left' }
    ];

    // Score each position based on collision avoidance
    let bestPosition = candidatePositions[0]; // fallback to top-right
    let bestScore = -Infinity;

    for (const pos of candidatePositions) {
      const score = this.scoreLabelPosition(pos, labelWidth, labelHeight, svgPos, toSvg, allPoints, usedLabelPositions);
      if (score > bestScore) {
        bestScore = score;
        bestPosition = pos;
      }
    }

    return bestPosition;
  }

  /**
   * Scores a label position based on collision avoidance and preference
   * @param {Object} labelPos - Label position {x, y}
   * @param {number} labelWidth - Estimated label width
   * @param {number} labelHeight - Label height
   * @param {Object} pointSvgPos - Point's SVG position
   * @param {Function} toSvg - Coordinate conversion function
   * @param {Array} allPoints - All points for line segment calculation
   * @param {Array} usedLabelPositions - Previously placed label bounding boxes
   * @returns {number} - Score (higher is better)
   */
  scoreLabelPosition(labelPos, labelWidth, labelHeight, pointSvgPos, toSvg, allPoints, usedLabelPositions = []) {
    let score = 100; // Base score

    // Preference scoring (top-right is preferred)
    const preferences = {
      'top-right': 20,
      'top-left': 15,
      'bottom-right': 10,
      'bottom-left': 5,
      'top-center': 8,
      'bottom-center': 3,
      'middle-right': 12,
      'middle-left': 7
    };
    score += preferences[labelPos.name] || 0;

    // Create label bounding box
    const labelBox = {
      left: labelPos.x,
      right: labelPos.x + labelWidth,
      top: labelPos.y - labelHeight,
      bottom: labelPos.y
    };

    // Check collisions with line segments
    if (this.style.connect && allPoints.length > 1) {
      const lineSegments = this.getLineSegments(allPoints, toSvg);
      
      for (const segment of lineSegments) {
        if (this.labelIntersectsLineSegment(labelBox, segment)) {
          score -= 50; // Heavy penalty for line collision
        }
        
        // Additional penalty for being too close to lines
        const distance = this.distanceToLineSegment(labelPos, segment);
        if (distance < 12) {
          score -= (12 - distance) * 1.5; // Reduced penalty for closer placement
        }
      }
    }

    // Check collisions with existing labels
    for (const existingLabel of usedLabelPositions) {
      if (this.boxesOverlap(labelBox, existingLabel)) {
        score -= 40; // Heavy penalty for label overlap
      }
      
      // Additional penalty for being too close to other labels
      const distance = this.distanceBetweenBoxes(labelBox, existingLabel);
      if (distance < 8) {
        score -= (8 - distance) * 3;
      }
    }

    // Penalty for being too close to the point itself
    const distanceFromPoint = Math.sqrt(
      Math.pow(labelPos.x - pointSvgPos.x, 2) + 
      Math.pow(labelPos.y - pointSvgPos.y, 2)
    );
    if (distanceFromPoint < 10) {
      score -= (10 - distanceFromPoint) * 3;
    }

    return score;
  }

  /**
   * Gets all line segments between connected points
   * @param {Array} points - Array of points
   * @param {Function} toSvg - Coordinate conversion function
   * @returns {Array} - Array of line segments {x1, y1, x2, y2}
   */
  getLineSegments(points, toSvg) {
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = toSvg(points[i]);
      const p2 = toSvg(points[i + 1]);
      segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    return segments;
  }

  /**
   * Checks if a label bounding box intersects with a line segment
   * @param {Object} labelBox - {left, right, top, bottom}
   * @param {Object} line - {x1, y1, x2, y2}
   * @returns {boolean} - True if intersection exists
   */
  labelIntersectsLineSegment(labelBox, line) {
    // First check if either endpoint is inside the label box
    if (this.pointInBox({ x: line.x1, y: line.y1 }, labelBox) || 
        this.pointInBox({ x: line.x2, y: line.y2 }, labelBox)) {
      return true;
    }

    // Check if line segment intersects with any edge of the label box
    const boxEdges = [
      { x1: labelBox.left, y1: labelBox.top, x2: labelBox.right, y2: labelBox.top },    // top edge
      { x1: labelBox.right, y1: labelBox.top, x2: labelBox.right, y2: labelBox.bottom }, // right edge
      { x1: labelBox.right, y1: labelBox.bottom, x2: labelBox.left, y2: labelBox.bottom }, // bottom edge
      { x1: labelBox.left, y1: labelBox.bottom, x2: labelBox.left, y2: labelBox.top }  // left edge
    ];

    for (const edge of boxEdges) {
      if (this.lineSegmentsIntersect(line, edge)) {
        return true;
      }
    }

    // Additional check: does the line pass through the box center area?
    // This helps catch cases where line passes very close to the box
    const centerX = (labelBox.left + labelBox.right) / 2;
    const centerY = (labelBox.top + labelBox.bottom) / 2;
    const distanceToCenter = this.distanceToLineSegment({ x: centerX, y: centerY }, line);
    
    // If line passes very close to center, consider it an intersection
    const minBoxDimension = Math.min(labelBox.right - labelBox.left, labelBox.bottom - labelBox.top);
    return distanceToCenter < minBoxDimension * 0.3;
  }

  /**
   * Checks if two line segments intersect
   * @param {Object} line1 - {x1, y1, x2, y2}
   * @param {Object} line2 - {x1, y1, x2, y2}
   * @returns {boolean} - True if lines intersect
   */
  lineSegmentsIntersect(line1, line2) {
    const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denominator) < 1e-10) return false; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /**
   * Checks if a point is inside a bounding box
   * @param {Object} point - {x, y}
   * @param {Object} box - {left, right, top, bottom}
   * @returns {boolean} - True if point is inside box
   */
  pointInBox(point, box) {
    return point.x >= box.left && point.x <= box.right && 
           point.y >= box.top && point.y <= box.bottom;
  }

  /**
   * Calculates the minimum distance from a point to a line segment
   * @param {Object} point - {x, y}
   * @param {Object} line - {x1, y1, x2, y2}
   * @returns {number} - Distance to line segment
   */
  distanceToLineSegment(point, line) {
    const { x1, y1, x2, y2 } = line;
    const { x, y } = point;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is a point
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Makes a label element draggable
   * @param {SVGTextElement} labelElement - The label text element
   * @param {number} pointIndex - Index of the point this label belongs to
   * @param {Object} pointSvgPos - SVG position of the point
   */
  makeLabelDraggable(labelElement, pointIndex, pointSvgPos) {
    let isDragging = false;
    let startX, startY, startLabelX, startLabelY;

    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      
      const rect = labelElement.getBoundingClientRect();
      const svg = labelElement.closest('svg');
      const svgRect = svg.getBoundingClientRect();
      
      startX = e.clientX;
      startY = e.clientY;
      startLabelX = parseFloat(labelElement.getAttribute('x'));
      startLabelY = parseFloat(labelElement.getAttribute('y'));
      
      labelElement.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newX = startLabelX + dx;
      const newY = startLabelY + dy;
      
      labelElement.setAttribute('x', newX);
      labelElement.setAttribute('y', newY);
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const finalX = parseFloat(labelElement.getAttribute('x'));
      const finalY = parseFloat(labelElement.getAttribute('y'));
      
      // Calculate offset from the point's position
      const offsetX = finalX - pointSvgPos.x;
      const offsetY = finalY - pointSvgPos.y;
      
      // Store the custom offset in the point data
      this.points[pointIndex].labelOffset = { x: offsetX, y: offsetY };
      
      labelElement.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Fire event to notify of change
      document.dispatchEvent(new CustomEvent('points:updated'));
    };

    labelElement.addEventListener('mousedown', onMouseDown);
  }

  /**
   * Checks if two bounding boxes overlap
   * @param {Object} box1 - {left, right, top, bottom}
   * @param {Object} box2 - {left, right, top, bottom}
   * @returns {boolean} - True if boxes overlap
   */
  boxesOverlap(box1, box2) {
    return !(box1.right < box2.left || 
             box2.right < box1.left || 
             box1.bottom < box2.top || 
             box2.bottom < box1.top);
  }

  /**
   * Calculates the minimum distance between two bounding boxes
   * @param {Object} box1 - {left, right, top, bottom}
   * @param {Object} box2 - {left, right, top, bottom}
   * @returns {number} - Distance between boxes (0 if overlapping)
   */
  distanceBetweenBoxes(box1, box2) {
    if (this.boxesOverlap(box1, box2)) {
      return 0;
    }

    const dx = Math.max(0, Math.max(box1.left - box2.right, box2.left - box1.right));
    const dy = Math.max(0, Math.max(box1.top - box2.bottom, box2.top - box1.bottom));
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  renderAreaFill(toSvg, zeroY, g) {
    if (this.points.length < 2) return;

    // Sort points by x-coordinate to ensure proper area calculation
    const sortedPoints = [...this.points].sort((a, b) => a.x - b.x);
    const svgPoints = sortedPoints.map(p => ({ ...toSvg(p), originalY: p.y }));

    // Split points into segments that cross the zero line
    const segments = this.splitPointsAtZeroCrossings(svgPoints, zeroY);

    segments.forEach((segment, segIdx) => {
      if (segment.length < 2) return;

      // Find the first non-zero y value in the segment
      let sign = 0;
      for (let i = 0; i < segment.length; i++) {
        if (segment[i].originalY !== 0) {
          sign = segment[i].originalY > 0 ? 1 : -1;
          break;
        }
      }
      // If all y are zero, try to use the next point outside the segment
      if (sign === 0) {
        // Try to get the next point from the next segment
        let nextY = null;
        if (segments[segIdx + 1] && segments[segIdx + 1][1]) {
          nextY = segments[segIdx + 1][1].originalY;
        }
        if (nextY !== null && nextY !== 0) {
          sign = nextY > 0 ? 1 : -1;
        } else {
          // Fallback to positive
          sign = 1;
        }
      }
      const color = sign > 0 ? this.style.areaPositiveColor : this.style.areaNegativeColor;

      // Create path for area fill
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      let pathData = `M ${segment[0].x},${zeroY}`;
      segment.forEach(point => {
        pathData += ` L ${point.x},${point.y}`;
      });
      pathData += ` L ${segment[segment.length - 1].x},${zeroY} Z`;

      path.setAttribute('d', pathData);
      path.setAttribute('fill', color);
      path.setAttribute('fill-opacity', '0.3');
      path.setAttribute('stroke', 'none');

      g.appendChild(path);
    });
  }

  splitPointsAtZeroCrossings(svgPoints, zeroY) {
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < svgPoints.length; i++) {
      const point = svgPoints[i];
      currentSegment.push(point);

      // Check if we cross zero line to next point
      if (i < svgPoints.length - 1) {
        const nextPoint = svgPoints[i + 1];
        const currentAboveZero = point.originalY >= 0;
        const nextAboveZero = nextPoint.originalY >= 0;

        if (currentAboveZero !== nextAboveZero) {
          // We're crossing the zero line
          // Calculate intersection point
          const intersectionX = this.interpolateX(point, nextPoint, zeroY);
          const intersectionPoint = { x: intersectionX, y: zeroY, originalY: 0 };
          
          currentSegment.push(intersectionPoint);
          segments.push([...currentSegment]);
          currentSegment = [intersectionPoint];
        }
      }
    }

    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }

    return segments;
  }

  interpolateX(point1, point2, targetY) {
    // Linear interpolation to find x coordinate where line crosses targetY
    const ratio = (targetY - point1.y) / (point2.y - point1.y);
    return point1.x + ratio * (point2.x - point1.x);
  }
}
