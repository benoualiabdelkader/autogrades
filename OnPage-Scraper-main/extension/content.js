// OnPage.dev Content Script - Professional Web Scraper
// Version: 1.0.0

(function () {
    'use strict';

    // Prevent multiple initializations
    if (window.OnPageContentScript) {
        return;
    }

    // Global namespace
    window.OnPageContentScript = true;

    class OnPageContentScript {
        constructor() {
            this.isInitialized = false;
            this.isSelecting = false;
            this.overlay = null;
            this.instructionPanel = null;
            this.selectedElements = [];
            this.highlightedElement = null;
            this.eventHandlers = {};
            this.selectionHistory = []; // Add history for C (Child) navigating back

            this.init();
        }

        // Utility function to safely get className as string
        getElementClassName(element) {
            if (!element || !element.className) return '';
            return element.className.toString().trim();
        }

        init() {
            if (this.isInitialized) return;

            // Bind event handlers
            this.eventHandlers = {
                mouseover: this.handleMouseOver.bind(this),
                mouseout: this.handleMouseOut.bind(this),
                click: this.handleClick.bind(this),
                message: this.handleMessage.bind(this),
                keydown: this.handleKeyDown.bind(this)
            };

            // Listen for messages from popup/background
            chrome.runtime.onMessage.addListener(this.eventHandlers.message);

            // Create UI elements
            this.createUI();

            this.isInitialized = true;
        }

        createUI() {
            // Remove existing UI if any
            this.removeUI();

            // Add CSS classes for selection styling
            this.addSelectionStyles();

            // Create overlay
            this.overlay = this.createElement('div', {
                id: 'onpage-overlay',
                style: `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(26, 26, 26, 0.03) !important;
                    z-index: 2147483647 !important;
                    pointer-events: none !important;
                    display: none !important;
                `
            });

            // Create instruction panel
            this.instructionPanel = this.createElement('div', {
                id: 'onpage-instructions',
                style: `
                    position: fixed !important;
                    top: 20px !important;
                    right: 20px !important;
                    background: #1a1a1a !important;
                    color: #faf9f6 !important;
                    padding: 24px !important;
                    border: 3px solid #d42c2c !important;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4) !important;
                    z-index: 2147483648 !important;
                    max-width: 360px !important;
                    font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    display: none !important;
                    pointer-events: auto !important;
                    backdrop-filter: blur(20px) !important;
                `
            });

            this.instructionPanel.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Hover to highlight • Click to select</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.7; color: #ffeb3b;">Hotkeys: [S] Select • [P] Parent • [C] Child</p>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="onpage-finish" style="
                        background: #faf9f6 !important;
                        color: #1a1a1a !important;
                        border: 1px solid #faf9f6 !important;
                        padding: 12px 24px !important;
                        cursor: pointer !important;
                        font-size: 14px !important;
                        font-weight: 600 !important;
                        transition: all 0.2s !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        font-family: 'Source Sans Pro', sans-serif !important;
                    ">Finish</button>
                    <button id="onpage-cancel" style="
                        background: transparent !important;
                        color: #faf9f6 !important;
                        border: 1px solid #faf9f6 !important;
                        padding: 12px 24px !important;
                        cursor: pointer !important;
                        font-size: 14px !important;
                        font-weight: 600 !important;
                        transition: all 0.2s !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        font-family: 'Source Sans Pro', sans-serif !important;
                    ">Cancel</button>
                </div>
                <div id="onpage-selection-count" style="
                    text-align: center; 
                    margin-top: 16px; 
                    font-size: 12px; 
                    opacity: 0.8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">0 elements selected</div>
            `;

            // Add hover effects
            const finishBtn = this.instructionPanel.querySelector('#onpage-finish');
            const cancelBtn = this.instructionPanel.querySelector('#onpage-cancel');

            finishBtn.addEventListener('mouseenter', () => {
                finishBtn.style.background = '#1a1a1a !important';
                finishBtn.style.color = '#faf9f6 !important';
            });
            finishBtn.addEventListener('mouseleave', () => {
                finishBtn.style.background = '#faf9f6 !important';
                finishBtn.style.color = '#1a1a1a !important';
            });

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = '#faf9f6 !important';
                cancelBtn.style.color = '#1a1a1a !important';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'transparent !important';
                cancelBtn.style.color = '#faf9f6 !important';
            });

            // Add event listeners
            finishBtn.addEventListener('click', () => this.finishSelection());
            cancelBtn.addEventListener('click', () => this.cancelSelection());

            // Append to document
            document.body.appendChild(this.overlay);
            document.body.appendChild(this.instructionPanel);
        }

        createElement(tag, attributes = {}) {
            const element = document.createElement(tag);
            Object.keys(attributes).forEach(key => {
                if (key === 'style') {
                    element.style.cssText = attributes[key];
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            });
            return element;
        }

        addSelectionStyles() {
            // Add CSS classes for hover and selection states
            if (!document.getElementById('onpage-selection-styles')) {
                const style = document.createElement('style');
                style.id = 'onpage-selection-styles';
                style.textContent = `
                    /* Hover state - clean blue border */
                    .onpage-hover-element {
                        border: 2px solid #3b82f6 !important;
                        outline: none !important;
                        transition: all 0.2s ease !important;
                        position: relative !important;
                        z-index: 1000 !important;
                    }
                    
                    /* Selected state - persistent blue border with subtle background */
                    .onpage-selected-element {
                        border: 2px solid #3b82f6 !important;
                        background-color: rgba(59, 130, 246, 0.1) !important;
                        outline: none !important;
                        position: relative !important;
                        z-index: 1001 !important;
                        transition: all 0.2s ease !important;
                    }
                    
                    /* Ensure selected state overrides hover */
                    .onpage-selected-element.onpage-hover-element {
                        background-color: rgba(59, 130, 246, 0.15) !important;
                    }
                    
                    /* Restore box-sizing to prevent layout shifts */
                    .onpage-hover-element,
                    .onpage-selected-element {
                        box-sizing: border-box !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        createElementTooltip(element) {
            this.removeElementTooltip();

            const rect = element.getBoundingClientRect();
            const tooltip = this.createElement('div', {
                id: 'onpage-element-tooltip',
                style: `
                    position: fixed !important;
                    top: ${rect.top - 60}px !important;
                    left: ${rect.left}px !important;
                    background: #1a1a1a !important;
                    color: #faf9f6 !important;
                    padding: 8px 12px !important;
                    font-family: 'Source Sans Pro', monospace !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    z-index: 2147483649 !important;
                    pointer-events: none !important;
                    border: 1px solid #d42c2c !important;
                    max-width: 300px !important;
                    word-break: break-word !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                `
            });

            const tagName = element.tagName.toLowerCase();
            // Safely handle className using utility function
            const classNameStr = this.getElementClassName(element);
            const className = classNameStr ? `.${classNameStr.split(' ')[0]}` : '';
            const id = element.id ? `#${element.id}` : '';

            tooltip.textContent = `${tagName}${id}${className}`;
            document.body.appendChild(tooltip);
            this.currentTooltip = tooltip;
        }

        removeElementTooltip() {
            if (this.currentTooltip) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
            }
        }

        removeUI() {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
            if (this.instructionPanel) {
                this.instructionPanel.remove();
                this.instructionPanel = null;
            }
            this.removeElementTooltip();

            // Remove selection styles
            const selectionStyle = document.getElementById('onpage-selection-styles');
            if (selectionStyle) {
                selectionStyle.remove();
            }
        }

        handleMessage(message, sender, sendResponse) {
            try {
                switch (message.action) {
                    case 'startElementSelection':
                        this.startElementSelection();
                        sendResponse({ success: true });
                        break;

                    case 'stopElementSelection':
                        this.stopElementSelection();
                        sendResponse({ success: true });
                        break;

                    case 'getSelectedElements':
                        sendResponse({
                            success: true,
                            elements: this.selectedElements.map(el => ({
                                name: el.name,
                                selector: el.selector
                            }))
                        });
                        break;

                    case 'clearAllHighlights':
                        this.clearAllHighlights();
                        this.selectedElements = [];
                        sendResponse({ success: true });
                        break;

                    case 'ping':
                        sendResponse({ success: true, message: 'Content script is ready' });
                        break;

                    default:
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.log('OnPage message handler error:', error);
                sendResponse({ success: false, error: error.message });
            }
        }

        startElementSelection() {
            if (this.isSelecting) return;

            this.isSelecting = true;
            this.selectedElements = [];

            // Show UI
            this.overlay.style.display = 'block';
            this.instructionPanel.style.display = 'block';

            // Add event listeners
            document.addEventListener('mouseover', this.eventHandlers.mouseover, true);
            document.addEventListener('mouseout', this.eventHandlers.mouseout, true);
            document.addEventListener('click', this.eventHandlers.click, true);
            document.addEventListener('keydown', this.eventHandlers.keydown, true);

            // Prevent page scrolling
            document.body.style.overflow = 'hidden';

            // Update selection count
            this.updateSelectionCount();

        }

        stopElementSelection() {
            if (!this.isSelecting) return;

            this.isSelecting = false;

            // Hide UI
            this.overlay.style.display = 'none';
            this.instructionPanel.style.display = 'none';

            // Remove event listeners
            document.removeEventListener('mouseover', this.eventHandlers.mouseover, true);
            document.removeEventListener('mouseout', this.eventHandlers.mouseout, true);
            document.removeEventListener('click', this.eventHandlers.click, true);
            document.removeEventListener('keydown', this.eventHandlers.keydown, true);

            // Restore page scrolling
            document.body.style.overflow = '';

            // Remove highlights
            this.removeHighlight();
        }

        handleMouseOver(event) {
            if (!this.isSelecting) {
                return;
            }

            const element = event.target;

            // Skip if it's our UI elements
            if (this.isOnPageElement(element)) {
                return;
            }

            this.highlightElement(element);
        }

        handleMouseOut(event) {
            if (!this.isSelecting) return;
            this.removeHighlight();
        }

        handleClick(event) {
            if (!this.isSelecting) {
                return;
            }

            const element = event.target;

            // Skip if it's our UI elements
            if (this.isOnPageElement(element)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.selectElement(element);
        }

        isOnPageElement(element) {
            // Block clicks on overlay and instruction panel elements
            return element === this.overlay ||
                element === this.instructionPanel ||
                element.closest('#onpage-overlay') ||
                element.closest('#onpage-instructions') ||
                element.id === 'onpage-finish' ||
                element.id === 'onpage-cancel' ||
                element.id === 'onpage-selection-count';
        }

        highlightElement(element) {
            this.removeHighlight();

            // Skip if it's our UI elements
            if (this.isOnPageElement(element)) {
                return;
            }

            // Add hover class (CSS will handle the styling)
            element.classList.add('onpage-hover-element');

            this.highlightedElement = element;
            this.createElementTooltip(element);
        }

        removeHighlight() {
            if (this.highlightedElement) {
                // Simply remove the hover class (CSS handles the rest)
                this.highlightedElement.classList.remove('onpage-hover-element');
                this.highlightedElement = null;
            }
            this.removeElementTooltip();
        }

        selectElement(element) {
            const selector = this.generateSelector(element);
            const name = this.generateElementName(element);

            // Check if this element is already selected
            const existingIndex = this.selectedElements.findIndex(item => item.element === element);

            if (existingIndex !== -1) {
                // Deselect this specific element
                this.deselectElement(existingIndex);
            } else {
                // Add new selection
                const elementData = {
                    name: name,
                    selector: selector,
                    element: element
                };

                this.selectedElements.push(elementData);
                element.classList.add('onpage-selected-element');

                // Smart Multi-Selection: If 2 elements are selected, generalize and select all matches!
                if (this.selectedElements.length >= 2) {
                    const generalizedSelector = this.generalizeSelectors(
                        this.selectedElements.map(e => e.selector)
                    );
                    if (generalizedSelector) {
                        try {
                            const matching = document.querySelectorAll(generalizedSelector);
                            let added = 0;
                            matching.forEach(match => {
                                if (match !== element && this.selectedElements.findIndex(item => item.element === match) === -1) {
                                    this.selectedElements.push({
                                        name: this.generateElementName(match),
                                        selector: generalizedSelector,
                                        element: match
                                    });
                                    match.classList.add('onpage-selected-element');
                                    added++;
                                }
                            });
                            // Update selectors of existing elements exactly to the generalized one
                            this.selectedElements.forEach(item => { item.selector = generalizedSelector; });
                            this.showSuccessMessage(`Smart Grouping: Auto-selected ${added} similar elements!`);
                        } catch (e) { console.warn("Invalid generalized selector", e); }
                    }
                }
            }

            this.updateSelectionCount();
        }

        generalizeSelectors(selectors) {
            // Analyzes differences in CSS paths to generate a generalized multiple-element selector
            if (selectors.length < 2) return null;
            const parts1 = selectors[0].split(' > ');
            const parts2 = selectors[1].split(' > ');

            // Must have the same DOM depth for grouping
            if (parts1.length !== parts2.length) return null;

            let generalized = [];
            for (let i = 0; i < parts1.length; i++) {
                if (parts1[i] === parts2[i]) {
                    generalized.push(parts1[i]);
                } else {
                    // remove :nth-of-type() from both and see if they match structurally
                    let p1Clean = parts1[i].replace(/:nth-of-type\(\d+\)/, '');
                    let p2Clean = parts2[i].replace(/:nth-of-type\(\d+\)/, '');
                    if (p1Clean === p2Clean) {
                        generalized.push(p1Clean); // Extrapolate common ancestor!
                    } else {
                        return null; // Structural difference, cannot generalize properly.
                    }
                }
            }
            return generalized.join(' > ');
        }

        deselectElement(index) {
            // Remove selected class from specific element
            const elementData = this.selectedElements[index];
            if (elementData && elementData.element) {
                elementData.element.classList.remove('onpage-selected-element');
            }

            // Remove from selection array
            this.selectedElements.splice(index, 1);
        }

        clearSelection() {
            // Remove selected class from all previously selected elements
            this.selectedElements.forEach(item => {
                if (item.element) {
                    item.element.classList.remove('onpage-selected-element');
                }
            });

            // Clear the selection array
            this.selectedElements = [];
        }

        generateSelector(element) {
            if (!element || element === document) return '';

            if (element.id && !element.id.match(/^\d/)) {
                return `#${element.id}`;
            }

            let path = [];
            let current = element;

            while (current && current !== document.body && current !== document.documentElement) {
                let selector = current.tagName.toLowerCase();

                // Add unique identifiers instead of multiple brittle classes
                if (current.dataset.testid) {
                    selector += `[data-testid="${current.dataset.testid}"]`;
                } else if (current.dataset.cy) {
                    selector += `[data-cy="${current.dataset.cy}"]`;
                } else {
                    const classNameStr = this.getElementClassName(current);
                    if (classNameStr) {
                        const allClasses = classNameStr.split(/\s+/);
                        const cleanClasses = allClasses.filter(cls =>
                            cls.length > 0 && !cls.startsWith('onpage-') && !cls.includes(':')
                        );
                        if (cleanClasses.length > 0) {
                            // Pick max two classes for stability
                            selector += '.' + cleanClasses.slice(0, 2).join('.');
                        }
                    }
                }

                // Add nth-of-type for absolute precision
                const parent = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(child => child.tagName === current.tagName);
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        selector += `:nth-of-type(${index})`;
                    }
                }

                path.unshift(selector);
                current = current.parentElement;
            }

            const finalSelector = path.join(' > ');
            console.log('🎯 Generated robust final selector:', finalSelector);
            return finalSelector;
        }

        generateElementName(element) {
            // Try to get meaningful name from various attributes
            // Keep original field names without formatting (no spaces, no uppercase)
            if (element.id) {
                return element.id; // Keep original: field_domain
            }

            if (element.dataset.testid) {
                return element.dataset.testid; // Keep original: field_domain
            }

            // Safely get className as string using utility function
            const classNameStr = this.getElementClassName(element);
            if (classNameStr) {
                const classes = classNameStr.split(/\s+/);
                // Filter out onpage- classes and find the most relevant class
                const relevantClasses = classes.filter(cls => !cls.startsWith('onpage-'));
                if (relevantClasses.length > 0) {
                    return relevantClasses[0]; // Keep original: field_domain
                }
            }

            // Use tag name with text content if available
            const text = element.textContent?.trim();
            if (text && text.length > 0 && text.length < 50) {
                return `${element.tagName.toLowerCase()}_${text.replace(/\s+/g, '_').toLowerCase()}`;
            }

            // Fallback to tag name
            return element.tagName.toLowerCase();
        }

        updateSelectionCount() {
            const countElement = this.instructionPanel?.querySelector('#onpage-selection-count');
            if (countElement) {
                const count = this.selectedElements.length;
                countElement.textContent = `${count} element${count !== 1 ? 's' : ''} selected`;
            }
        }

        finishSelection() {
            try {
                // Store selected elements
                const elements = this.selectedElements.map(el => ({
                    name: el.name,
                    selector: el.selector
                }));

                // Save to chrome.storage for the popup to read
                this.saveElementsToStorage(elements);

                // Notify popup that selection is complete so it can update its UI
                try {
                    chrome.runtime.sendMessage({
                        action: 'elementSelectionComplete',
                        elements: elements
                    });
                } catch (msgErr) {
                    // Popup may have been closed — ignore
                    console.log('[OnPage] Could not notify popup:', msgErr.message);
                }

                // Keep selected elements highlighted but remove overlay
                this.keepSelectedElementsHighlighted();
                this.hideSelectionUI();

                // Show success message
                this.showSuccessMessage(`Selected ${elements.length} elements successfully!`);

            } catch (error) {
                console.log('❌ Error finishing selection:', error);
            }
        }

        saveElementsToStorage(elements) {
            // Method 1: Chrome storage (for extension communication)
            if (chrome && chrome.storage) {
                chrome.storage.local.set({
                    'onpage_selected_elements': elements
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.log('❌ Chrome storage error:', chrome.runtime.lastError);
                    }
                });
            }

            // Method 2: Regular localStorage (as backup)
            try {
                localStorage.setItem('onpage_selected_elements', JSON.stringify(elements));
            } catch (error) {
                console.log('❌ localStorage error:', error);
            }

            // Method 3: Session storage (for immediate access)
            try {
                sessionStorage.setItem('onpage_selected_elements', JSON.stringify(elements));
            } catch (error) {
                console.log('❌ sessionStorage error:', error);
            }
        }

        showSuccessMessage(message) {
            // Create a temporary success message
            const successDiv = document.createElement('div');
            successDiv.style.cssText = `
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                background: #22c55e !important;
                color: white !important;
                padding: 16px 24px !important;
                border-radius: 4px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                z-index: 2147483649 !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                text-align: center !important;
            `;
            successDiv.textContent = message;

            document.body.appendChild(successDiv);

            // Remove after 3 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        }

        cancelSelection() {
            try {
                // Remove all highlights and clear selection
                this.clearAllHighlights();
                this.selectedElements = [];

                // Hide UI
                this.hideSelectionUI();

                // Send cancellation message
                chrome.runtime.sendMessage({
                    action: 'elementSelectionCancelled'
                });

            } catch (error) {
                console.log('Error cancelling selection:', error);
            }
        }

        hideSelectionUI() {
            // Hide overlay and instruction panel but keep selection active
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
            if (this.instructionPanel) {
                this.instructionPanel.style.display = 'none';
            }

            // Remove event listeners but keep selection
            document.removeEventListener('mouseover', this.eventHandlers.mouseover, true);
            document.removeEventListener('mouseout', this.eventHandlers.mouseout, true);
            document.removeEventListener('click', this.eventHandlers.click, true);
            document.removeEventListener('keydown', this.eventHandlers.keydown, true);

            // Restore page scrolling
            document.body.style.overflow = '';

            this.isSelecting = false;
        }

        keepSelectedElementsHighlighted() {
            // Ensure all selected elements keep their selected class
            this.selectedElements.forEach(item => {
                if (item.element) {
                    // Make sure the selected class is applied
                    item.element.classList.add('onpage-selected-element');
                }
            });
        }

        clearAllHighlights() {
            // Remove CSS classes from all elements
            this.selectedElements.forEach(item => {
                if (item.element) {
                    item.element.classList.remove('onpage-selected-element');
                    item.element.classList.remove('onpage-hover-element');
                }
            });

            // Clear selection array
            this.selectedElements = [];

            // Also remove current highlight
            this.removeHighlight();
        }

        handleKeyDown(event) {
            if (!this.isSelecting) return;

            // Keyboard shortcut [S] - Select directly
            if (event.key.toLowerCase() === 's' && this.highlightedElement) {
                event.preventDefault();
                event.stopPropagation();
                this.selectElement(this.highlightedElement);
            }

            // Keyboard shortcut [P] - Select Parent
            if (event.key.toLowerCase() === 'p' && this.highlightedElement) {
                event.preventDefault();
                event.stopPropagation();
                let parent = this.highlightedElement.parentElement;
                if (parent && parent !== document.body && parent !== document.documentElement) {
                    this.selectionHistory.push(this.highlightedElement);
                    this.highlightElement(parent);
                }
            }

            // Keyboard shortcut [C] - Select Child (Go back)
            if (event.key.toLowerCase() === 'c' && this.highlightedElement) {
                event.preventDefault();
                event.stopPropagation();
                if (this.selectionHistory && this.selectionHistory.length > 0) {
                    let child = this.selectionHistory.pop();
                    this.highlightElement(child);
                } else if (this.highlightedElement.firstElementChild) {
                    this.highlightElement(this.highlightedElement.firstElementChild);
                }
            }
        }

        destroy() {
            this.stopElementSelection();
            this.removeUI();

            if (chrome.runtime.onMessage.hasListener(this.eventHandlers.message)) {
                chrome.runtime.onMessage.removeListener(this.eventHandlers.message);
            }

            window.OnPageContentScript = false;
        }
    }

    // Initialize the content script
    const contentScript = new OnPageContentScript();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        contentScript.destroy();
    });

})();