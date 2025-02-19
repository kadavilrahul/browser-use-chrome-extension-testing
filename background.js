import { LLMService } from './llm-service.js';

const llmService = new LLMService();

// Track active tabs and their states
const tabStates = new Map();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        console.log('Tab loaded:', tab.url);
        tabStates.set(tabId, { url: tab.url, ready: true });
        
        // Automatically reinject content script after navigation
        executeContentScript(tabId).then(() => {
            console.log('Content script reinjected after navigation');
        });
    }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
});

// Helper function to execute content script
async function executeContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['lib/jquery.min.js', 'utils/dom-utils.js', 'utils/action-utils.js', 'content.js']
        });
        console.log('Content script injected successfully');
        return true;
    } catch (error) {
        console.error('Error injecting content script:', error);
        return false;
    }
}

// Helper function to wait for tab to be ready
async function waitForTab(tabId, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const state = tabStates.get(tabId);
        if (state?.ready) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
}

// Helper function to check if content script is responsive
async function isContentScriptResponsive(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return true;
    } catch {
        return false;
    }
}

// Execute actions with proper navigation handling
async function executeActions(tabId, actions) {
    console.log('Executing actions:', actions);
    
    try {
        // Ensure content script is injected
        if (!await isContentScriptResponsive(tabId)) {
            console.log('Injecting content script');
            await executeContentScript(tabId);
        }
        
        // Execute each action
        for (const action of actions) {
            try {
                if (action.type === 'navigate') {
                    // Update tab state before navigation
                    tabStates.set(tabId, { url: action.url, ready: false });
                    
                    // Send navigation message
                    await chrome.tabs.sendMessage(tabId, {
                        action: 'executeActions',
                        actions: [action]
                    });
                    
                    // Wait for navigation to complete
                    console.log('Waiting for navigation to:', action.url);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // Execute non-navigation actions
                    await chrome.tabs.sendMessage(tabId, {
                        action: 'executeActions',
                        actions: [action]
                    });
                }
            } catch (error) {
                console.error('Error executing action:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('Error executing actions:', error);
        throw error;
    }
}

// Function to ensure content script is injected
async function ensureContentScriptInjected(tabId) {
    try {
        // Check if we can inject into this tab
        const tab = await chrome.tabs.get(tabId);
        if (tab.url.startsWith('chrome://')) {
            throw new Error('Cannot inject into chrome:// pages');
        }

        // Check if we recently injected the script
        const state = tabStates.get(tabId);
        const now = Date.now();
        if (state && now - state.lastInjected < 1000) {
            // Wait a bit if we just injected
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Try sending a test message
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
            // If message fails, inject the script
            console.log('Injecting content script into tab:', tabId);
            await executeContentScript(tabId);
            tabStates.set(tabId, { lastInjected: Date.now() });
            // Wait for script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Error ensuring content script:', error);
        throw error;
    }
}

// Function to wait for navigation to complete
async function waitForNavigation(tabId) {
    return new Promise((resolve) => {
        let timeout;
        
        function listener(changedTabId, changeInfo) {
            if (changedTabId === tabId && changeInfo.status === 'complete') {
                cleanup();
                // Give the page a moment to stabilize
                setTimeout(resolve, 1000);
            }
        }

        function cleanup() {
            chrome.tabs.onUpdated.removeListener(listener);
            if (timeout) clearTimeout(timeout);
        }

        // Set a timeout in case navigation takes too long
        timeout = setTimeout(() => {
            cleanup();
            resolve();
        }, 30000);

        chrome.tabs.onUpdated.addListener(listener);
    });
}

// Function to execute a batch of actions
async function executeActionBatch(tabId, actions) {
    console.log('Executing action batch:', actions);
    
    // Maximum retries for each batch
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Ensure content script is loaded
            await ensureContentScriptInjected(tabId);
            
            // Send actions to content script
            return await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, {
                    action: 'executeActions',
                    actions: actions
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
            if (attempt === maxRetries - 1) throw error;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Function to execute all actions with proper navigation handling
async function executeAllActions(tabId, actions) {
    let currentBatch = [];
    let results = [];

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        
        if (action.type === 'navigate') {
            // Execute any pending actions before navigation
            if (currentBatch.length > 0) {
                try {
                    const result = await executeActionBatch(tabId, currentBatch);
                    results.push(result);
                } catch (error) {
                    console.error('Error executing batch:', error);
                }
                currentBatch = [];
            }

            // Perform navigation
            await chrome.tabs.update(tabId, { url: action.url });
            await waitForNavigation(tabId);
            // Clear the injection state after navigation
            tabStates.delete(tabId);
            continue;
        }

        currentBatch.push(action);

        // Execute batch if it's the last action or before another navigation
        if (i === actions.length - 1 || actions[i + 1].type === 'navigate') {
            try {
                const result = await executeActionBatch(tabId, currentBatch);
                results.push(result);
            } catch (error) {
                console.error('Error executing batch:', error);
                throw error;
            }
            currentBatch = [];
        }
    }

    return results;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    const handleRequest = async () => {
        try {
            switch (request.action) {
                case 'processUserInput': {
                    // Generate actions from user input
                    const actions = await llmService.processUserInput(request.input);
                    console.log('Generated actions:', actions);

                    // Get active tab or create new one
                    let tab;
                    try {
                        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        if (!tab) throw new Error('No active tab');
                    } catch (error) {
                        console.log('Creating new tab');
                        tab = await chrome.tabs.create({ url: 'about:blank' });
                    }

                    // Execute all actions with proper navigation handling
                    await executeAllActions(tab.id, actions);
                    return { success: true, actions };
                }

                default:
                    throw new Error(`Unknown action: ${request.action}`);
            }
        } catch (error) {
            console.error('Error handling request:', error);
            return { error: error.message };
        }
    };

    // Execute the async function and send response
    handleRequest().then(sendResponse);
    return true; // Will respond asynchronously
});