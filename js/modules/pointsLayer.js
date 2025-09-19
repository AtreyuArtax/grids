// pointsLayer.js
// Renders user-defined points as an overlay on top of the grid.

import { getTransform, ensureLayer } from './gridAPI.js';

export class PointsLayer {
  constructor() {
    this.points = []; // [{x: number, y: number, label?: string}]
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
    this.style = { ...this.style, ...partial };
    this.render();
  }

  addPoint(p) {
    const x = Number(p.x), y = Number(p.y);
    if (!isFinite(x) || !isFinite(y)) return false;
    this.points.push({ x, y, label: p.label || '' });
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

    // Draw points
    this.points.forEach(p => {
      const s = toSvg(p);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', s.x);
      c.setAttribute('cy', s.y);
      c.setAttribute('r', Math.max(1.5, this.style.dotSize));
      c.setAttribute('fill', this.style.dotColor);
      g.appendChild(c);

      if (this.style.showLabels && p.label) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', s.x + 6);
        t.setAttribute('y', s.y - 6);
        t.setAttribute('font-size', '12');
        t.setAttribute('fill', this.style.lineColor);
        t.textContent = p.label;
        g.appendChild(t);
      }
    });

    // Draw connecting polyline
    if (this.style.connect && this.points.length > 1) {
      const pts = this.points.map(p => toSvg(p)).map(s => `${s.x},${s.y}`).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', this.style.lineColor);
      poly.setAttribute('stroke-width', '2');
      g.appendChild(poly);
    }
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
