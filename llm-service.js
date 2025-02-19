export class LLMService {
    constructor() {
        this.apiKey = "AIzaSyA5bfenANZwEDV5vfSWWaFWuX4cD2ejJSQ";
        this.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/";
        this.model = "gemini-2.0-flash-exp";
    }

    async processUserInput(userInput) {
        const prompt = `
            Convert the following user request into a series of web actions.
            Focus on clicking and searching actions.
            Available actions:
            1. navigate - Go to a URL
            2. click - Click an element (using text content or CSS selector)
            3. search - Type into a search box or input field
            4. wait - Wait for a specified time in milliseconds

            Rules:
            - For clicking, prefer using text content over selectors when possible
            - For search boxes, try these selectors in order:
              1. input[type="search"]
              2. input[name="q"]
              3. input[aria-label*="search" i]
              4. input[placeholder*="search" i]
            - Always add a wait action (1000-2000ms) after navigation or search
            - If clicking a specific text, use: text="exact text"
            
            User request: ${userInput}
            
            Example format:
            [
                {"type": "navigate", "url": "https://www.google.com"},
                {"type": "wait", "ms": 1000},
                {"type": "search", "selector": "input[name='q']", "text": "search term"},
                {"type": "wait", "ms": 1000},
                {"type": "click", "text": "exact link text"}
            ]`;

        try {
            const response = await fetch(`${this.endpoint}${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Details:', errorData);
                throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('Raw API Response:', data);

            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid API response format');
            }

            const actionText = data.candidates[0].content.parts[0].text;
            console.log('Action text:', actionText);

            // Extract the JSON array from the response
            const jsonMatch = actionText.match(/\[\s*\{.*?\}\s*\]/s);
            if (!jsonMatch) {
                throw new Error('No valid JSON array found in response');
            }

            const actions = JSON.parse(jsonMatch[0]);
            console.log('Parsed actions:', actions);
            return actions;
        } catch (error) {
            console.error('Error processing user input:', error);
            throw error;
        }
    }

    async verifyApiConnection() {
        try {
            const response = await fetch(`${this.endpoint}${this.model}?key=${this.apiKey}`);
            const data = await response.json();
            console.log('API Verification Response:', data);
            return { 
                success: response.ok,
                details: data
            };
        } catch (error) {
            console.error('API Verification Error:', error);
            return { 
                success: false, 
                error: error.message,
                details: error
            };
        }
    }

    async testApiResponse() {
        try {
            const testInput = 'Go to google.com and search for test';
            console.log('Testing API with input:', testInput);
            const response = await this.processUserInput(testInput);
            return { 
                success: true, 
                response,
                message: 'API test successful'
            };
        } catch (error) {
            console.error('API Test Error:', error);
            return { 
                success: false, 
                error: error.message,
                details: error
            };
        }
    }
}