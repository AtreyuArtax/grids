// main.js
// This module handles overall application flow, UI interactions, and initializes other modules.

import { gridPresets } from './grid-presets.js';
import {
    handleEquationSubmit,
    resetEquationInputsAndButtons,
    renderEquationsList,
    toggleCustomLabelInput,
    equationSettings
} from './equations.js'; // Import equationSettings object
import { calculateDynamicMargins, toggleXAxisSettings } from './labels.js';
import { drawGrid, downloadSVG } from './plotter.js';
import { exportSVGtoPNG, exportSVGtoPDF } from './plotter.js';

document.getElementById('exportPNG').addEventListener('click', exportSVGtoPNG);
document.getElementById('exportPDF').addEventListener('click', () => exportSVGtoPDF());

/**
 * Toggles the visibility of paper-style specific settings (e.g., Cartesian vs. Polar).
 */
function togglePaperStyleSettings() {
    const paperStyle = document.getElementById('paperStyle').value;
    const polarControls = document.getElementById('polarControls');
    const cartesianAxisSettings = document.getElementById('cartesianAxisSettings');

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
    if (preset) {
        document.getElementById('squareSizeInput').value = preset.squareSizeInput;
        document.getElementById('yMin').value = preset.yMin;
        document.getElementById('yMax').value = preset.yMax;
        document.getElementById('yIncrement').value = preset.yIncrement;
        document.getElementById('yLabelEvery').value = preset.yLabelEvery;
        document.getElementById('yAxisLabel').value = preset.yAxisLabel;
        document.getElementById('yLabelOnZero').checked = preset.yLabelOnZero;
        document.getElementById('yAxisLabelOnTop').checked = preset.yAxisLabelOnTop;

        // X-Axis specific settings
        document.getElementById('xAxisLabelType').value = preset.xAxisLabelType;
        toggleXAxisSettings(); // Update visibility based on type

        if (preset.xAxisLabelType === 'numbers' || preset.xAxisLabelType === 'degrees') {
            document.getElementById('xMin').value = preset.xMin;
            document.getElementById('xMax').value = preset.xMax;
            document.getElementById('xIncrement').value = preset.xIncrement;
        } else { // radians
            document.getElementById('xMinRadians').value = preset.xMinRadians;
            document.getElementById('xMaxRadians').value = preset.xMaxRadians;
            document.getElementById('radianStepMultiplier').value = preset.radianStepMultiplier;
            document.getElementById('xGridUnitsPerRadianStep').value = preset.xGridUnitsPerRadianStep;
        }

        document.getElementById('xLabelEvery').value = preset.xLabelEvery;
        document.getElementById('xAxisLabel').value = preset.xAxisLabel;
        document.getElementById('xLabelOnZero').checked = preset.xLabelOnZero;
        document.getElementById('xAxisLabelOnRight').checked = preset.xAxisLabelOnRight;

        // Global options
        document.getElementById('suppressZeroLabel').checked = preset.suppressZeroLabel;
        document.getElementById('showAxisArrows').checked = preset.showAxisArrows;

        // Set grid line colours if present in the preset
        if (preset.minorGridColor) document.getElementById('minorGridColor').value = preset.minorGridColor;
        if (preset.majorGridColor) document.getElementById('majorGridColor').value = preset.majorGridColor;

        // When applying a preset, set the default state for the *current* equation input form's line arrows
        document.getElementById('showLineArrows').checked = preset.showLineArrows;
        equationSettings.lastShowLineArrowsValue = preset.showLineArrows;

        // --- Add this for Show Axes ---
        if (document.getElementById('showAxes')) {
            document.getElementById('showAxes').checked = preset.showAxes;
        }

        // --- NEW: Paper Style (if present in the preset) ---
        if (preset.paperStyle && document.getElementById('paperStyle')) {
            document.getElementById('paperStyle').value = preset.paperStyle;
        }

        // --- NEW: Polar settings (if present in the preset) ---
        if (preset.polarNumCircles !== undefined) {
            document.getElementById('polarNumCircles').value = preset.polarNumCircles;
        }
        if (preset.polarNumRadials !== undefined) {
            document.getElementById('polarNumRadials').value = preset.polarNumRadials;
        }
        if (preset.polarDegrees !== undefined) {
            document.getElementById('polarDegrees').value = preset.polarDegrees;
        }
        
        // Call togglePaperStyleSettings after setting paperStyle and polar values
        togglePaperStyleSettings();

        calculateDynamicMargins();
        drawGrid();
    }
}

// Event listeners for the DOMContentLoaded event to initialize the application.
document.addEventListener('DOMContentLoaded', () => {
    // Control declarations
    const downloadButton = document.getElementById('downloadSVG');
    const gridPresetSelect = document.getElementById('gridPreset');
    const xAxisLabelTypeSelect = document.getElementById('xAxisLabelType');
    const addOrUpdateEquationButton = document.getElementById('addOrUpdateEquationButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const equationLabelTypeSelect = document.getElementById('equationLabelType');
    const inequalityTypeSelect = document.getElementById('inequalityType');
    const equationColorInput = document.getElementById('equationColor');
    const showAxisArrowsCheckbox = document.getElementById('showAxisArrows');
    const showLineArrowsCheckbox = document.getElementById('showLineArrows');
    const allColorSwatches = document.querySelectorAll('.color-swatch');
    const paperStyleSelect = document.getElementById('paperStyle');

    // Show arrows for this equation (checkbox)
    showLineArrowsCheckbox.addEventListener('change', () => {
        equationSettings.lastShowLineArrowsValue = showLineArrowsCheckbox.checked;
        calculateDynamicMargins();
        drawGrid();
    });

    // Download SVG
    downloadButton.addEventListener('click', downloadSVG);

    // Quick color picker (swatches)
    allColorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const targetInputId = swatch.closest('.color-label-container').querySelector('input[type="color"]').id;
            document.getElementById(targetInputId).value = swatch.dataset.color;
            document.getElementById('gridPreset').value = 'custom';
            drawGrid();
        });
    });

    // Universal input listeners
    const inputs = document.querySelectorAll(
        '.controls-group input[type="number"], ' +
        '.controls-group input[type="text"], ' +
        '.controls-group input[type="color"], ' +
        '.controls-group input[type="checkbox"]:not(#showLineArrows), ' +
        '#equationLineStyle, ' +
        '#inequalityType'
    );
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            gridPresetSelect.value = 'custom';
            calculateDynamicMargins();
            drawGrid();
        });
        input.addEventListener('change', () => {
            gridPresetSelect.value = 'custom';
            calculateDynamicMargins();
            drawGrid();
        });
    });

    // Show Axis Arrows checkbox
    showAxisArrowsCheckbox.addEventListener('change', () => {
        gridPresetSelect.value = 'custom';
        calculateDynamicMargins();
        drawGrid();
    });

    // Grid preset dropdown
    gridPresetSelect.addEventListener('change', (event) => {
        applyPreset(event.target.value);
    });

    // X-axis label type dropdown
    xAxisLabelTypeSelect.addEventListener('change', () => {
        toggleXAxisSettings();
        document.getElementById('gridPreset').value = 'custom';
        calculateDynamicMargins();
        drawGrid();
    });

    // Equation plotting controls
    addOrUpdateEquationButton.addEventListener('click', handleEquationSubmit);
    cancelEditButton.addEventListener('click', resetEquationInputsAndButtons);
    equationLabelTypeSelect.addEventListener('change', toggleCustomLabelInput);

    // --- NEW: Paper Style dropdown ---
    if (paperStyleSelect) {
        paperStyleSelect.addEventListener('change', () => {
            gridPresetSelect.value = 'custom'; // Set preset to custom when user changes paper style
            togglePaperStyleSettings(); // Toggle visibility
            drawGrid(); // Redraw with new paper style
        });
    }

    // --- NEW: Polar input listeners ---
    ['polarNumCircles', 'polarNumRadials', 'polarDegrees'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { // Ensure element exists before adding listener
            el.addEventListener('input', () => {
                document.getElementById('gridPreset').value = 'custom';
                drawGrid();
            });
        }
    });


    // Collapse fieldsets (collapsible menus)
    const collapsibleFieldsets = document.querySelectorAll('.controls-card fieldset');
    collapsibleFieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        if (legend) {
            legend.addEventListener('click', () => {
                fieldset.classList.toggle('collapsed');
            });
        }
    });
    // Show axes check box
    const showAxesCheckbox = document.getElementById('showAxes');
    if (showAxesCheckbox) {
        showAxesCheckbox.addEventListener('change', () => {
            document.getElementById('gridPreset').value = 'custom';
            drawGrid();
        });
    }

    // Collapse all fieldsets by default except Grid Presets
    const generalSettingsFieldset = document.getElementById('generalSettings');
    if (generalSettingsFieldset) generalSettingsFieldset.classList.add('collapsed');
    const yAxisSettingsFieldset = document.getElementById('yAxisSettings');
    if (yAxisSettingsFieldset) yAxisSettingsFieldset.classList.add('collapsed');
    const xAxisSettingsFieldset = document.getElementById('xAxisSettings');
    if (xAxisSettingsFieldset) xAxisSettingsFieldset.classList.add('collapsed');
    const equationPlottingFieldset = document.getElementById('equationPlotting');
    if (equationPlottingFieldset) equationPlottingFieldset.classList.add('collapsed');

    // Initial setup calls
    toggleXAxisSettings();
    toggleCustomLabelInput();
    togglePaperStyleSettings(); // Call this on initial load to set correct visibility
    calculateDynamicMargins(); // Initial calculation of all margins
    applyPreset(gridPresetSelect.value);
    renderEquationsList();
});
