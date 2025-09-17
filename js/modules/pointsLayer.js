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
    };

    // Re-render when the grid transform changes
    document.addEventListener('grid:updated', () => this.render());
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
}
