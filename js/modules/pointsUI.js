// pointsUI.js
// UI bindings for managing points and styles.

export class PointsUI {
  constructor(pointsLayer) {
    this.layer = pointsLayer;

    // Cache elements
    this.elX = document.getElementById('pointX');
    this.elY = document.getElementById('pointY');
    this.elLabel = document.getElementById('pointLabel');
    this.elDotColor = document.getElementById('pointsDotColor');
    this.elLineColor = document.getElementById('pointsLineColor');
    this.elDotSize = document.getElementById('pointsDotSize');
    this.elConnect = document.getElementById('pointsConnect');
    this.elShowLabels = document.getElementById('pointsShowLabels');
    this.btnAdd = document.getElementById('addPointBtn');
    this.btnClear = document.getElementById('clearPointsBtn');
    this.list = document.getElementById('pointsList');

    // Editing state
    this.editIdx = null;

    // Events
    this.btnAdd?.addEventListener('click', () => this.addPoint());
    this.btnClear?.addEventListener('click', () => { this.layer.clear(); this.renderList(); });

    const styleUpdate = () => this.updateStyle();
    this.elDotColor?.addEventListener('input', styleUpdate);
    this.elLineColor?.addEventListener('input', styleUpdate);
    this.elDotSize?.addEventListener('input', styleUpdate);
    this.elConnect?.addEventListener('change', styleUpdate);
    this.elShowLabels?.addEventListener('change', styleUpdate);

    // Initial sync
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
    });
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
