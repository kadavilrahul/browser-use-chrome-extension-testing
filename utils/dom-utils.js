// DOM manipulation utilities
class DOMUtils {
    static async waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Timeout waiting for element: ${selector}`);
    }

    static async findSearchBox(selector) {
        const searchSelectors = [
            selector,
            'input[type="search"]',
            'input[name="q"]',
            'input[aria-label*="search" i]',
            'input[placeholder*="search" i]',
            'input[type="text"]',
            'textarea'
        ].filter(Boolean);

        for (const sel of searchSelectors) {
            try {
                const element = await this.waitForElement(sel);
                if (element.offsetParent !== null) return element;
            } catch (error) {
                continue;
            }
        }

        throw new Error('Could not find search box');
    }

    static async findClickableElement(action) {
        const maxRetries = 5;
        const retryDelay = 1000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                if (action.text) {
                    // Try exact text match first
                    const elements = document.querySelectorAll(`a, button, [role="button"]`);
                    const exactMatch = Array.from(elements).find(element => element.textContent.trim() === action.text);
                    if (exactMatch && exactMatch.offsetParent !== null) {
                        return exactMatch;
                    }

                    // Try partial text match
                    const partialMatch = Array.from(elements).find(element => element.textContent.includes(action.text) && element.offsetParent !== null);
                    if (partialMatch) {
                        return partialMatch;
                    }
                }

                if (action.selector) {
                    const element = await this.waitForElement(action.selector);
                    if (element.offsetParent !== null) return element;
                }

                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        throw new Error('Could not find clickable element');
    }
}

export default DOMUtils;
