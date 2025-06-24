// This module manages the collection of equations, their state, and rendering.
import { showMessageBox, formatEquationTextForDisplay } from './utils.js';
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
    const showLineArrows = document.getElementById('showLineArrows').checked; // Read from equation section

    if (!expression) {
        showMessageBox("Please enter an equation expression.");
        return;
    }

    const domainStart = domainStartInput === '' ? null : parseFloat(domainStartInput);
    const domainEnd = domainEndInput === '' ? null : parseFloat(domainEndInput);

    if (domainStart !== null && isNaN(domainStart)) {
        showMessageBox("Invalid Domain Start value. Please enter a number or leave it blank.");
        return;
    }
    if (domainEnd !== null && isNaN(domainEnd)) {
        showMessageBox("Invalid Domain End value. Please enter a number or leave it blank.");
        return;
    }
    if (domainStart !== null && domainEnd !== null && domainStart >= domainEnd) {
        showMessageBox("Domain Start must be less than Domain End.");
        return;
    }

    let compiledFunc;
    try {
        compiledFunc = math.compile(expression);
        compiledFunc.evaluate({ x: 1 }); // Test with a sample x value
    } catch (e) {
        showMessageBox(`Invalid equation expression: ${e.message}\n` +
                       `Please use math.js syntax (e.g., sin(x), x^2, sqrt(x), log(x), pi, e). Implied multiplication like '2x' is supported.`);
        return;
    }

    const newOrUpdatedEquation = {
        rawExpression: expression,
        compiledExpression: compiledFunc,
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
    equationsToDraw = equationsToDraw.filter(eq => eq.id !== id);
    resetEquationInputsAndButtons(); // Clear inputs if the deleted equation was being edited
    renderEquationsList();
    calculateDynamicMargins(); // Recalculate all margins after removing
    drawGrid();
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

    document.getElementById('addOrUpdateEquationButton').textContent = 'Update Equation';
    document.getElementById('addOrUpdateEquationButton').style.backgroundColor = '#28a745';
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
    document.getElementById('showLineArrows').checked = equationSettings.lastShowLineArrowsValue; // Use from object

    toggleCustomLabelInput(); // Ensure custom label input is hidden
    document.getElementById('addOrUpdateEquationButton').textContent = 'Add Equation';
    document.getElementById('addOrUpdateEquationButton').style.backgroundColor = '#007bff';
    document.getElementById('cancelEditButton').classList.add('hidden');
}

/**
 * Renders the list of added equations in the UI.
 */
export function renderEquationsList() {
    const equationsListDiv = document.getElementById('equationsList');
    equationsListDiv.innerHTML = ''; // Clear existing list

    if (equationsToDraw.length === 0) {
        equationsListDiv.innerHTML = '<p style="font-size:0.8em; color:#777;">No equations added yet.</p>';
        return;
    }

    equationsToDraw.forEach(eq => {
        const eqDiv = document.createElement('div');
        eqDiv.style.display = 'flex';
        eqDiv.style.justifyContent = 'space-between';
        eqDiv.style.alignItems = 'center';
        eqDiv.style.gap = '10px';
        eqDiv.style.marginBottom = '5px';
        eqDiv.style.padding = '5px 0';
        eqDiv.style.borderBottom = '1px dashed #eee';
        eqDiv.style.fontSize = '0.9em';

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
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '5px';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('small-button');
        editBtn.style.backgroundColor = '#ffc107';
        editBtn.style.color = '#333';
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
    if (labelType === 'custom') {
        customLabelContainer.classList.remove('hidden');
    } else {
        customLabelContainer.classList.add('hidden');
    }
}
