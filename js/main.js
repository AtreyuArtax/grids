// main.js
// This module handles overall application flow, UI interactions, and initializes other modules.

import { gridPresets } from './grid-presets.js';
import {
    handleEquationSubmit,
    resetEquationInputsAndButtons,
    renderEquationsList,
    toggleCustomLabelInput,
    equationSettings // Import equationSettings object
} from './equations.js';
import { calculateDynamicMargins, toggleXAxisSettings } from './labels.js';
import { drawGrid, downloadSVG, setPreviewEquation } from './plotter.js'; // Import setPreviewEquation
import { exportSVGtoPNG, exportSVGtoPDF } from './plotter.js';
import { debounce } from './utils.js';
import { PointsLayer } from './modules/pointsLayer.js';
import { PointsUI } from './modules/pointsUI.js';

// Create debounced versions of expensive operations
const debouncedCalculateAndDraw = debounce(() => {
    calculateDynamicMargins();
    drawGrid();
}, 150);

// Debounced function specifically for live equation preview to reduce redraw frequency
const debouncedSetPreviewEquation = debounce((eqData) => {
    setPreviewEquation(eqData);
}, 100); // A shorter debounce for a more "live" feel for equation input

/**
 * Safely gets an element by ID with error handling.
 * @param {string} id - The element ID.
 * @returns {Element|null} The element or null if not found.
 */
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID '${id}' not found`);
    }
    return element;
}

/**
 * Adds event listener with error handling.
 * @param {Element} element - The element to add listener to.
 * @param {string} event - The event type.
 * @param {Function} handler - The event handler.
 */
function safeAddEventListener(element, event, handler) {
    if (element && typeof handler === 'function') {
        element.addEventListener(event, handler);
    }
}

/**
 * Toggles the visibility of paper-style specific settings (e.g., Cartesian vs. Polar).
 */
function togglePaperStyleSettings() {
    const paperStyleElement = safeGetElement('paperStyle');
    const paperStyle = paperStyleElement ? paperStyleElement.value : 'grid';
    const polarControls = safeGetElement('polarControls');
    const cartesianAxisSettings = safeGetElement('cartesianAxisSettings');

    if (paperStyle === 'polar') {
        if (polarControls) polarControls.style.display = 'block';
        if (cartesianAxisSettings) cartesianAxisSettings.style.display = 'none';
    } else {
        if (polarControls) polarControls.style.display = 'none';
        if (cartesianAxisSettings) cartesianAxisSettings.style.display = 'block';
    }
}

/**
 * Applies a selected grid preset to the UI controls and redraws the grid.
 * @param {string} presetName - The name of the preset to apply.
 */
function applyPreset(presetName) {
    if (presetName === "custom") {
        calculateDynamicMargins(); // Recalculate all margins for custom changes
        drawGrid();
        return;
    }

    const preset = gridPresets[presetName];
    if (!preset) {
        console.warn(`Preset '${presetName}' not found`);
        return;
    }

    // Helper function to safely set element values
    const safeSetValue = (id, value) => {
        const element = safeGetElement(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    };

    // Apply preset values
    safeSetValue('squareSizeInput', preset.squareSizeInput);
    safeSetValue('yMin', preset.yMin);
    safeSetValue('yMax', preset.yMax);
    safeSetValue('yIncrement', preset.yIncrement);
    safeSetValue('yLabelEvery', preset.yLabelEvery);
    safeSetValue('yAxisLabel', preset.yAxisLabel);
    safeSetValue('yLabelOnZero', preset.yLabelOnZero);
    safeSetValue('yAxisLabelOnTop', preset.yAxisLabelOnTop);

    // X-Axis specific settings
    safeSetValue('xAxisLabelType', preset.xAxisLabelType);
    toggleXAxisSettings(); // Update visibility based on type

    if (preset.xAxisLabelType === 'numbers' || preset.xAxisLabelType === 'degrees') {
        safeSetValue('xMin', preset.xMin);
        safeSetValue('xMax', preset.xMax);
        safeSetValue('xIncrement', preset.xIncrement);
    } else { // radians
        safeSetValue('xMinRadians', preset.xMinRadians);
        safeSetValue('xMaxRadians', preset.xMaxRadians);
        safeSetValue('radianStepMultiplier', preset.radianStepMultiplier);
        safeSetValue('xGridUnitsPerRadianStep', preset.xGridUnitsPerRadianStep);
    }

    safeSetValue('xLabelEvery', preset.xLabelEvery);
    safeSetValue('xAxisLabel', preset.xAxisLabel);
    safeSetValue('xLabelOnZero', preset.xLabelOnZero);
    safeSetValue('xAxisLabelOnRight', preset.xAxisLabelOnRight);

    // Global options
    safeSetValue('suppressZeroLabel', preset.suppressZeroLabel);
    safeSetValue('showAxisArrows', preset.showAxisArrows);

    // Set grid line colours
    if (preset.minorGridColor) safeSetValue('minorGridColor', preset.minorGridColor);
    if (preset.majorGridColor) safeSetValue('majorGridColor', preset.majorGridColor);
    if (preset.equationColor) safeSetValue('equationColor', preset.equationColor);

    // Line arrows and axes
    safeSetValue('showLineArrows', preset.showLineArrows);
    equationSettings.lastShowLineArrowsValue = preset.showLineArrows;
    safeSetValue('showAxes', preset.showAxes);

    // Paper style and polar settings
    if (preset.paperStyle) safeSetValue('paperStyle', preset.paperStyle);
    if (preset.polarNumCircles !== undefined) safeSetValue('polarNumCircles', preset.polarNumCircles);
    if (preset.polarNumRadials !== undefined) safeSetValue('polarNumRadials', preset.polarNumRadials);
    if (preset.polarDegrees !== undefined) safeSetValue('polarDegrees', preset.polarDegrees);
    
    togglePaperStyleSettings();
    calculateDynamicMargins();
    drawGrid();
}

/**
 * Sets up color swatch functionality.
 */
function setupColorSwatches() {
    document.querySelectorAll('.color-input-wrapper').forEach(wrapper => {
        const colorInput = wrapper.querySelector('input[type="color"]');
        if (!colorInput) return;
        
        wrapper.querySelectorAll('.color-swatch').forEach(swatch => {
            safeAddEventListener(swatch, 'click', function(e) {
                const color = this.getAttribute('data-color');
                if (color) {
                    colorInput.value = color;
                    // Trigger input event so any listeners update
                    colorInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                e.preventDefault();
            });
        });
    });
}

/**
 * Sets up universal input listeners for grid updates.
 */
function setupInputListeners() {
    const inputs = document.querySelectorAll(
        '.controls-group input[type="number"], ' +
        '.controls-group input[type="text"], ' +
        '.controls-group input[type="color"], ' +
        '.controls-group input[type="checkbox"]:not(#showLineArrows), ' +
        '#equationLineStyle, ' +
        '#inequalityType'
    );
    
    inputs.forEach(input => {
        safeAddEventListener(input, 'input', () => {
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            debouncedCalculateAndDraw();
        });
        
        safeAddEventListener(input, 'change', () => {
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            debouncedCalculateAndDraw();
        });
    });
}

/**
 * Sets up collapsible fieldsets.
 */
function setupCollapsibleFieldsets() {
    const collapsibleFieldsets = document.querySelectorAll('.controls-card fieldset.collapsible');
    collapsibleFieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        // Exclude the 'Grid Presets' fieldset from collapsing behavior
        if (legend && fieldset.id !== 'gridPresetsFieldset') {
            safeAddEventListener(legend, 'click', () => {
                fieldset.classList.toggle('collapsed');
            });
        }
    });
}

/**
 * Sets up polar input listeners.
 */
function setupPolarListeners() {
    ['polarNumCircles', 'polarNumRadials', 'polarDegrees'].forEach(id => {
        const element = safeGetElement(id);
        if (element) {
            safeAddEventListener(element, 'input', () => {
                const gridPresetSelect = safeGetElement('gridPreset');
                if (gridPresetSelect) gridPresetSelect.value = 'custom';
                drawGrid();
            });
        }
    });
}

/**
 * Initializes default fieldset states.
 */
function initializeFieldsetStates() {
    // Ensure 'Grid Presets' is not collapsed on load
    const gridPresetsFieldset = safeGetElement('gridPresetsFieldset');
    if (gridPresetsFieldset) {
        gridPresetsFieldset.classList.remove('collapsed');
    }
    
    // Collapse other fieldsets by default
    const fieldsetsToCollapse = [
        'generalSettings',
        'yAxisSettings', 
        'xAxisSettings',
        'equationPlotting',
        'pointsSection'
    ];
    
    fieldsetsToCollapse.forEach(id => {
        const fieldset = safeGetElement(id);
        if (fieldset) fieldset.classList.add('collapsed');
    });
}

/**
 * Handles the live preview of the equation as the user types.
 */
function setupEquationLivePreview() {
    const equationInput = safeGetElement('equationInput');
    const equationColorInput = safeGetElement('equationColor');
    const equationLineStyleSelect = safeGetElement('equationLineStyle');
    const inequalityTypeSelect = safeGetElement('inequalityType');
    const domainStartInput = safeGetElement('domainStart');
    const domainEndInput = safeGetElement('domainEnd');

    if (equationInput) {
        safeAddEventListener(equationInput, 'input', () => {
            const rawExpression = equationInput.value;
            const color = equationColorInput ? equationColorInput.value : '#000000'; // Default color
            const lineStyle = equationLineStyleSelect ? equationLineStyleSelect.value : 'solid';
            const inequalityType = inequalityTypeSelect ? inequalityTypeSelect.value : '=';

            const domainStart = domainStartInput && domainStartInput.value !== '' ? parseFloat(domainStartInput.value) : null;
            const domainEnd = domainEndInput && domainEndInput.value !== '' ? parseFloat(domainEndInput.value) : null;

            debouncedSetPreviewEquation({
                rawExpression,
                color,
                lineStyle,
                inequalityType,
                domainStart,
                domainEnd
            });
        });

        // Also trigger preview when other equation settings change
        [equationColorInput, equationLineStyleSelect, inequalityTypeSelect, domainStartInput, domainEndInput].forEach(element => {
            if (element) {
                safeAddEventListener(element, 'change', () => {
                     // Trigger the equation input's 'input' event to refresh preview
                    equationInput.dispatchEvent(new Event('input', { bubbles: true }));
                });
            }
        });
    }
}


// Override handleEquationSubmit and resetEquationInputsAndButtons to clear preview
const originalHandleEquationSubmit = handleEquationSubmit;
Object.defineProperty(window, 'handleEquationSubmit', { // Use window.handleEquationSubmit if it's global
    value: async function(...args) {
        await originalHandleEquationSubmit.apply(this, args);
        setPreviewEquation(null); // Clear preview after submission
    },
    writable: true
});

const originalResetEquationInputsAndButtons = resetEquationInputsAndButtons;
Object.defineProperty(window, 'resetEquationInputsAndButtons', {
    value: function(...args) {
        originalResetEquationInputsAndButtons.apply(this, args);
        setPreviewEquation(null);
        // Restore the last used value for "Show arrows"
        const showLineArrowsCheckbox = safeGetElement('showLineArrows');
        if (showLineArrowsCheckbox && equationSettings.lastShowLineArrowsValue !== undefined) {
            showLineArrowsCheckbox.checked = equationSettings.lastShowLineArrowsValue;
        }
    },
    writable: true
});

// Event listeners for the DOMContentLoaded event to initialize the application.
document.addEventListener('DOMContentLoaded', () => {
    try {
    // Points overlay modules
    const pointsLayer = new PointsLayer();
    new PointsUI(pointsLayer);

        // Calculate Net Area button
        const calculateNetAreaBtn = safeGetElement('calculateNetAreaBtn');
        const netAreaResult = safeGetElement('netAreaResult');
        if (calculateNetAreaBtn && netAreaResult) {
            safeAddEventListener(calculateNetAreaBtn, 'click', () => {
                const netArea = pointsLayer.getNetArea();
                netAreaResult.textContent = `Net Area: ${netArea.toFixed(3)}`;
            });
        }
        // Export button listeners
        safeAddEventListener(safeGetElement('downloadSVG'), 'click', downloadSVG);
        safeAddEventListener(safeGetElement('exportPNG'), 'click', exportSVGtoPNG);
        safeAddEventListener(safeGetElement('exportPDF'), 'click', () => exportSVGtoPDF());

        // Setup color swatches
        setupColorSwatches();

        // Setup input listeners
        setupInputListeners();

        // Show Axis Arrows checkbox
        const showAxisArrowsCheckbox = safeGetElement('showAxisArrows');
        safeAddEventListener(showAxisArrowsCheckbox, 'change', () => {
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            calculateDynamicMargins();
            drawGrid();
        });

        // Grid preset dropdown
        const gridPresetSelect = safeGetElement('gridPreset');
        safeAddEventListener(gridPresetSelect, 'change', (event) => {
            applyPreset(event.target.value);
        });

        // X-axis label type dropdown
        const xAxisLabelTypeSelect = safeGetElement('xAxisLabelType');
        safeAddEventListener(xAxisLabelTypeSelect, 'change', () => {
            toggleXAxisSettings();
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            calculateDynamicMargins();
            drawGrid();
        });

        // Equation plotting controls
        // Removed direct listeners for equation submission here as they are handled by setupEquationLivePreview
        // and the overrides above.
        // It's assumed that handleEquationSubmit and resetEquationInputsAndButtons are either imported
        // and attached elsewhere, or expected to be global functions.
        // The original listeners are re-added here, but their behavior is now wrapped.
        safeAddEventListener(safeGetElement('addOrUpdateEquationButton'), 'click', handleEquationSubmit);
        safeAddEventListener(safeGetElement('cancelEditButton'), 'click', resetEquationInputsAndButtons);

        safeAddEventListener(safeGetElement('equationLabelType'), 'change', toggleCustomLabelInput);

        // Paper Style dropdown
        const paperStyleSelect = safeGetElement('paperStyle');
        safeAddEventListener(paperStyleSelect, 'change', () => {
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            togglePaperStyleSettings();
            drawGrid();
        });

        // Setup polar listeners
        setupPolarListeners();

        // Setup collapsible fieldsets
        setupCollapsibleFieldsets();

        // Show axes checkbox
        const showAxesCheckbox = safeGetElement('showAxes');
        safeAddEventListener(showAxesCheckbox, 'change', () => {
            const gridPresetSelect = safeGetElement('gridPreset');
            if (gridPresetSelect) gridPresetSelect.value = 'custom';
            drawGrid();
        });

        // Track the last state of the "Show arrows for this equation" checkbox
        const showLineArrowsCheckbox = safeGetElement('showLineArrows');
        if (showLineArrowsCheckbox) {
            safeAddEventListener(showLineArrowsCheckbox, 'change', () => {
                equationSettings.lastShowLineArrowsValue = showLineArrowsCheckbox.checked;
            });
        }

        // Initialize fieldset states
        initializeFieldsetStates();

        // Setup equation live preview
        setupEquationLivePreview();

        // Initial setup calls
        toggleXAxisSettings();
        toggleCustomLabelInput();
        togglePaperStyleSettings();
        calculateDynamicMargins();
        
        // Apply initial preset
        const initialPreset = gridPresetSelect ? gridPresetSelect.value : 'negativeAndPositive';
        applyPreset(initialPreset);
        
        renderEquationsList();
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
