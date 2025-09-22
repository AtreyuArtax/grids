// modalInit.js
// Initialize all modals using the modal manager

import { modalManager } from './modules/modalManager.js';

/**
 * Initialize all application modals
 */
export function initializeModals() {
    try {
        // Privacy Policy Modal
        modalManager.register('privacyPolicyModal', {
            triggerSelector: '#privacyPolicyLink',
            closeSelector: '#closePrivacyPolicy, .privacy-close-btn',
            closeOnOverlayClick: true,
            closeOnEscape: true
        });

        // Equation Info Modal
        modalManager.register('equationInfoModal', {
            triggerSelector: '#equationInfoIcon',
            closeSelector: '#closeEquationInfo, .info-close-btn',
            closeOnOverlayClick: true,
            closeOnEscape: true
        });

        // Points Info Modal
        modalManager.register('pointsInfoModal', {
            triggerSelector: '#pointsInfoIcon',
            closeSelector: '#closePointsInfo, .info-close-btn',
            closeOnOverlayClick: true,
            closeOnEscape: true
        });

        console.log('✅ All modals initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize modals:', error);
        return false;
    }
}