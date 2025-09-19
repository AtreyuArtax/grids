// pointsUI.js
// UI bindings for managing points and styles.

export class PointsUI {
  constructor(pointsLayer) {
    this.layer = pointsLayer;

    // Cache elements
    this.elX = document.getElementById('pointX');
    this.elY = document.getElementById('pointY');
    this.elLabel = document.getElementById('pointLabel');
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
    this.list = document.getElementById('pointsList');

    // Editing state
    this.editIdx = null;

    // Events
    this.btnAdd?.addEventListener('click', () => this.addPoint());
    this.btnAddBulk?.addEventListener('click', () => this.addBulkPoints());
    this.btnClear?.addEventListener('click', () => { this.layer.clear(); this.renderList(); });

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
    if (x === '' || y === '') return;
    if (this.layer.addPoint({ x, y, label })) {
      if (this.elX) this.elX.value = '';
      if (this.elY) this.elY.value = '';
      if (this.elLabel) this.elLabel.value = '';
      this.renderList();
    }
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

      if (isNaN(x) || isNaN(y)) {
        errors.push(`Entry ${index + 1}: "${entry}" - x and y must be numbers`);
        return;
      }

      if (this.layer.addPoint({ x, y, label })) {
        addedCount++;
      }
    });

    // Clear the input and update the display
    if (this.elBulkInput) this.elBulkInput.value = '';
    this.renderList();

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
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '8px';
      row.style.padding = '4px 0';
      row.style.borderBottom = '1px solid #eee';

      if (this.editIdx === idx) {
        // Edit mode
        const form = document.createElement('form');
        form.style.display = 'flex';
        form.style.gap = '6px';
        form.onsubmit = e => {
          e.preventDefault();
          const x = form.x.value, y = form.y.value, label = form.label.value;
          this.layer.points[idx] = { x: Number(x), y: Number(y), label };
          this.editIdx = null;
          this.layer.render();
          this.renderList();
        };
        form.innerHTML = `<input name="x" type="number" step="any" value="${p.x}" style="width:5em;">`
          + `<input name="y" type="number" step="any" value="${p.y}" style="width:5em;">`
          + `<input name="label" type="text" value="${p.label || ''}" style="width:6em;">`;
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.type = 'submit';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';
        cancelBtn.onclick = () => { this.editIdx = null; this.renderList(); };
        form.appendChild(saveBtn);
        form.appendChild(cancelBtn);
        row.appendChild(form);
      } else {
        const left = document.createElement('div');
        left.textContent = `(${p.x}, ${p.y})${p.label ? ` — ${p.label}` : ''}`;
        left.style.flex = '1';

        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => { this.editIdx = idx; this.renderList(); });

        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.addEventListener('click', () => { this.layer.removePoint(idx); this.renderList(); });

        row.appendChild(left);
        row.appendChild(edit);
        row.appendChild(del);
      }
      frag.appendChild(row);
    });
    this.list.innerHTML = '';
    this.list.appendChild(frag);
  }
}
