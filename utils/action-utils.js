// Action execution utilities
class ActionUtils {
    static async typeIntoElement(element, text) {
        // Focus and clear the input
        element.focus();
        element.value = '';
        
        // Type the text with a slight delay
        for (const char of text) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    static async simulateClick(element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Highlight the element briefly
        const originalBackground = element.style.backgroundColor;
        element.style.backgroundColor = 'yellow';
        await new Promise(resolve => setTimeout(resolve, 200));

        // Simulate hover and click
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.click();

        // Reset background
        element.style.backgroundColor = originalBackground;

        // Wait after clicking
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    static async submitSearch(element) {
        element.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export default ActionUtils;
