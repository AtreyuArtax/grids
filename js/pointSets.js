/**
 * Point Sets Module
 * Manages user-created point sets with localStorage persistence
 */

class PointSets {
    constructor() {
        this.storageKey = 'gridPointSets';
    }

    /**
     * Gets all point sets from localStorage
     * @returns {Array} Array of point sets
     */
    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Error loading point sets:', error);
            return [];
        }
    }

    /**
     * Saves a new point set
     * @param {string} name - Point set name
     * @param {Array} points - Array of point data
     * @param {Object} pointsStyle - Points styling configuration
     * @param {Object} gridState - Grid configuration
     * @returns {boolean} Success status
     */
    save(name, points, pointsStyle, gridState) {
        try {
            const pointSets = this.getAll();
            const newPointSet = {
                id: Date.now().toString(), // Simple unique ID
                name: name.trim(),
                points: [...points],
                pointsStyle: { ...pointsStyle },
                gridState: { ...gridState },
                created: new Date().toISOString()
            };

            // Check for duplicate names and append number if needed
            let finalName = newPointSet.name;
            let counter = 1;
            while (pointSets.some(ps => ps.name === finalName)) {
                finalName = `${newPointSet.name} (${counter})`;
                counter++;
            }
            newPointSet.name = finalName;

            pointSets.push(newPointSet);
            localStorage.setItem(this.storageKey, JSON.stringify(pointSets));
            return newPointSet.name; // Return final name for feedback
        } catch (error) {
            console.error('Error saving point set:', error);
            return false;
        }
    }

    /**
     * Deletes a point set by ID
     * @param {string} pointSetId - Point set ID to delete
     * @returns {boolean} Success status
     */
    delete(pointSetId) {
        try {
            const pointSets = this.getAll();
            const filtered = pointSets.filter(ps => ps.id !== pointSetId);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error deleting point set:', error);
            return false;
        }
    }

    /**
     * Renames a point set
     * @param {string} pointSetId - Point set ID to rename
     * @param {string} newName - New point set name
     * @returns {boolean} Success status
     */
    rename(pointSetId, newName) {
        try {
            const pointSets = this.getAll();
            const pointSet = pointSets.find(ps => ps.id === pointSetId);
            if (!pointSet) return false;

            // Check for duplicate names
            const trimmedName = newName.trim();
            if (pointSets.some(ps => ps.id !== pointSetId && ps.name === trimmedName)) {
                return false; // Duplicate name
            }

            pointSet.name = trimmedName;
            localStorage.setItem(this.storageKey, JSON.stringify(pointSets));
            return true;
        } catch (error) {
            console.error('Error renaming point set:', error);
            return false;
        }
    }

    /**
     * Gets a specific point set by ID
     * @param {string} pointSetId - Point set ID
     * @returns {Object|null} Point set object or null if not found
     */
    getById(pointSetId) {
        const pointSets = this.getAll();
        return pointSets.find(ps => ps.id === pointSetId) || null;
    }

    /**
     * Gets a specific point set by name
     * @param {string} name - Point set name
     * @returns {Object|null} Point set object or null if not found
     */
    getByName(name) {
        const pointSets = this.getAll();
        return pointSets.find(ps => ps.name === name) || null;
    }

    /**
     * Generates a smart name for a point set based on its content
     * @param {Array} points - Array of point data
     * @returns {string} Suggested name
     */
    generateSmartName(points) {
        if (!points || points.length === 0) {
            return 'Empty Set';
        }

        const count = points.length;
        const hasLabels = points.some(p => p.label && p.label.trim());
        const hasCurves = points.some(p => p.curveIntensity && p.curveIntensity !== 0);

        let name = `${count} Point${count > 1 ? 's' : ''}`;
        
        if (hasLabels) {
            name += ' (Labeled)';
        }
        
        if (hasCurves) {
            name += ' (Curved)';
        }

        // Add range info if meaningful
        if (count > 1) {
            const xValues = points.map(p => p.x).filter(x => typeof x === 'number');
            const yValues = points.map(p => p.y).filter(y => typeof y === 'number');
            
            if (xValues.length > 1) {
                const xRange = Math.max(...xValues) - Math.min(...xValues);
                const yRange = Math.max(...yValues) - Math.min(...yValues);
                
                if (xRange > yRange * 2) {
                    name += ' (Wide)';
                } else if (yRange > xRange * 2) {
                    name += ' (Tall)';
                }
            }
        }

        return name;
    }

    /**
     * Gets count of stored point sets
     * @returns {number} Number of stored point sets
     */
    getCount() {
        return this.getAll().length;
    }

    /**
     * Clears all point sets (with confirmation)
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing point sets:', error);
            return false;
        }
    }
}

// Export singleton instance
export const pointSets = new PointSets();