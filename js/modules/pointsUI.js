// pointsUI.js
// UI bindings for managing points and styles.

import { showConfirmDialog, showInputDialog } from '../utils.js';
import { pointSets } from '../pointSets.js';

export class PointsUI {
  constructor(pointsLayer) {
    this.layer = pointsLayer;

    // Cache elements
    this.elX = document.getElementById('pointX');
    this.elY = document.getElementById('pointY');
    this.elLabel = document.getElementById('pointLabel');
    this.elCurveIntensity = document.getElementById('pointCurveIntensity');
    this.elBulkInput = document.getElementById('bulkPointsInput');
    this.elDotColor = document.getElementById('pointsDotColor');
    this.elLineColor = document.getElementById('pointsLineColor');
    this.elDotSize = document.getElementById('pointsDotSize');
    this.elConnect = document.getElementById('pointsConnect');
    this.elShowLabels = document.getElementById('pointsShowLabels');
    this.elFillArea = document.getElementById('pointsFillArea');
    this.elAreaPositiveColor = document.getElementById('pointsAreaPositiveColor');
    this.elAreaNegativeColor = document.getElementById('pointsAreaNegativeColor');
    this.areaFillColorsDiv = document.getElementById('areaFillColors');
    this.btnAdd = document.getElementById('addPointBtn');
    this.btnAddBulk = document.getElementById('addBulkPointsBtn');
    this.btnClear = document.getElementById('clearPointsBtn');
    this.btnResetLabels = document.getElementById('resetLabelPositionsBtn');
    this.pointSetsDropdown = document.getElementById('pointSets');
    this.btnSavePointSet = document.getElementById('savePointSetBtn');
    this.btnLoadPointSet = document.getElementById('loadPointSetBtn');
    this.btnRenamePointSet = document.getElementById('renamePointSetBtn');
    this.btnDeletePointSet = document.getElementById('deletePointSetBtn');
    this.pointSetsStatus = document.getElementById('pointSetsStatus');
    this.list = document.getElementById('pointsList');

    // Editing state
    this.editIdx = null;

    // Events
    this.btnAdd?.addEventListener('click', () => this.addPoint());
    this.btnAddBulk?.addEventListener('click', () => this.addBulkPoints());
    this.btnClear?.addEventListener('click', async () => { 
      const confirmed = await showConfirmDialog('Are you sure you want to clear all points?', 'Clear All Points', 'Clear');
      if (confirmed) {
        this.layer.clear(); 
        this.renderList(); 
      }
    });
    this.btnResetLabels?.addEventListener('click', () => { this.layer.resetLabelPositions(); });
    this.btnSavePointSet?.addEventListener('click', () => this.showSavePointSetModal());
    this.btnLoadPointSet?.addEventListener('click', () => this.loadSelectedPointSet());
    this.btnRenamePointSet?.addEventListener('click', () => this.showRenamePointSetModal());
    this.btnDeletePointSet?.addEventListener('click', () => this.deleteSelectedPointSet());
    this.pointSetsDropdown?.addEventListener('change', () => this.updatePointSetButtons());

    // Add Enter key support for point entry
    this.elY?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addPoint();
        // Focus on X input for next point entry
        if (this.elX) {
          this.elX.focus();
        }
      }
    });

    const styleUpdate = () => this.updateStyle();
    this.elDotColor?.addEventListener('input', styleUpdate);
    this.elLineColor?.addEventListener('input', styleUpdate);
    this.elDotSize?.addEventListener('input', styleUpdate);
    this.elConnect?.addEventListener('change', styleUpdate);
    this.elShowLabels?.addEventListener('change', styleUpdate);
    this.elFillArea?.addEventListener('change', () => {
      this.toggleAreaFillControls();
      this.updateStyle();
    });
    this.elAreaPositiveColor?.addEventListener('input', styleUpdate);
    this.elAreaNegativeColor?.addEventListener('input', styleUpdate);

    // Initial sync
    this.toggleAreaFillControls();
    this.updateStyle();
    this.renderList();
    this.updatePointSetsDropdown();
    this.updatePointSetButtons();
  }

  updateStyle() {
    this.layer.setStyle({
      dotColor: this.elDotColor?.value || '#000000',
      lineColor: this.elLineColor?.value || '#000000',
      dotSize: Number(this.elDotSize?.value || 5),
      connect: !!this.elConnect?.checked,
      showLabels: !!this.elShowLabels?.checked,
      fillArea: !!this.elFillArea?.checked,
      areaPositiveColor: this.elAreaPositiveColor?.value || '#90EE90',
      areaNegativeColor: this.elAreaNegativeColor?.value || '#FFB6C1',
    });
  }

  toggleAreaFillControls() {
    if (this.areaFillColorsDiv) {
      this.areaFillColorsDiv.style.display = this.elFillArea?.checked ? 'block' : 'none';
    }
  }

  addPoint() {
    const x = this.elX?.value;
    const y = this.elY?.value;
    const label = this.elLabel?.value || '';
    const curveIntensity = this.elCurveIntensity?.value;
    
    if (x === '' || y === '') return;
    
    // Convert empty string to 0 for curveIntensity (straight line default)
    const intensityValue = curveIntensity === '' ? 0 : Number(curveIntensity);
    
    if (this.layer.addPoint({ x, y, label, curveIntensity: intensityValue })) {
      if (this.elX) this.elX.value = '';
      if (this.elY) this.elY.value = '';
      if (this.elLabel) this.elLabel.value = '';
      // Don't clear curveIntensity - let user keep same intensity for multiple points
      this.renderList();
      this.updateSlopeInfo();
    }
  }

  /**
   * Update slope information display and provide suggestions for next point
   */
  updateSlopeInfo() {
    const slopeInfoEl = document.getElementById('slopeInfo');
    if (!slopeInfoEl || this.layer.points.length < 2) {
      if (slopeInfoEl) slopeInfoEl.textContent = '';
      return;
    }

    const lastPoint = this.layer.points[this.layer.points.length - 1];
    const prevPoint = this.layer.points[this.layer.points.length - 2];
    
    if (prevPoint.curveIntensity !== 0) {
      const finalSlope = this.layer.calculateFinalSlope(prevPoint, lastPoint);
      slopeInfoEl.innerHTML = `<strong>Final slope at ${lastPoint.label || 'last point'}:</strong> ${finalSlope.toFixed(3)}`;
      
      // Add suggestion for next point
      this.addNextPointSuggestion(finalSlope);
    } else {
      slopeInfoEl.textContent = '';
    }
  }

  /**
   * Add event listener to X input to suggest Y value for slope continuity
   */
  addNextPointSuggestion(finalSlope) {
    if (!this.elX || !this.elY) return;
    
    const suggestY = () => {
      const nextX = Number(this.elX.value);
      if (isFinite(nextX) && this.layer.points.length > 0) {
        const lastPoint = this.layer.points[this.layer.points.length - 1];
        const suggestedY = lastPoint.y + finalSlope * (nextX - lastPoint.x);
        
        // Only suggest if Y field is empty
        if (this.elY.value === '') {
          this.elY.value = suggestedY.toFixed(2);
          this.elY.style.backgroundColor = '#e8f4fd'; // Light blue to indicate suggestion
        }
      }
    };

    // Remove any existing listeners
    this.elX.removeEventListener('input', this.suggestYHandler);
    this.suggestYHandler = suggestY;
    this.elX.addEventListener('input', this.suggestYHandler);
    
    // Clear suggestion styling when user types in Y
    this.elY.addEventListener('input', () => {
      this.elY.style.backgroundColor = '';
    });
  }

  addBulkPoints() {
    const input = this.elBulkInput?.value?.trim();
    if (!input) return;

    // Split by lines and spaces, filter out empty entries
    const entries = input.split(/[\n\s]+/).filter(entry => entry.trim());
    let addedCount = 0;
    const errors = [];

    entries.forEach((entry, index) => {
      const parts = entry.split(',').map(part => part.trim());
      
      if (parts.length < 2) {
        errors.push(`Entry ${index + 1}: "${entry}" - needs at least x,y values`);
        return;
      }

      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const label = parts[2] || '';
      const curveIntensity = parts[3] ? parseFloat(parts[3]) : 0;

      if (isNaN(x) || isNaN(y)) {
        errors.push(`Entry ${index + 1}: "${entry}" - x and y must be numbers`);
        return;
      }

      if (parts[3] && isNaN(curveIntensity)) {
        errors.push(`Entry ${index + 1}: "${entry}" - curve intensity must be a number`);
        return;
      }

      if (this.layer.addPoint({ x, y, label, curveIntensity })) {
        addedCount++;
      }
    });

    // Clear the input and update the display
    if (this.elBulkInput) this.elBulkInput.value = '';
    this.renderList();
    this.updateSlopeInfo();

    // Show feedback to user
    if (errors.length > 0) {
      alert(`Added ${addedCount} points.\n\nErrors:\n${errors.join('\n')}`);
    } else if (addedCount > 0) {
      console.log(`Successfully added ${addedCount} points.`);
    }
  }

  renderList() {
    if (!this.list) return;
    const items = this.layer.points;
    if (!items.length) {
      this.list.innerHTML = '<div style="color:#666; font-size:.9rem;">No points yet.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'list-item'; // Use CSS class instead of inline styles

      if (this.editIdx === idx) {
        // Edit mode
        const form = document.createElement('form');
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '6px';
        form.style.width = '100%'; // Ensure form takes full width
        form.onsubmit = e => {
          e.preventDefault();
          const x = form.x.value, y = form.y.value, label = form.label.value;
          const curveIntensity = form.curveIntensity.value === '' ? 0 : Number(form.curveIntensity.value);
          this.layer.points[idx] = { x: Number(x), y: Number(y), label, curveIntensity };
          this.editIdx = null;
          this.layer.render();
          this.renderList();
          this.updateSlopeInfo();
        };
        
        // First row: coordinates
        const coordRow = document.createElement('div');
        coordRow.style.display = 'flex';
        coordRow.style.gap = '6px';
        coordRow.innerHTML = `<input name="x" type="number" step="any" value="${p.x}" style="width:5em;" title="X coordinate" placeholder="x">`
          + `<input name="y" type="number" step="any" value="${p.y}" style="width:5em;" title="Y coordinate" placeholder="y">`;
        
        // Second row: label and curve
        const detailRow = document.createElement('div');
        detailRow.style.display = 'flex';
        detailRow.style.gap = '6px';
        detailRow.innerHTML = `<input name="label" type="text" value="${p.label || ''}" placeholder="label" style="flex:1;" title="Point label">`
          + `<input name="curveIntensity" type="number" step="any" value="${p.curveIntensity !== 0 ? p.curveIntensity : ''}" placeholder="curve" style="width:5em;" title="Curve intensity (+ curves up, - curves down)">`;
        
        // Button row
        const buttonRow = document.createElement('div');
        buttonRow.classList.add('edit-button-group');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '6px';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Update';
        saveBtn.type = 'submit';
        saveBtn.style.flex = '1';
        saveBtn.classList.add('update-button');
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';
        cancelBtn.style.flex = '1';
        cancelBtn.classList.add('cancel-button');
        cancelBtn.onclick = () => { this.editIdx = null; this.renderList(); };
        
        buttonRow.appendChild(saveBtn);
        buttonRow.appendChild(cancelBtn);
        
        form.appendChild(coordRow);
        form.appendChild(detailRow);
        form.appendChild(buttonRow);
        row.appendChild(form);
      } else {
        const left = document.createElement('div');
        const slopeText = p.curveIntensity !== 0 ? ` (curve: ${p.curveIntensity})` : '';
        left.textContent = `(${p.x}, ${p.y})${p.label ? ` — ${p.label}` : ''}${slopeText}`;
        left.style.flex = '1';

        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        edit.classList.add('edit-button');
        edit.addEventListener('click', () => { this.editIdx = idx; this.renderList(); });

        const del = document.createElement('button');
        del.textContent = 'Remove';
        del.classList.add('delete-button');
        del.addEventListener('click', async () => { 
            const confirmed = await showConfirmDialog('Are you sure you want to remove this point?', 'Remove Point', 'Remove');
            if (confirmed) {
                this.layer.removePoint(idx); 
                this.renderList(); 
            }
        });

        row.appendChild(left);
        row.appendChild(edit);
        row.appendChild(del);
      }
      frag.appendChild(row);
    });
    this.list.innerHTML = '';
    this.list.appendChild(frag);
  }

  /**
   * Updates the point sets dropdown with available point sets
   */
  updatePointSetsDropdown() {
    if (!this.pointSetsDropdown) return;

    const pointSetsList = pointSets.getAll();
    
    // Clear existing options except the first one
    this.pointSetsDropdown.innerHTML = '<option value="">Select a point set...</option>';
    
    // Add point sets
    pointSetsList.forEach(pointSet => {
      const option = document.createElement('option');
      option.value = pointSet.id;
      option.textContent = pointSet.name;
      this.pointSetsDropdown.appendChild(option);
    });

    this.updatePointSetsStatus();
  }

  /**
   * Updates the status display and button states
   */
  updatePointSetsStatus() {
    if (!this.pointSetsStatus) return;

    const count = pointSets.getCount();
    if (count === 0) {
      this.pointSetsStatus.textContent = 'No saved point sets';
      this.pointSetsStatus.style.color = '#999';
    } else {
      this.pointSetsStatus.textContent = `${count} saved point set${count > 1 ? 's' : ''}`;
      this.pointSetsStatus.style.color = '#666';
    }
  }

  /**
   * Updates button states based on dropdown selection
   */
  updatePointSetButtons() {
    const hasSelection = this.pointSetsDropdown?.value;
    if (this.btnLoadPointSet) this.btnLoadPointSet.disabled = !hasSelection;
    if (this.btnRenamePointSet) this.btnRenamePointSet.disabled = !hasSelection;
    if (this.btnDeletePointSet) this.btnDeletePointSet.disabled = !hasSelection;
  }

  /**
   * Shows modal to save current points as a new point set
   */
  async showSavePointSetModal() {
    if (this.layer.points.length === 0) {
      alert('No points to save.');
      return;
    }

    const suggestedName = pointSets.generateSmartName(this.layer.points);
    const name = await showInputDialog(
      'Give your point set a name to save it for later use.',
      'Save Point Set',
      suggestedName,
      'Point Set Name:'
    );
    
    if (!name) {
      return; // User cancelled
    }

    // Get current grid state
    const gridState = window.getGridState ? window.getGridState() : {};
    
    // Get current points data
    const pointsData = this.layer.points.map(p => ({
      x: p.x,
      y: p.y,
      label: p.label,
      curveIntensity: p.curveIntensity
    }));

    // Get current points style
    const pointsStyle = {
      dotColor: this.elDotColor?.value || '#000000',
      lineColor: this.elLineColor?.value || '#000000',
      dotSize: Number(this.elDotSize?.value || 5),
      connect: !!this.elConnect?.checked,
      showLabels: !!this.elShowLabels?.checked,
      fillArea: !!this.elFillArea?.checked,
      areaPositiveColor: this.elAreaPositiveColor?.value || '#90EE90',
      areaNegativeColor: this.elAreaNegativeColor?.value || '#FFB6C1'
    };

    const finalName = pointSets.save(name, pointsData, pointsStyle, gridState);
    
    if (finalName) {
      console.log(`Saved point set: ${finalName}`);
      this.updatePointSetsDropdown();
      // Select the newly saved point set
      this.pointSetsDropdown.value = pointSets.getByName(finalName)?.id || '';
      this.updatePointSetButtons();
    } else {
      alert('Failed to save point set. Please try again.');
    }
  }

  /**
   * Loads the selected point set
   */
  async loadSelectedPointSet() {
    const selectedId = this.pointSetsDropdown?.value;
    if (!selectedId) {
      alert('Please select a point set to load.');
      return;
    }

    const pointSet = pointSets.getById(selectedId);
    if (!pointSet) {
      alert('Selected point set not found.');
      this.updatePointSetsDropdown();
      return;
    }

    // Confirm if there are existing points
    if (this.layer.points.length > 0) {
      const confirmed = await showConfirmDialog(
        `This will replace your current ${this.layer.points.length} points with ${pointSet.points.length} saved points and restore the saved grid settings.\n\nContinue?`, 
        'Load Point Set',
        'Continue'
      );
      if (!confirmed) return;
    }

    // Clear current points
    this.layer.clear();

    // Load points
    pointSet.points.forEach(p => {
      this.layer.addPoint({
        x: p.x,
        y: p.y,
        label: p.label || '',
        curveIntensity: p.curveIntensity || 0
      });
    });

    // Apply saved points style
    if (pointSet.pointsStyle) {
      if (this.elDotColor) this.elDotColor.value = pointSet.pointsStyle.dotColor;
      if (this.elLineColor) this.elLineColor.value = pointSet.pointsStyle.lineColor;
      if (this.elDotSize) this.elDotSize.value = pointSet.pointsStyle.dotSize;
      if (this.elConnect) this.elConnect.checked = pointSet.pointsStyle.connect;
      if (this.elShowLabels) this.elShowLabels.checked = pointSet.pointsStyle.showLabels;
      if (this.elFillArea) this.elFillArea.checked = pointSet.pointsStyle.fillArea;
      if (this.elAreaPositiveColor) this.elAreaPositiveColor.value = pointSet.pointsStyle.areaPositiveColor;
      if (this.elAreaNegativeColor) this.elAreaNegativeColor.value = pointSet.pointsStyle.areaNegativeColor;
      
      this.toggleAreaFillControls();
      this.updateStyle();
    }

    // Apply saved grid state
    if (pointSet.gridState && window.applyGridState) {
      window.applyGridState(pointSet.gridState);
    }

    this.renderList();
    console.log(`Loaded point set: ${pointSet.name} (${pointSet.points.length} points)`);
  }

  /**
   * Shows modal to rename the selected point set
   */
  async showRenamePointSetModal() {
    const selectedId = this.pointSetsDropdown?.value;
    if (!selectedId) {
      alert('Please select a point set to rename.');
      return;
    }

    const pointSet = pointSets.getById(selectedId);
    if (!pointSet) {
      alert('Selected point set not found.');
      this.updatePointSetsDropdown();
      return;
    }

    const newName = await showInputDialog(
      `Rename "${pointSet.name}" to a new name.`,
      'Rename Point Set',
      pointSet.name,
      'New Name:'
    );
    
    if (!newName) {
      return; // User cancelled
    }

    if (pointSets.rename(selectedId, newName)) {
      console.log(`Renamed point set to: ${newName}`);
      this.updatePointSetsDropdown();
      // Keep the same item selected
      this.pointSetsDropdown.value = selectedId;
      this.updatePointSetButtons();
    } else {
      alert('Failed to rename point set. The name might already exist.');
    }
  }

  /**
   * Deletes the selected point set
   */
  async deleteSelectedPointSet() {
    const selectedId = this.pointSetsDropdown?.value;
    if (!selectedId) {
      alert('Please select a point set to delete.');
      return;
    }

    const pointSet = pointSets.getById(selectedId);
    if (!pointSet) {
      alert('Selected point set not found.');
      this.updatePointSetsDropdown();
      return;
    }

    const confirmed = await showConfirmDialog(
      `Are you sure you want to delete the point set "${pointSet.name}"?\n\nThis action cannot be undone.`,
      'Delete Point Set',
      'Delete'
    );

    if (confirmed) {
      if (pointSets.delete(selectedId)) {
        console.log(`Deleted point set: ${pointSet.name}`);
        this.updatePointSetsDropdown();
        this.updatePointSetButtons();
      } else {
        alert('Failed to delete point set. Please try again.');
      }
    }
  }
}
