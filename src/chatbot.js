// src/chatbot.js
import './chatbot.css';
import { parseMarkdown, generateUniqueId, setLocalStorageItem, getLocalStorageItem } from './utils';
import { renderMessage, renderCustomPayload } from './renderer';

class ChatbotWidget {
  constructor() {
    this.config = {};
    this.isOpen = false;
    this.sessionId = null;
    this.messages = [];
    this.elements = {};
    this.refreshInterval = null;
    this.debug = true;
  }

  log(...args) {
    if (this.debug) console.log('[Chatbot]', ...args);
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

    this.config = {
      ...scriptConfig,
      ...apiConfig
    };

    // Apply defaults if not set
    this.config.botUrl = this.config.botUrl || 'http://0.0.0.0:8000/chat';
    this.config.themeColor = this.config.themeColor || '#020c15ff';
    this.config.position = this.config.position || 'bottom-right';
    this.config.botName = this.config.botName || 'Chatbot';
    this.config.inputPlaceholder = this.config.inputPlaceholder || 'Type your message...';
    this.config.sendButtonText = this.config.sendButtonText || 'Send';
  }

  async init() {
    this.initConfig();
    await this.loadConfig();
    this.initSession();  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    this.createWidgetUI();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM fully loaded, creating UI');
      this.createWidgetUI();
    });
  }
  
  // Fallback timeout
  setTimeout(() => {
    if (!this.elements.container) {
      console.warn('Fallback UI creation');
      this.createWidgetUI();
    }
  }, 1000);

  }

  async loadConfig() {
    if (this.config.configApiUrl) {
      try {
        this.log('Loading initial config from API');
        const response = await fetch(`${this.config.configApiUrl}?t=${Date.now()}`);
        const apiConfig = await response.json();
        this.mergeConfigs(apiConfig);
      } catch (error) {
        this.log('Initial config load failed:', error);
      }
    }
  }

  // --- Dynamic Configuration ---
  async refreshConfig() {
    try {
      this.log('Refreshing configuration...');
      const response = await fetch(`${this.config.configApiUrl}?t=${Date.now()}`);
      const newConfig = await response.json();
      this.mergeConfigs(newConfig);
      this.applyDynamicStyles();
      this.updateUIElements();
      this.log('Configuration refreshed successfully');
      return true;
    } catch (error) {
      this.log('Failed to refresh config:', error);
      return false;
    }
  }

  mergeConfigs(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
      style: {
        ...(this.config.style || {}),
        ...(newConfig.style || {})
      },
      features: {
        ...(this.config.features || {}),
        ...(newConfig.features || {})
      }
    };
    this.log('Merged config:', this.config);
  }

  applyDynamicStyles() {
    if (!this.config.style) {
      this.log('No style configuration found');
      return;
    }

    const root = document.documentElement;
    const { style } = this.config;

    if (style.themeColor) {
      root.style.setProperty('--chatbot-theme-color', style.themeColor);
      root.style.setProperty('--chatbot-theme-color-hover', this.adjustColor(style.themeColor, -20));
    }

    if (style.header?.backgroundColor) {
      root.style.setProperty('--chatbot-header-bg', style.header.backgroundColor);
    }

    if (style.header?.textColor) {
      root.style.setProperty('--chatbot-header-text', style.header.textColor);
    }

    if (style.bubble?.color) {
      root.style.setProperty('--chatbot-bubble-color', style.bubble.color);
    }

    if (style.messages?.userBubbleColor) {
      root.style.setProperty('--chatbot-user-bubble', style.messages.userBubbleColor);
    }

    if (style.messages?.botBubbleColor) {
      root.style.setProperty('--chatbot-bot-bubble', style.messages.botBubbleColor);
    }
  }

  adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, colorHex => 
      ('0' + Math.min(255, Math.max(0, parseInt(colorHex, 16) + amount)).toString(16)).slice(-6));
  }

  // --- UI Management ---
  createWidgetUI() {
    console.log('Creating widget UI...'); // Debug 1
    console.log('Config:', this.config); // Debug 2
  
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    console.log('Container created:', container); // Debug 3

    container.classList.add(`chatbot-position-${this.config.position}`);
    container.style.display = 'none';
    container.style.opacity = '0';
    

    document.body.appendChild(container);
    this.elements.container = container;
    setTimeout(() => {
        const computedStyle = window.getComputedStyle(this.elements.container);
        console.log('Computed styles:', {
            display: computedStyle.display,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            visibility: computedStyle.visibility
        });
        }, 500);
    // Apply animation settings
    const animation = this.config.style?.animation || { type: 'fade-in', duration: 300 };
    if (animation.type) {
      container.style.transition = `all ${animation.duration}ms ease`;
    }

    // Create Chat Bubble
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    
    const bubbleStyle = this.config.style?.bubble || {};
    bubble.style.width = bubbleStyle.size || '60px';
    bubble.style.height = bubbleStyle.size || '60px';
    bubble.style.backgroundColor = bubbleStyle.color || 'var(--chatbot-theme-color)';
    
    if (bubbleStyle.icon) {
      bubble.innerHTML = bubbleStyle.icon.startsWith('http') ?  
         `<img src="${bubbleStyle.icon}" class="chatbot-header-icon" 
            style="width: ${bubbleStyle.iconSize || '30px'}; height: ${bubbleStyle.iconSize || '30px'};">`: bubbleStyle.icon;
    } else {
      bubble.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      `;
    }
    
    bubble.addEventListener('click', () => this.toggleChatWindow());
    container.appendChild(bubble);
    this.elements.bubble = bubble;

    // Create Chat Window
    const windowEl = document.createElement('div');
    windowEl.className = 'chatbot-window';
    this.refreshConfig()
    const headerStyle = this.config.style?.header || {};
    windowEl.innerHTML = `
      <div class="chatbot-header" style="
        ${headerStyle.backgroundColor ? `background-color: ${headerStyle.backgroundColor};` : ''}
        ${headerStyle.textColor ? `color: ${headerStyle.textColor};` : ''}
      ">
        ${headerStyle.icon ? 
          `<img src="${headerStyle.icon}" class="chatbot-header-icon" 
            style="width: ${headerStyle.iconSize || '30px'}; height: ${headerStyle.iconSize || '30px'};">` : ''}
        <span class="chatbot-header-title">${this.config.botName}</span>
        <button class="chatbot-header-close" style="
          ${headerStyle.textColor ? `color: ${headerStyle.textColor};` : ''}
        ">&times;</button>
      </div>
      <div class="chatbot-messages"></div>
      <div class="chatbot-input-area">
        <input type="text" placeholder="${this.config.inputPlaceholder}" />
        <button class="chatbot-send-button">${this.config.sendButtonText}</button>
      </div>
    `;

    container.appendChild(windowEl);
    this.elements.window = windowEl;
    this.elements.messagesContainer = windowEl.querySelector('.chatbot-messages');
    this.elements.inputField = windowEl.querySelector('.chatbot-input-area input');
    this.elements.sendButton = windowEl.querySelector('.chatbot-input-area button');
    this.elements.closeButton = windowEl.querySelector('.chatbot-header-close');
    this.elements.headerTitle = windowEl.querySelector('.chatbot-header-title');

    // Add refresh button


    // Event Listeners
    this.elements.closeButton.addEventListener('click', () => this.toggleChatWindow());
    this.elements.sendButton.addEventListener('click', () => this.sendMessage());
    this.elements.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Render messages and show
    this.messages.forEach(msg => this.displayMessage(msg, false));
    this.scrollToBottom();
    this.showWidget();

    // Start auto-refresh if configured
    if (this.config.autoRefresh) {
      this.startAutoRefresh(this.config.autoRefreshInterval || 300000);
    }
  }

  updateUIElements() {
    if (this.elements.headerTitle) {
      this.elements.headerTitle.textContent = this.config.botName;
    }
    
    if (this.elements.inputField) {
      this.elements.inputField.placeholder = this.config.inputPlaceholder;
    }
    
    if (this.elements.sendButton) {
      this.elements.sendButton.textContent = this.config.sendButtonText;
    }
    
    if (this.config.style?.bubble?.icon && this.elements.bubble) {
      this.elements.bubble.innerHTML = this.config.style.bubble.icon;
    }
  }

  showWidget() {
      console.log('Attempting to show widget...'); // Debug 4
  
  // Force visibility for debugging
    this.elements.container.style.display = 'block';
    this.elements.container.style.opacity = '1';
    this.elements.container.style.zIndex = '99999';
    
    // Original animation code
    const animation = this.config.style?.animation || { type: 'fade-in', duration: 300 };
    console.log('Using animation:', animation); // Debug 5

    this.elements.container.style.display = 'block';
    
    if (animation.type === 'fade-in') {
      setTimeout(() => {
        this.elements.container.style.opacity = '1';
      }, 50);
    } else if (animation.type === 'slide-up') {
      this.elements.container.style.transform = 'translateY(20px)';
      setTimeout(() => {
        this.elements.container.style.transition = `all ${animation.duration}ms ease`;
        this.elements.container.style.opacity = '1';
        this.elements.container.style.transform = 'translateY(0)';
      }, 50);
    } else {
      this.elements.container.style.opacity = '1';
    }
  }

  // --- Auto Refresh ---
  startAutoRefresh(interval = 300000) {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => this.refreshConfig(), interval);
    this.log(`Started auto-refresh every ${interval/1000} seconds`);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // --- Session Management ---
  initSession() {
    this.sessionId = getLocalStorageItem('chatbot_session_id');
    if (!this.sessionId) {
      this.sessionId = generateUniqueId();
      setLocalStorageItem('chatbot_session_id', this.sessionId);
    }
    this.messages = getLocalStorageItem(`chatbot_conversation_${this.sessionId}`) || [];
  }

  // --- Message Handling ---
  displayMessage(message, save = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chatbot-message', message.sender === 'user' ? 'user' : 'bot');

    if (message.text) {
      const textContent = document.createElement('div');
      textContent.innerHTML = parseMarkdown(message.text);
      messageElement.appendChild(textContent);
    }

    if (message.buttons?.length > 0) {
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
    
    if (message.carousel?.length > 0) {
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
      ...(payload && { customData: { payload } })
    };

    try {
      const response = await fetch(this.config.botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const botResponses = await response.json();
      if (botResponses?.length > 0) {
        botResponses.forEach(response => this.displayMessage({ sender: 'bot', ...response }));
      } else {
        this.displayMessage({ sender: 'bot', text: "Sorry, I didn't get a response." });
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      this.displayMessage({ 
        sender: 'bot', 
        text: "I'm having trouble connecting. Please try again later." 
      });
    }
  }

  // --- UI Controls ---
  toggleChatWindow() {
    this.isOpen = !this.isOpen;
    this.elements.window.classList.toggle('open', this.isOpen);
    this.elements.bubble.classList.toggle('hidden', this.isOpen);
    
    if (this.isOpen) {
      this.elements.inputField.focus();
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
  }
}

// Initialize
window.ChatbotSDK = new ChatbotWidget();
window.ChatbotSDK.init();