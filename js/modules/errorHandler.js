// errorHandler.js
// Centralized error handling system for consistent error management and user feedback

export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.isDebugMode = false; // Set to true for development
        this.setupGlobalErrorHandling();
    }

    /**
     * Sets up global error handling for unhandled errors
     */
    setupGlobalErrorHandling() {
        // Handle unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: 'UNHANDLED_ERROR',
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'UNHANDLED_PROMISE_REJECTION'
            });
        });
    }

    /**
     * Main error handling method
     * @param {Error|string} error - Error object or error message
     * @param {Object} context - Additional context information
     * @param {string} context.component - Component where error occurred
     * @param {string} context.action - Action being performed when error occurred
     * @param {string} context.type - Error type (WARNING, ERROR, FATAL)
     * @param {boolean} context.showUser - Whether to show error to user
     * @param {Function} context.callback - Optional callback after handling error
     */
    handleError(error, context = {}) {
        const errorData = this.normalizeError(error, context);
        
        // Log the error
        this.logError(errorData);
        
        // Show to user if requested or if it's a fatal error
        if (context.showUser || errorData.type === 'FATAL') {
            this.showUserError(errorData);
        }
        
        // Execute callback if provided
        if (context.callback && typeof context.callback === 'function') {
            try {
                context.callback(errorData);
            } catch (callbackError) {
                this.handleError(callbackError, { 
                    component: 'ErrorHandler', 
                    action: 'callback execution',
                    type: 'ERROR'
                });
            }
        }
        
        return errorData;
    }

    /**
     * Normalizes error data into a consistent format
     * @param {Error|string} error - Error to normalize
     * @param {Object} context - Error context
     * @returns {Object} Normalized error data
     */
    normalizeError(error, context = {}) {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : null;
        
        return {
            id: this.generateErrorId(),
            timestamp,
            message: errorMessage,
            stack,
            component: context.component || 'Unknown',
            action: context.action || 'Unknown',
            type: context.type || 'ERROR',
            filename: context.filename,
            line: context.line,
            column: context.column,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }

    /**
     * Logs error to console and internal log
     * @param {Object} errorData - Normalized error data
     */
    logError(errorData) {
        // Add to internal log
        this.errorLog.push(errorData);
        
        // Keep only last 100 errors to prevent memory issues
        if (this.errorLog.length > 100) {
            this.errorLog.shift();
        }
        
        // Console logging based on error type
        const logMessage = `[${errorData.type}] ${errorData.component}/${errorData.action}: ${errorData.message}`;
        
        switch (errorData.type) {
            case 'WARNING':
                console.warn(logMessage, errorData);
                break;
            case 'FATAL':
                console.error('FATAL ERROR:', logMessage, errorData);
                break;
            case 'ERROR':
            default:
                console.error(logMessage, errorData);
                break;
        }
        
        // Detailed logging in debug mode
        if (this.isDebugMode) {
            console.group(`Error Details [${errorData.id}]`);
            console.log('Timestamp:', errorData.timestamp);
            console.log('Component:', errorData.component);
            console.log('Action:', errorData.action);
            console.log('Message:', errorData.message);
            if (errorData.stack) console.log('Stack:', errorData.stack);
            console.groupEnd();
        }
    }

    /**
     * Shows error message to user via UI
     * @param {Object} errorData - Error data to display
     */
    showUserError(errorData) {
        const userMessage = this.createUserFriendlyMessage(errorData);
        
        // Try to use existing message box function if available
        if (typeof window.showMessageBox === 'function') {
            window.showMessageBox(userMessage);
        } else {
            // Fallback to alert or create custom notification
            this.showFallbackMessage(userMessage, errorData.type);
        }
    }

    /**
     * Creates user-friendly error messages
     * @param {Object} errorData - Error data
     * @returns {string} User-friendly message
     */
    createUserFriendlyMessage(errorData) {
        const baseMessages = {
            'VALIDATION_ERROR': 'Please check your input and try again.',
            'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
            'FILE_ERROR': 'There was an issue with the file operation.',
            'RENDERING_ERROR': 'There was an issue rendering the grid. Please try refreshing the page.',
            'CALCULATION_ERROR': 'There was an error in the calculations. Please check your equation syntax.',
            'EXPORT_ERROR': 'There was an issue exporting your grid. Please try again.',
            'FATAL': 'A critical error occurred. Please refresh the page and try again.'
        };

        // Look for specific error type in message or use component-based message
        const errorType = this.categorizeError(errorData);
        const baseMessage = baseMessages[errorType] || 'An unexpected error occurred.';
        
        let userMessage = baseMessage;
        
        // Add specific details for certain error types
        if (errorData.type === 'VALIDATION_ERROR' || errorData.component === 'equations') {
            userMessage += `\n\nDetails: ${errorData.message}`;
        }
        
        // Add error ID for debugging in development
        if (this.isDebugMode) {
            userMessage += `\n\nError ID: ${errorData.id}`;
        }
        
        return userMessage;
    }

    /**
     * Categorizes errors for user-friendly messaging
     * @param {Object} errorData - Error data
     * @returns {string} Error category
     */
    categorizeError(errorData) {
        const message = errorData.message.toLowerCase();
        const component = errorData.component.toLowerCase();
        
        if (message.includes('validation') || message.includes('invalid')) {
            return 'VALIDATION_ERROR';
        }
        if (message.includes('network') || message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        if (component.includes('plotter') || component.includes('grid')) {
            return 'RENDERING_ERROR';
        }
        if (component.includes('equation') || message.includes('equation')) {
            return 'CALCULATION_ERROR';
        }
        if (message.includes('export') || message.includes('download')) {
            return 'EXPORT_ERROR';
        }
        if (message.includes('file') || message.includes('blob')) {
            return 'FILE_ERROR';
        }
        
        return 'GENERAL_ERROR';
    }

    /**
     * Fallback message display when showMessageBox is not available
     * @param {string} message - Message to display
     * @param {string} type - Error type for styling
     */
    showFallbackMessage(message, type) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${type.toLowerCase()}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'FATAL' ? '#dc3545' : '#ffc107'};
            color: ${type === 'FATAL' ? 'white' : '#212529'};
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
            cursor: pointer;
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds or on click
        const removeToast = () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        };
        
        toast.addEventListener('click', removeToast);
        setTimeout(removeToast, 5000);
    }

    /**
     * Generates unique error ID
     * @returns {string} Unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Convenience methods for different error types
     */
    
    warn(message, context = {}) {
        return this.handleError(message, { ...context, type: 'WARNING' });
    }
    
    error(message, context = {}) {
        return this.handleError(message, { ...context, type: 'ERROR', showUser: true });
    }
    
    fatal(message, context = {}) {
        return this.handleError(message, { ...context, type: 'FATAL', showUser: true });
    }
    
    validation(message, context = {}) {
        return this.handleError(message, { ...context, type: 'VALIDATION_ERROR', showUser: true });
    }

    /**
     * Gets error log for debugging
     * @param {number} limit - Number of recent errors to return
     * @returns {Array} Recent error log entries
     */
    getErrorLog(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    /**
     * Clears error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * Enables/disables debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.isDebugMode = enabled;
        console.log(`Error Handler debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Exports error log for external analysis
     * @returns {string} JSON string of error log
     */
    exportErrorLog() {
        return JSON.stringify(this.errorLog, null, 2);
    }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

// Export convenience functions for easy importing
export const { warn, error, fatal, validation, handleError } = errorHandler;