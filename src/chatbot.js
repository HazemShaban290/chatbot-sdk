// src/chatbot.js
import './chatbot.css'; // Import CSS directly via Rollup PostCSS plugin
import { parseMarkdown, generateUniqueId, setLocalStorageItem, getLocalStorageItem } from './utils';
import { renderMessage, renderCustomPayload } from './renderer';

class ChatbotWidget {
  constructor() {
    this.config = {};
    this.isOpen = false;
    this.sessionId = null;
    this.messages = [];
    this.elements = {}; // Store references to key DOM elements
  }

  // --- Configuration & Initialization ---
  initConfig(apiConfig = {}) {
    const scriptTag = document.querySelector('script[src*="chatbot.bundle.js"]');
    let scriptConfig = {};

    if (scriptTag) {
      const configJson = scriptTag.getAttribute('chatbot-config');
      if (configJson) {
        try {
          scriptConfig = JSON.parse(configJson);
        } catch (e) {
          console.error('Chatbot SDK: Invalid JSON in chatbot-config attribute', e);
        }
      }
    }

    // Merge script tag config with API config, giving API config higher precedence
    // then apply defaults
    this.config = {
      ...scriptConfig,
      ...apiConfig
    };

    // Apply defaults if not set by script tag or API
    this.config.botUrl = this.config.botUrl || 'http://0.0.0.0:8000/chat';
    this.config.themeColor = this.config.themeColor || '#020c15ff';
    this.config.position = this.config.position || 'bottom-right';
    this.config.botName = this.config.botName || 'Chatbot';

    // Apply theme color
    document.documentElement.style.setProperty('--chatbot-theme-color', this.config.themeColor);
  }

  initSession() {
    this.sessionId = getLocalStorageItem('chatbot_session_id');
    if (!this.sessionId) {
      this.sessionId = generateUniqueId();
      setLocalStorageItem('chatbot_session_id', this.sessionId);
    }
    this.messages = getLocalStorageItem(`chatbot_conversation_${this.sessionId}`) || [];
  }

  // --- UI Creation ---
  createWidgetUI() {
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    // Apply position class based on config
    container.classList.add(`chatbot-position-${this.config.position}`);
    // Initially hide the container, we'll reveal it with animation if needed
    container.style.display = 'none'; // Start hidden
    container.style.opacity = '0'; // For fade-in animation

    document.body.appendChild(container);
    this.elements.container = container;

    // Chat Bubble
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    bubble.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
    `;
    bubble.addEventListener('click', () => this.toggleChatWindow());
    container.appendChild(bubble);
    this.elements.bubble = bubble;

    // Chat Window
    const windowEl = document.createElement('div');
    windowEl.className = 'chatbot-window';
    windowEl.innerHTML = `
      <div class="chatbot-header">
        <span class="chatbot-header-title">${this.config.botName}</span>
        <button class="chatbot-header-close">&times;</button>
      </div>
      <div class="chatbot-messages"></div>
      <div class="chatbot-input-area">
        <input type="text" placeholder="Type your message..." />
        <button class="chatbot-send-button">Send</button>
      </div>
    `;
    container.appendChild(windowEl);
    this.elements.window = windowEl;
    this.elements.messagesContainer = windowEl.querySelector('.chatbot-messages');
    this.elements.inputField = windowEl.querySelector('.chatbot-input-area input');
    this.elements.sendButton = windowEl.querySelector('.chatbot-send-button');
    this.elements.closeButton = windowEl.querySelector('.chatbot-header-close');

    // Event Listeners
    this.elements.closeButton.addEventListener('click', () => this.toggleChatWindow());
    this.elements.sendButton.addEventListener('click', () => this.sendMessage());
    this.elements.inputField.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.sendMessage();
      }
    });

    // Render persisted messages
    this.messages.forEach(msg => this.displayMessage(msg, false)); // Don't save again
    this.scrollToBottom();

    // Show the widget after creation, possibly with animation
    this.showWidget();
  }

  showWidget() {
    // Apply animation if specified in config, otherwise just show
    const animation = this.config.appearanceAnimation || { type: 'fade-in', duration: 500 }; // Default animation

    this.elements.container.style.display = 'block'; // Make it block before animation
    if (animation.type === 'fade-in') {
      this.elements.container.style.transition = `opacity ${animation.duration / 1000}s ease-in-out`;
      setTimeout(() => { // Trigger reflow before applying opacity change for transition
        this.elements.container.style.opacity = '1';
      }, 50); // Small delay
    } else {
      this.elements.container.style.opacity = '1'; // Just show without transition
    }
  }

  // --- UI State Management ---
  toggleChatWindow() {
    this.isOpen = !this.isOpen;
    this.elements.window.classList.toggle('open', this.isOpen);
    this.elements.bubble.classList.toggle('hidden', this.isOpen);
    if (this.isOpen) {
      this.elements.inputField.focus();
      this.scrollToBottom();
    }
  }

  // --- Message Handling (No change needed here from previous version) ---
  displayMessage(message, save = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chatbot-message', message.sender === 'user' ? 'user' : 'bot');

    if (message.text) {
        const textContent = document.createElement('div');
        textContent.innerHTML = parseMarkdown(message.text);
        messageElement.appendChild(textContent);
    }

    if (message.buttons && message.buttons.length > 0) {
      const buttonContainer = renderMessage(message, 'buttons', this.sendMessage.bind(this));
      if (buttonContainer) messageElement.appendChild(buttonContainer);
    }
    if (message.image) {
      const imageEl = renderMessage(message, 'image');
      if (imageEl) messageElement.appendChild(imageEl);
    }
    if (message.video) {
      const videoEl = renderMessage(message, 'video');
      if (videoEl) messageElement.appendChild(videoEl);
    }
    if (message.carousel && message.carousel.length > 0) {
        const carouselEl = renderMessage(message, 'carousel', this.sendMessage.bind(this));
        if (carouselEl) messageElement.appendChild(carouselEl);
    }
    if (message.custom) {
        const customEl = renderCustomPayload(message.custom, this.sendMessage.bind(this));
        if (customEl) messageElement.appendChild(customEl);
    }

    this.elements.messagesContainer.appendChild(messageElement);
    if (save) {
      this.messages.push(message);
      setLocalStorageItem(`chatbot_conversation_${this.sessionId}`, this.messages);
    }
    this.scrollToBottom();
  }

  async sendMessage(text = null, payload = null) {
    let messageText = text || this.elements.inputField.value.trim();
    if (!messageText && !payload) return;

    const userMessage = { sender: 'user', text: messageText };
    this.displayMessage(userMessage);
    this.elements.inputField.value = '';

    const requestBody = {
      sender: this.sessionId,
      message: messageText,
      ...(payload && { customData: { payload: payload } })
    };

    try {
      const response = await fetch(this.config.botUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const botResponses = await response.json();
      if (botResponses && botResponses.length > 0) {
        botResponses.forEach(botResponse => {
            this.displayMessage({ sender: 'bot', ...botResponse });
        });
      } else {
          this.displayMessage({ sender: 'bot', text: "Sorry, I didn't get a response from the bot." });
      }
    } catch (error) {
      console.error('Chatbot SDK: Error communicating with bot backend:', error);
      this.displayMessage({ sender: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." });
    }
  }

  scrollToBottom() {
    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }

  // --- Main Init Method ---
  async init() {
    // Initialize config from script tag first
    this.initConfig();

    // Check if an appearance API URL is provided
    if (this.config.appearanceApiUrl) {
      try {
        console.log(`Chatbot SDK: Fetching appearance config from ${this.config.appearanceApiUrl}`);
        const response = await fetch(this.config.appearanceApiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiResponse = await response.json();

        if (apiResponse.showChatbot) {
          // Re-initialize config with API response, overriding script tag config
          this.initConfig(apiResponse.initialConfig);
          // Apply appearance animation settings if provided by API
          if (apiResponse.appearanceAnimation) {
              this.config.appearanceAnimation = apiResponse.appearanceAnimation;
          }
          this.initSession();
          document.addEventListener('DOMContentLoaded', () => this.createWidgetUI());
        } else {
          console.log('Chatbot SDK: showChatbot is false from API. Not displaying widget.');
        }
      } catch (error) {
        console.error('Chatbot SDK: Error fetching appearance configuration:', error);
        // Decide fallback: hide chatbot or show with default config if API fails
        // For now, if API fails, we won't show the chatbot.
        console.log('Chatbot SDK: Not displaying widget due to API error.');
      }
    } else {
      // If no appearance API URL, proceed with existing script tag config
      console.log('Chatbot SDK: No appearance API URL provided. Displaying with script tag config.');
      this.initSession();
      document.addEventListener('DOMContentLoaded', () => this.createWidgetUI());
    }
  }
}

// Global initialization
window.ChatbotSDK = new ChatbotWidget();
window.ChatbotSDK.init();