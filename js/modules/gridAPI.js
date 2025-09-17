// gridAPI.js
// Central API for overlays to track the current grid transform and attach their own SVG layers.

let currentTransform = null; // {xMin, xMax, yMin, yMax, plotX, plotY, plotWidth, plotHeight, squareSizePx}

// Simple pub/sub using DOM events
const BUS_EVENT = 'grid:updated';

export function setTransform(transform) {
  currentTransform = transform ? { ...transform } : null;
  // Notify listeners (points layer, etc.)
  document.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: currentTransform }));
}

export function getTransform() {
  return currentTransform ? { ...currentTransform } : null;
}

export function ensureLayer(id) {
  const svg = document.getElementById('gridSVG');
  if (!svg) return null;
  let g = svg.querySelector(`g#${id}`);
  if (!g) {
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', id);
    svg.appendChild(g);
  }
  return g;
}
