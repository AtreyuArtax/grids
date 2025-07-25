// This module manages the collection of equations, their state, and rendering.
import { showMessageBox, formatEquationTextForDisplay, safeParseFloat, safeParseInt } from './utils.js';
import { calculateDynamicMargins } from './labels.js';
import { drawGrid } from './plotter.js'; // Assuming drawGrid needs to be called after equation changes

export let equationsToDraw = []; // Array to store all equations
export let nextEquationId = 0; // Simple ID counter for equations
export let editingEquationId = null; // Stores the ID of the equation being edited, null if not editing

// Encapsulate lastShowLineArrowsValue in an object to allow mutation
export const equationSettings = {
    lastShowLineArrowsValue: true // Default to true on page load for new equations
};

/**
 * Validates equation input parameters.
 * @param {string} expression - The equation expression.
 * @param {number|null} domainStart - The domain start value.
 * @param {number|null} domainEnd - The domain end value.
 * @returns {Object} Validation result with isValid boolean and error message.
 */
function validateEquationInput(expression, domainStart, domainEnd) {
    if (!expression || expression.trim() === '') {
        return { isValid: false, error: "Please enter an equation expression." };
    }

    if (domainStart !== null && !isFinite(domainStart)) {
        return { isValid: false, error: "Invalid Domain Start value. Please enter a number or leave it blank." };
    }
    
    if (domainEnd !== null && !isFinite(domainEnd)) {
        return { isValid: false, error: "Invalid Domain End value. Please enter a number or leave it blank." };
    }
    
    if (domainStart !== null && domainEnd !== null && domainStart >= domainEnd) {
        return { isValid: false, error: "Domain Start must be less than Domain End." };
    }

    return { isValid: true };
}

/**
 * Compiles and tests an equation expression.
 * @param {string} expression - The equation expression to compile.
 * @returns {Object} Result with compiled function or error.
 */
function compileEquation(expression) {
    try {
        const compiledFunc = math.compile(expression);
        compiledFunc.evaluate({ x: 1 }); // Test with a sample x value
        return { success: true, compiledFunc };
    } catch (e) {
        return { 
            success: false, 
            error: `Invalid equation expression: ${e.message}\n` +
                   `Please use math.js syntax (e.g., sin(x), x^2, sqrt(x), log(x), pi, e). Implied multiplication like '2x' is supported.`
        };
    }
}

/**
 * Handles the submission of a new or updated equation.
 * It compiles the expression, validates domain inputs, and updates the equations list.
 */
export function handleEquationSubmit() {
    const expression = document.getElementById('equationInput').value.trim();
    const domainStartInput = document.getElementById('domainStart').value;
    const domainEndInput = document.getElementById('domainEnd').value;
    const inequalityType = document.getElementById('inequalityType').value;
    const color = document.getElementById('equationColor').value;
    const lineStyle = document.getElementById('equationLineStyle').value;
    const labelType = document.getElementById('equationLabelType').value;
    const customLabel = document.getElementById('equationCustomLabel').value.trim();
    const showLineArrows = document.getElementById('showLineArrows').checked;

    const domainStart = domainStartInput === '' ? null : safeParseFloat(domainStartInput);
    const domainEnd = domainEndInput === '' ? null : safeParseFloat(domainEndInput);

    // Validate input
    const validation = validateEquationInput(expression, domainStart, domainEnd);
    if (!validation.isValid) {
        showMessageBox(validation.error);
        return;
    }

    // Compile equation
    const compilation = compileEquation(expression);
    if (!compilation.success) {
        showMessageBox(compilation.error);
        return;
    }

    const newOrUpdatedEquation = {
        rawExpression: expression,
        compiledExpression: compilation.compiledFunc,
        domainStart: domainStart,
        domainEnd: domainEnd,
        inequalityType: inequalityType,
        color: color,
        lineStyle: lineStyle,
        labelType: labelType,
        customLabel: customLabel,
        showLineArrows: showLineArrows
    };

    if (editingEquationId !== null) {
        const index = equationsToDraw.findIndex(eq => eq.id === editingEquationId);
        if (index !== -1) {
            equationsToDraw[index] = { ...equationsToDraw[index], ...newOrUpdatedEquation };
        }
    } else {
        newOrUpdatedEquation.id = nextEquationId++;
        equationsToDraw.push(newOrUpdatedEquation);
    }

    resetEquationInputsAndButtons();
    renderEquationsList();
    calculateDynamicMargins(); // Recalculate all margins after adding/updating
    drawGrid();
}

/**
 * Removes an equation from the list.
 * @param {number} id - The ID of the equation to remove.
 */
export function removeEquation(id) {
    const initialLength = equationsToDraw.length;
    equationsToDraw = equationsToDraw.filter(eq => eq.id !== id);
    
    if (equationsToDraw.length < initialLength) {
        resetEquationInputsAndButtons(); // Clear inputs if the deleted equation was being edited
        renderEquationsList();
        calculateDynamicMargins(); // Recalculate all margins after removing
        drawGrid();
    }
}

/**
 * Pre-fills the equation input form with details of an existing equation for editing.
 * @param {number} id - The ID of the equation to edit.
 */
export function startEditEquation(id) {
    const equation = equationsToDraw.find(eq => eq.id === id);
    if (!equation) return;

    editingEquationId = id;

    document.getElementById('equationInput').value = equation.rawExpression;
    document.getElementById('equationColor').value = equation.color;
    document.getElementById('domainStart').value = equation.domainStart !== null ? equation.domainStart : '';
    document.getElementById('domainEnd').value = equation.domainEnd !== null ? equation.domainEnd : '';
    document.getElementById('inequalityType').value = equation.inequalityType || '=';
    document.getElementById('equationLineStyle').value = equation.lineStyle || 'solid';
    document.getElementById('equationLabelType').value = equation.labelType || 'equation';
    document.getElementById('equationCustomLabel').value = equation.customLabel || '';
    document.getElementById('showLineArrows').checked = equation.showLineArrows !== undefined ? equation.showLineArrows : true;

    toggleCustomLabelInput(); // Update custom label visibility

    const button = document.getElementById('addOrUpdateEquationButton');
    button.textContent = 'Update Equation';
    button.style.backgroundColor = '#28a745';
    document.getElementById('cancelEditButton').classList.remove('hidden');
}

/**
 * Resets the equation input form and buttons to their default "Add New Equation" state.
 */
export function resetEquationInputsAndButtons() {
    editingEquationId = null;
    document.getElementById('equationInput').value = '';
    document.getElementById('equationColor').value = '#000000';
    document.getElementById('domainStart').value = '';
    document.getElementById('domainEnd').value = '';
    document.getElementById('inequalityType').value = '=';
    document.getElementById('equationLineStyle').value = 'solid';

    document.getElementById('equationCustomLabel').value = '';
    document.getElementById('showLineArrows').checked = equationSettings.lastShowLineArrowsValue;

    toggleCustomLabelInput(); // Ensure custom label input is hidden
    
    const button = document.getElementById('addOrUpdateEquationButton');
    button.textContent = 'Add Equation';
    button.style.backgroundColor = '#007bff';
    document.getElementById('cancelEditButton').classList.add('hidden');
}

/**
 * Renders the list of added equations in the UI.
 */
export function renderEquationsList() {
    const equationsListDiv = document.getElementById('equationsList');
    if (!equationsListDiv) return;
    
    equationsListDiv.innerHTML = ''; // Clear existing list

    if (equationsToDraw.length === 0) {
        equationsListDiv.innerHTML = '<p style="font-size:0.8em; color:#777;">No equations added yet.</p>';
        return;
    }

    equationsToDraw.forEach(eq => {
        const eqDiv = document.createElement('div');
        eqDiv.style.cssText = `
            display: flex; justify-content: space-between; align-items: center; gap: 10px;
            margin-bottom: 5px; padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 0.9em;
        `;

        const eqLabel = document.createElement('span');

        let displayLabelContent;
        if (eq.labelType === 'custom' && eq.customLabel.trim() !== '') {
            displayLabelContent = eq.customLabel;
        } else {
            displayLabelContent = `y ${eq.inequalityType || '='} ${eq.rawExpression}`;
        }

        const displayLabel = formatEquationTextForDisplay(displayLabelContent);

        let domainText = '';
        if (eq.domainStart !== null || eq.domainEnd !== null) {
            const start = eq.domainStart !== null ? eq.domainStart : '-∞';
            const end = eq.domainEnd !== null ? eq.domainEnd : '∞';
            domainText = ` [${start} to ${end}]`;
        }

        eqLabel.textContent = `${displayLabel}${domainText}`;
        eqLabel.style.color = eq.color;
        eqLabel.style.fontWeight = 'bold';

        eqDiv.appendChild(eqLabel);

        const buttonGroup = document.createElement('div');
        buttonGroup.style.cssText = 'display: flex; gap: 5px;';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('small-button');
        editBtn.style.cssText = 'background-color: #ffc107; color: #333;';
        editBtn.onclick = () => startEditEquation(eq.id);
        buttonGroup.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('small-button');
        removeBtn.style.backgroundColor = '#dc3545';
        removeBtn.onclick = () => removeEquation(eq.id);
        buttonGroup.appendChild(removeBtn);

        eqDiv.appendChild(buttonGroup);
        equationsListDiv.appendChild(eqDiv);
    });
}

/**
 * Toggles the visibility of the custom label input field based on the selected label type.
 */
export function toggleCustomLabelInput() {
    const labelType = document.getElementById('equationLabelType').value;
    const customLabelContainer = document.getElementById('customLabelContainer');
    
    if (!customLabelContainer) return;
    
    if (labelType === 'custom') {
        customLabelContainer.classList.remove('hidden');
    } else {
        customLabelContainer.classList.add('hidden');
    }
}