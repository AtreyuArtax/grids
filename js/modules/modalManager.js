// modalManager.js
// Centralized modal management system for consistent behavior across all modals

export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.setupGlobalEventListeners();
    }

    /**
     * Registers a modal with the manager
     * @param {string} id - Modal element ID
     * @param {Object} options - Configuration options
     * @param {string} options.triggerSelector - CSS selector for trigger element
     * @param {string} options.closeSelector - CSS selector for close button
     * @param {Function} options.onOpen - Callback when modal opens
     * @param {Function} options.onClose - Callback when modal closes
     * @param {boolean} options.closeOnOverlayClick - Whether to close on overlay click (default: true)
     * @param {boolean} options.closeOnEscape - Whether to close on Escape key (default: true)
     */
    register(id, options = {}) {
        const modal = document.getElementById(id);
        if (!modal) {
            console.warn(`Modal with ID '${id}' not found`);
            return;
        }

        const config = {
            element: modal,
            triggerSelector: options.triggerSelector,
            closeSelector: options.closeSelector,
            onOpen: options.onOpen || (() => {}),
            onClose: options.onClose || (() => {}),
            closeOnOverlayClick: options.closeOnOverlayClick !== false,
            closeOnEscape: options.closeOnEscape !== false,
            isOpen: false
        };

        this.modals.set(id, config);
        this.setupModalEvents(id, config);
    }

    /**
     * Sets up event listeners for a specific modal
     * @param {string} id - Modal ID
     * @param {Object} config - Modal configuration
     */
    setupModalEvents(id, config) {
        // Setup trigger element
        if (config.triggerSelector) {
            const trigger = document.querySelector(config.triggerSelector);
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open(id);
                });
            }
        }

        // Setup close button
        if (config.closeSelector) {
            const closeBtn = config.element.querySelector(config.closeSelector);
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.close(id);
                });
            }
        }

        // Setup overlay click to close
        if (config.closeOnOverlayClick) {
            config.element.addEventListener('click', (e) => {
                if (e.target === config.element) {
                    this.close(id);
                }
            });
        }
    }

    /**
     * Sets up global event listeners (ESC key, etc.)
     */
    setupGlobalEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    /**
     * Opens a modal
     * @param {string} id - Modal ID to open
     */
    open(id) {
        const config = this.modals.get(id);
        if (!config) {
            console.warn(`Modal '${id}' not registered`);
            return;
        }

        if (config.isOpen) return;

        // Close other modals first
        this.closeAll();

        config.element.style.display = 'flex';
        config.isOpen = true;
        
        // Add animation class if available
        requestAnimationFrame(() => {
            config.element.classList.add('show');
        });

        config.onOpen();

        // Focus management for accessibility
        this.focusModal(config.element);
    }

    /**
     * Closes a modal
     * @param {string} id - Modal ID to close
     */
    close(id) {
        const config = this.modals.get(id);
        if (!config || !config.isOpen) return;

        config.element.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (!config.isOpen) { // Double-check in case it was reopened
                config.element.style.display = 'none';
            }
        }, 300);

        config.isOpen = false;
        config.onClose();
    }

    /**
     * Closes all open modals
     */
    closeAll() {
        for (const [id, config] of this.modals) {
            if (config.isOpen) {
                this.close(id);
            }
        }
    }

    /**
     * Checks if a modal is open
     * @param {string} id - Modal ID
     * @returns {boolean} True if modal is open
     */
    isOpen(id) {
        const config = this.modals.get(id);
        return config ? config.isOpen : false;
    }

    /**
     * Manages focus for accessibility
     * @param {HTMLElement} modal - Modal element
     */
    focusModal(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Updates modal content dynamically
     * @param {string} id - Modal ID
     * @param {Object} content - Content to update
     * @param {string} content.title - Modal title
     * @param {string} content.body - Modal body HTML
     */
    updateContent(id, content) {
        const config = this.modals.get(id);
        if (!config) return;

        if (content.title) {
            const titleElement = config.element.querySelector('h2, h3, .modal-title');
            if (titleElement) {
                titleElement.textContent = content.title;
            }
        }

        if (content.body) {
            const bodyElement = config.element.querySelector('.info-modal-body, .modal-body, .privacy-modal-content p');
            if (bodyElement) {
                bodyElement.innerHTML = content.body;
            }
        }
    }
}

// Create and export a singleton instance
export const modalManager = new ModalManager();