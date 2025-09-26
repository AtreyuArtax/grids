// main.js
// This module handles overall application flow, UI interactions, and initializes other modules.

import { gridPresets } from './grid-presets.js';
import { userTemplates } from './userTemplates.js';
import {
    handleEquationSubmit,
    resetEquationInputsAndButtons,
    resetEquationLabelPositions,
    clearAllEquations,
    renderEquationsList,
    toggleCustomLabelInput,
    equationSettings // Import equationSettings object
} from './equations.js';
import { calculateDynamicMargins, toggleXAxisSettings } from './labels.js';
import { drawGrid, downloadSVG, setPreviewEquation, safeDrawGrid } from './plotter.js'; // Import setPreviewEquation and safeDrawGrid
import { exportSVGtoPNG, exportSVGtoPDF } from './plotter.js';
import { debounce, showConfirmDialog } from './utils.js';
import { PointsLayer } from './modules/pointsLayer.js';
import { PointsUI } from './modules/pointsUI.js';
import { initializeModals } from './modalInit.js';
import { errorHandler } from './modules/errorHandler.js';

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
 * @param {Object} customSettings - Optional custom settings to apply instead of preset
 */
function applyPreset(presetName, customSettings = null) {
    let preset;
    
    if (customSettings) {
        // Use custom settings (for user templates)
        preset = customSettings;
    } else if (presetName === "custom") {
        calculateDynamicMargins(); // Recalculate all margins for custom changes
        drawGrid();
        return;
    } else {
        // Use system preset
        preset = gridPresets[presetName];
        if (!preset) {
            console.warn(`Preset '${presetName}' not found`);
            return;
        }
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
 * Gets current grid settings from the UI
 * @returns {Object} Current grid configuration
 */
function getCurrentGridSettings() {
    const getValue = (id, defaultValue = null) => {
        const element = safeGetElement(id);
        if (!element) return defaultValue;
        if (element.type === 'checkbox') return element.checked;
        if (element.type === 'number') return parseFloat(element.value) || defaultValue;
        return element.value || defaultValue;
    };

    return {
        squareSizeInput: getValue('squareSizeInput', 15),
        xMin: getValue('xMin', 0),
        xMax: getValue('xMax', 10),
        xIncrement: getValue('xIncrement', 1),
        xLabelEvery: getValue('xLabelEvery', 1),
        xAxisLabel: getValue('xAxisLabel', 'x'),
        xLabelOnZero: getValue('xLabelOnZero', false),
        xAxisLabelOnRight: getValue('xAxisLabelOnRight', false),
        xAxisLabelType: getValue('xAxisLabelType', 'numbers'),
        yMin: getValue('yMin', 0),
        yMax: getValue('yMax', 10),
        yIncrement: getValue('yIncrement', 1),
        yLabelEvery: getValue('yLabelEvery', 1),
        yAxisLabel: getValue('yAxisLabel', 'y'),
        yLabelOnZero: getValue('yLabelOnZero', false),
        yAxisLabelOnTop: getValue('yAxisLabelOnTop', false),
        suppressZeroLabel: getValue('suppressZeroLabel', false),
        showAxisArrows: getValue('showAxisArrows', true),
        showLineArrows: getValue('showLineArrows', true),
        showAxes: getValue('showAxes', true),
        minorGridColor: getValue('minorGridColor', '#a9a9a9'),
        majorGridColor: getValue('majorGridColor', '#555555'),
        xMinRadians: getValue('xMinRadians', null),
        xMaxRadians: getValue('xMaxRadians', null),
        radianStepMultiplier: getValue('radianStepMultiplier', null),
        xGridUnitsPerRadianStep: getValue('xGridUnitsPerRadianStep', null),
        paperStyle: getValue('paperStyle', null)
    };
}

/**
 * Shows the save template modal
 */
function showSaveTemplateModal() {
    const currentSettings = getCurrentGridSettings();
    const suggestedName = userTemplates.generateSmartName(currentSettings);
    
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    
    const content = document.createElement('div');
    content.className = 'confirm-modal-content';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = 'Save Template';
    
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Template Name:';
    inputLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; text-align: left;';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = suggestedName;
    nameInput.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 1em;';
    
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
        const templateName = nameInput.value.trim();
        if (!templateName) {
            alert('Please enter a template name.');
            nameInput.focus();
            return;
        }
        
        if (userTemplates.save(templateName, currentSettings)) {
            updateTemplatesDropdown();
            closeModal();
            console.log('Template saved successfully:', templateName);
        } else {
            alert('Failed to save template. Please try again.');
        }
    };
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    };
    
    const handleCancel = () => {
        closeModal();
    };
    
    // Click handlers
    saveButton.addEventListener('click', handleSave);
    cancelButton.addEventListener('click', handleCancel);
    
    // Enter key handler
    nameInput.addEventListener('keypress', (e) => {
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
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    content.appendChild(titleElement);
    content.appendChild(inputLabel);
    content.appendChild(nameInput);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    
    // Show modal
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.classList.add('show');
        nameInput.focus();
        nameInput.select();
    }, 10);
}

/**
 * Updates the templates dropdown based on current mode and available templates
 */
function updateTemplatesDropdown() {
    const dropdown = safeGetElement('templates');
    const builtinRadio = safeGetElement('templateModeBuiltin');
    const saveBtn = safeGetElement('saveTemplateBtn');
    
    if (!dropdown || !builtinRadio || !saveBtn) return;
    
    const isBuiltinMode = builtinRadio.checked;
    
    if (isBuiltinMode) {
        // Show built-in templates
        dropdown.innerHTML = `
            <option value="">Select a template...</option>
            <option value="negativeAndPositive" selected>math: 4 Quadrant</option>
            <option value="standardMath">math: 1 Quadrant</option>
            <option value="trigGraph">math: Trig Graph (0 to 2π)</option>
            <option value="trigGraphDegrees">math: Trig Graph (Degrees)</option>
            <option value="polar">math: Polar Grid</option>
            <option value="position">physics: Position vs Time</option>
            <option value="velocity">physics: Velocity vs Time</option>
            <option value="acceleration">physics: Acceleration vs Time</option>
            <option value="graphPaperLetter_1_4in">paper: Letter 1/4 inch</option>
            <option value="graphPaperLetter_1_5in">paper: Letter 1/5 inch</option>
            <option value="graphPaperLetter_1cm">paper: Letter 1 cm</option>
            <option value="graphPaperLetter_5mm">paper: Letter 5 mm</option>
        `;
        saveBtn.style.display = 'none';
        dropdown.title = ''; // Remove tooltip for built-in mode
    } else {
        // Show user templates
        userTemplates.populateDropdown(dropdown);
        saveBtn.style.display = 'inline-block';
        dropdown.title = 'Right click to rename or remove'; // Add tooltip for user mode
    }
    
    // Save mode preference
    localStorage.setItem('templateMode', isBuiltinMode ? 'builtin' : 'user');
}

/**
 * Shows context menu for user template management
 * @param {Event} event - Right-click event
 * @param {string} templateId - Template ID
 */
function showTemplateContextMenu(event, templateId) {
    const template = userTemplates.getById(templateId);
    if (!template) return;
    
    const contextMenu = document.createElement('div');
    contextMenu.style.cssText = `
        position: fixed;
        top: ${event.clientY}px;
        left: ${event.clientX}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        min-width: 120px;
    `;
    
    contextMenu.innerHTML = `
        <div style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; transition: background-color 0.2s;" 
             data-action="rename"
             onmouseover="this.style.backgroundColor='#f8f9fa'"
             onmouseout="this.style.backgroundColor='white'">Rename</div>
        <div style="padding: 8px 12px; cursor: pointer; color: #dc3545; transition: background-color 0.2s;" 
             data-action="delete"
             onmouseover="this.style.backgroundColor='#f8f9fa'"
             onmouseout="this.style.backgroundColor='white'">Delete</div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle context menu actions
    contextMenu.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (action === 'rename') {
            showTemplateRenameDialog(templateId, template.name);
        } else if (action === 'delete') {
            const confirmed = await showConfirmDialog(
                `Are you sure you want to delete the template "${template.name}"?`,
                'Delete Template'
            );
            if (confirmed) {
                if (userTemplates.delete(templateId)) {
                    updateTemplatesDropdown();
                } else {
                    alert('Failed to delete template.');
                }
            }
        }
        document.body.removeChild(contextMenu);
    });
    
    // Remove context menu when clicking elsewhere
    const removeMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            document.body.removeChild(contextMenu);
            document.removeEventListener('click', removeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', removeMenu), 100);
}

/**
 * Shows rename dialog for user templates
 * @param {string} templateId - Template ID
 * @param {string} currentName - Current template name
 */
function showTemplateRenameDialog(templateId, currentName) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    
    const content = document.createElement('div');
    content.className = 'confirm-modal-content';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = 'Rename Template';
    
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Template Name:';
    inputLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; text-align: left;';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = currentName;
    nameInput.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 1em;';
    
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
        const newName = nameInput.value.trim();
        if (!newName) {
            alert('Please enter a template name.');
            nameInput.focus();
            return;
        }
        
        if (userTemplates.rename(templateId, newName)) {
            updateTemplatesDropdown();
            closeModal();
        } else {
            alert('Failed to rename template. Name might already exist.');
        }
    };
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    };
    
    const handleCancel = () => {
        closeModal();
    };
    
    // Click handlers
    saveButton.addEventListener('click', handleSave);
    cancelButton.addEventListener('click', handleCancel);
    
    // Enter key handler
    nameInput.addEventListener('keypress', (e) => {
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
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    content.appendChild(titleElement);
    content.appendChild(inputLabel);
    content.appendChild(nameInput);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    
    // Show modal
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.classList.add('show');
        nameInput.focus();
        nameInput.select();
    }, 10);
}

/**
 * Sets the dropdown to custom state when settings change
 */
function setCustomState() {
    const dropdown = safeGetElement('templates');
    if (dropdown) dropdown.value = '';
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
            setCustomState();
            debouncedCalculateAndDraw();
        });
        
        safeAddEventListener(input, 'change', () => {
            setCustomState();
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
                setCustomState();
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

        // Add Enter key functionality to submit equation
        safeAddEventListener(equationInput, 'keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission if in a form
                // Trigger the same action as clicking the Add Equation button
                const addButton = safeGetElement('addOrUpdateEquationButton');
                if (addButton && !addButton.disabled && addButton.style.display !== 'none') {
                    addButton.click();
                }
            }
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
        // Use safeDrawGrid to defer redraw if drag is in progress
        safeDrawGrid();
    },
    writable: true
});

const originalResetEquationInputsAndButtons = resetEquationInputsAndButtons;
Object.defineProperty(window, 'resetEquationInputsAndButtons', {
    value: function(...args) {
        originalResetEquationInputsAndButtons.apply(this, args);
        setPreviewEquation(null);
        // Use safeDrawGrid to defer redraw if drag is in progress
        safeDrawGrid();
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
        // Initialize modal system
        initializeModals();
        
        // Points overlay modules
        const pointsLayer = new PointsLayer();
        new PointsUI(pointsLayer);

        // Calculate Net Area button
        const calculateNetAreaBtn = safeGetElement('calculateNetAreaBtn');
        const netAreaResult = safeGetElement('netAreaResult');
        if (calculateNetAreaBtn && netAreaResult) {
            safeAddEventListener(calculateNetAreaBtn, 'click', () => {
                const netArea = pointsLayer.getNetArea();
                const totalArea = pointsLayer.getTotalArea();
                netAreaResult.innerHTML = `
                    <div>Net Area (displacement): ${netArea.toFixed(3)}</div>
                    <div>Total Area (distance): ${totalArea.toFixed(3)}</div>
                `;
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
            setCustomState();
            calculateDynamicMargins();
            drawGrid();
        });

        // Template mode toggle
        const builtinRadio = safeGetElement('templateModeBuiltin');
        const userRadio = safeGetElement('templateModeUser');
        
        // Load saved template mode preference
        const savedMode = localStorage.getItem('templateMode') || 'builtin';
        if (savedMode === 'user') {
            userRadio.checked = true;
        } else {
            builtinRadio.checked = true;
        }
        
        // Toggle mode handlers
        safeAddEventListener(builtinRadio, 'change', () => {
            if (builtinRadio.checked) {
                updateTemplatesDropdown();
            }
        });
        
        safeAddEventListener(userRadio, 'change', () => {
            if (userRadio.checked) {
                updateTemplatesDropdown();
            }
        });
        
        // Templates dropdown
        const templatesSelect = safeGetElement('templates');
        safeAddEventListener(templatesSelect, 'change', (event) => {
            if (event.target.value) {
                const isBuiltinMode = builtinRadio.checked;
                if (isBuiltinMode) {
                    // Apply built-in template
                    applyPreset(event.target.value);
                } else {
                    // Apply user template
                    const template = userTemplates.getById(event.target.value);
                    if (template) {
                        applyPreset('custom', template.gridSettings);
                    }
                }
            }
        });

        // Right-click context menu for user templates (only in user mode)
        safeAddEventListener(templatesSelect, 'contextmenu', (event) => {
            const isUserMode = userRadio.checked;
            const templateId = event.target.value;
            if (isUserMode && templateId) {
                event.preventDefault();
                showTemplateContextMenu(event, templateId);
            }
        });

        // Save template button
        const saveTemplateBtn = safeGetElement('saveTemplateBtn');
        safeAddEventListener(saveTemplateBtn, 'click', () => {
            showSaveTemplateModal();
        });

        // X-axis label type dropdown
        const xAxisLabelTypeSelect = safeGetElement('xAxisLabelType');
        safeAddEventListener(xAxisLabelTypeSelect, 'change', () => {
            toggleXAxisSettings();
            setCustomState();
            calculateDynamicMargins();
            drawGrid();
        });

        // Equation plotting controls
        // Removed direct listeners for equation submission here as they are handled by setupEquationLivePreview
        // and the overrides above.
        // It's assumed that handleEquationSubmit and resetEquationInputsAndButtons are either imported
        // and attached elsewhere, or expected to be global functions.
        // The original listeners are re-added here, but their behavior is now wrapped.
        // Wrap equation handlers to trigger grid redraw
        safeAddEventListener(safeGetElement('addOrUpdateEquationButton'), 'click', () => {
            handleEquationSubmit();
            // Use safeDrawGrid to defer redraw if drag is in progress
            safeDrawGrid();
        });
        safeAddEventListener(safeGetElement('cancelEditButton'), 'click', () => {
            resetEquationInputsAndButtons();
            safeDrawGrid();
        });
        safeAddEventListener(safeGetElement('resetEquationLabelPositionsBtn'), 'click', () => {
            resetEquationLabelPositions();
            safeDrawGrid();
        });
        safeAddEventListener(safeGetElement('clearEquationsBtn'), 'click', async () => {
            const confirmed = await showConfirmDialog('Are you sure you want to clear all equations?', 'Clear All Equations');
            if (confirmed) {
                clearAllEquations();
                safeDrawGrid();
            }
        });

        safeAddEventListener(safeGetElement('equationLabelType'), 'change', toggleCustomLabelInput);

        // Paper Style dropdown
        const paperStyleSelect = safeGetElement('paperStyle');
        safeAddEventListener(paperStyleSelect, 'change', () => {
            setCustomState();
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
            setCustomState();
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

        // Initialize template dropdown based on saved mode
        updateTemplatesDropdown();

        // Initial setup calls
        toggleXAxisSettings();
        toggleCustomLabelInput();
        togglePaperStyleSettings();
        calculateDynamicMargins();
        
        // Apply initial preset
        const templatesDropdown = safeGetElement('templates');
        const initialPreset = templatesDropdown ? templatesDropdown.value : 'negativeAndPositive';
        if (initialPreset) {
            applyPreset(initialPreset);
        }
        
        renderEquationsList();
        
    } catch (error) {
        errorHandler.fatal(error, {
            component: 'main',
            action: 'initialization',
            showUser: true
        });
    }
});
