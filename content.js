import DOMUtils from './utils/dom-utils.js';
import ActionUtils from './utils/action-utils.js';

console.log('Content script loaded!');

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    // Handle ping message to check if content script is loaded
    if (request.action === 'ping') {
        sendResponse({ status: 'ok' });
        return;
    }

    // Handle action execution
    if (request.action === 'executeActions') {
        executeWebActions(request.actions)
            .then(() => {
                console.log('Actions executed successfully');
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Execution error:', error);
                sendResponse({ error: error.message });
            });
        return true; // Keep the message channel open for async response
    }
});

async function executeWebActions(actions) {
    try {
        console.log('Starting web actions execution:', actions);

        for (const action of actions) {
            console.log('Executing action:', action);

            try {
                switch (action.type) {
                    case 'navigate':
                        console.log('Navigating to:', action.url);
                        // Send success response before navigation
                        sendResponse({ success: true });
                        // Perform navigation
                        window.location.href = action.url;
                        return; // Stop execution as page will reload
                        
                    case 'search':
                        console.log('Searching:', action.text);
                        const searchElement = await DOMUtils.findSearchBox(action.selector);
                        await ActionUtils.typeIntoElement(searchElement, action.text);
                        await ActionUtils.submitSearch(searchElement);
                        break;

                    case 'click':
                        console.log('Clicking:', action.text || action.selector);
                        const element = await DOMUtils.findClickableElement(action);
                        await ActionUtils.simulateClick(element);
                        break;

                    case 'wait':
                        console.log('Waiting for:', action.ms, 'ms');
                        await new Promise(resolve => setTimeout(resolve, action.ms));
                        break;

                    default:
                        throw new Error(`Unknown action type: ${action.type}`);
                }
            } catch (error) {
                console.error(`Error executing action ${action.type}:`, error);
                throw new Error(`Failed to execute ${action.type}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('Fatal error during action execution:', error);
        throw error;
    }
}