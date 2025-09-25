/**
 * User Templates Module
 * Manages user-created grid templates with localStorage persistence
 */

class UserTemplates {
    constructor() {
        this.storageKey = 'gridUserTemplates';
    }

    /**
     * Gets all user templates from localStorage
     * @returns {Array} Array of user templates
     */
    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading user templates:', error);
            return [];
        }
    }

    /**
     * Saves a new template
     * @param {string} name - Template name
     * @param {Object} gridSettings - Current grid configuration
     * @returns {boolean} Success status
     */
    save(name, gridSettings) {
        try {
            const templates = this.getAll();
            const newTemplate = {
                id: Date.now().toString(), // Simple unique ID
                name: name.trim(),
                category: this.detectCategory(gridSettings),
                gridSettings: { ...gridSettings },
                created: new Date().toISOString()
            };

            // Check for duplicate names and append number if needed
            let finalName = newTemplate.name;
            let counter = 1;
            while (templates.some(t => t.name === finalName)) {
                finalName = `${newTemplate.name} (${counter})`;
                counter++;
            }
            newTemplate.name = finalName;

            templates.push(newTemplate);
            localStorage.setItem(this.storageKey, JSON.stringify(templates));
            return true;
        } catch (error) {
            console.error('Error saving template:', error);
            return false;
        }
    }

    /**
     * Deletes a template by ID
     * @param {string} templateId - Template ID to delete
     * @returns {boolean} Success status
     */
    delete(templateId) {
        try {
            const templates = this.getAll();
            const filtered = templates.filter(t => t.id !== templateId);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error deleting template:', error);
            return false;
        }
    }

    /**
     * Renames a template
     * @param {string} templateId - Template ID to rename
     * @param {string} newName - New template name
     * @returns {boolean} Success status
     */
    rename(templateId, newName) {
        try {
            const templates = this.getAll();
            const template = templates.find(t => t.id === templateId);
            if (!template) return false;

            // Check for duplicate names
            const trimmedName = newName.trim();
            if (templates.some(t => t.id !== templateId && t.name === trimmedName)) {
                return false; // Duplicate name
            }

            template.name = trimmedName;
            localStorage.setItem(this.storageKey, JSON.stringify(templates));
            return true;
        } catch (error) {
            console.error('Error renaming template:', error);
            return false;
        }
    }

    /**
     * Gets a template by ID
     * @param {string} templateId - Template ID
     * @returns {Object|null} Template object or null
     */
    getById(templateId) {
        const templates = this.getAll();
        return templates.find(t => t.id === templateId) || null;
    }

    /**
     * Auto-detects template category based on grid settings
     * @param {Object} gridSettings - Grid configuration
     * @returns {string} Category name
     */
    detectCategory(gridSettings) {
        const xLabel = (gridSettings.xAxisLabel || '').toLowerCase();
        const yLabel = (gridSettings.yAxisLabel || '').toLowerCase();
        
        // Physics indicators
        if (xLabel.includes('time') || yLabel.includes('velocity') || 
            yLabel.includes('position') || yLabel.includes('acceleration')) {
            return 'physics';
        }
        
        // Math indicators
        if (gridSettings.xAxisLabelType === 'radians' || 
            xLabel.includes('x') && yLabel.includes('y')) {
            return 'math';
        }
        
        // Paper/printing indicators
        if (!gridSettings.showAxes && !gridSettings.showAxisArrows) {
            return 'paper';
        }
        
        return 'custom';
    }

    /**
     * Generates a smart template name based on current settings
     * @param {Object} gridSettings - Grid configuration
     * @returns {string} Suggested template name
     */
    generateSmartName(gridSettings) {
        const xLabel = gridSettings.xAxisLabel || '';
        const yLabel = gridSettings.yAxisLabel || '';
        
        // Use axis labels if meaningful
        if (xLabel && yLabel && xLabel !== 'x' && yLabel !== 'y') {
            return `${yLabel} vs ${xLabel}`;
        }
        
        // Use grid size
        const xRange = Math.abs((gridSettings.xMax || 10) - (gridSettings.xMin || 0));
        const yRange = Math.abs((gridSettings.yMax || 10) - (gridSettings.yMin || 0));
        
        if (xRange === yRange) {
            return `${xRange}×${yRange} Grid`;
        }
        
        return `${xRange}×${yRange} Grid`;
    }

    /**
     * Populates the user templates dropdown
     * @param {HTMLSelectElement} selectElement - Dropdown element
     */
    populateDropdown(selectElement) {
        if (!selectElement) return;
        
        // Clear existing options except the first placeholder option
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
        
        const templates = this.getAll();
        
        if (templates.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No templates yet';
            option.disabled = true;
            selectElement.appendChild(option);
            return;
        }
        
        // Sort templates by category, then by name
        templates.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.name.localeCompare(b.name);
        });
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.category}: ${template.name}`;
            option.dataset.templateId = template.id;
            selectElement.appendChild(option);
        });
    }
}

// Create and export singleton instance
export const userTemplates = new UserTemplates();