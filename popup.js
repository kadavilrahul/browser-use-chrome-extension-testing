// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('userInput');
    const executeButton = document.getElementById('executeButton');
    const verifyApiButton = document.getElementById('verifyApi');
    const testApiButton = document.getElementById('testApi');
    const statusDiv = document.getElementById('status');
    const debugOutput = document.getElementById('debugOutput');

    function updateStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : 'success';
    }

    function updateDebug(data) {
        debugOutput.textContent = JSON.stringify(data, null, 2);
    }

    // Helper function to send messages to background script
    async function sendMessage(message) {
        try {
            const response = await chrome.runtime.sendMessage(message);
            console.log('Response received:', response);
            if (response?.error) {
                throw new Error(response.error);
            }
            return response;
        } catch (error) {
            console.error('Message error:', error);
            throw error;
        }
    }

    executeButton.addEventListener('click', async () => {
        const input = userInput.value.trim();
        if (!input) {
            updateStatus('Please enter a task', true);
            return;
        }

        try {
            updateStatus('Processing...');
            const response = await sendMessage({
                action: 'processUserInput',
                input: input
            });

            updateStatus('Task executed successfully!');
            updateDebug(response);
        } catch (error) {
            updateStatus(`Error: ${error.message}`, true);
            updateDebug({ error: error.message });
        }
    });

    verifyApiButton.addEventListener('click', async () => {
        try {
            updateStatus('Verifying API connection...');
            const response = await sendMessage({ action: 'verifyApi' });
            
            updateStatus('API connection verified successfully!');
            updateDebug(response);
        } catch (error) {
            updateStatus(`API Error: ${error.message}`, true);
            updateDebug({ error: error.message });
        }
    });

    testApiButton.addEventListener('click', async () => {
        try {
            updateStatus('Testing API...');
            const response = await sendMessage({ action: 'testApi' });
            
            updateStatus('API test completed successfully!');
            updateDebug(response);
        } catch (error) {
            updateStatus(`API Test Error: ${error.message}`, true);
            updateDebug({ error: error.message });
        }
    });
});