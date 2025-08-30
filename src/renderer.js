
// src/renderer.js
import { loadScript } from './utils';

// Get reference to the chatbot instance
const getChatbot = () => window.ChatbotSDK || { config: {} };

/**
 * Applies styles to an element with priority to message-specific styles
 * @param {HTMLElement} element - The element to style
 * @param {string} component - The component type (e.g., 'buttons', 'carousel')
 * @param {string} elementType - The specific element type (e.g., 'container', 'button')
 * @param {object} [messageStyles] - Style overrides from message data (highest priority)
 */
function applyStyles(element, component, elementType, messageStyles = {}) {
  const chatbot = getChatbot();
  
  // Get base styles from config if they exist
  const configStyles = chatbot.config.style?.components?.[component]?.[elementType] || {};
  
  // Get global message styles if they exist
  const globalStyles = chatbot.config.style?.messages || {};
  
  // Merge styles with message styles taking priority
  const styles = {
    ...getDefaultStyles(component, elementType, globalStyles),
    ...configStyles,
    ...messageStyles
  };

  // Apply the combined styles
  Object.entries(styles).forEach(([prop, value]) => {
    if (value !== undefined && value !== null) {
      // Handle CSS custom properties
      if (prop.startsWith('--')) {
        element.style.setProperty(prop, value);
      } else {
        element.style[prop] = value;
      }
    }
  });
}

/**
 * Gets default styles based on global message styles
 */
function getDefaultStyles(component, elementType, globalStyles) {
  const defaults = {};
  
  switch (component) {
    case 'buttons':
      if (elementType === 'button') {
        defaults.backgroundColor = globalStyles.buttonColor;
        defaults.color = globalStyles.buttonTextColor;
      }
      break;
    case 'carousel':
      if (elementType === 'card') {
        defaults.backgroundColor = globalStyles.botBubbleColor;
      }
      if (elementType === 'cardTitle' || elementType === 'cardSubtitle') {
        defaults.color = globalStyles.botTextColor;
      }
      break;
    case 'faq':
      if (elementType === 'question') {
        defaults.color = globalStyles.botTextColor;
      }
      break;
    case 'rating':
      if (elementType === 'star') {
        defaults.color = globalStyles.buttonColor;
      }
      break;
  }
  
  return defaults;
}

/**
 * Renders various message types with configured styling
 */
export function renderMessage(messageData, type, sendMessageCallback = null) {
  switch (type) {
    case 'buttons':
      return createButtons(messageData.buttons, sendMessageCallback, messageData.style);
    case 'image':
      return createImage(messageData.image, messageData.style);
    case 'video':
      return createVideo(messageData.video, messageData.style);
    case 'carousel':
      return createCarousel(messageData.carousel, sendMessageCallback, messageData.style);
    default:
      return null;
  }
}

/**
 * Renders custom payload types with configured styling
 */
export function renderCustomPayload(customPayload, sendMessageCallback = null) {
    if (!customPayload) return null;

    const customContainer = document.createElement('div');
    customContainer.classList.add('chatbot-custom-payload');
    applyStyles(customContainer, 'custom', 'container', customPayload.style);

    if (customPayload.locations) {
        const mapEl = createLocationsMap(customPayload.locations, customPayload.style);
        if (mapEl) customContainer.appendChild(mapEl);
    }
    if (customPayload.faq_list) {
        const faqEl = createFaqList(customPayload.faq_list, customPayload.style);
        if (faqEl) customContainer.appendChild(faqEl);
    }
    if (customPayload.table) {
        const tableEl = createTable(customPayload.table, customPayload.style);
        if (tableEl) customContainer.appendChild(tableEl);
    }
    if (customPayload.rating) {
        const ratingEl = createRating(customPayload.rating, sendMessageCallback, customPayload.style);
        if (ratingEl) customContainer.appendChild(ratingEl);
    }
    if (customPayload.forms) {
        const formEl = createDynamicForm(customPayload.forms, sendMessageCallback, customPayload.style);
        if (formEl) customContainer.appendChild(formEl);
    }
    if (customPayload.video) {
        const videoEl = createVideo(customPayload.video, customPayload.style);
        if (videoEl) customContainer.appendChild(videoEl);
        
    }

    return customContainer.children.length > 0 ? customContainer : null;
}

// --- Component Creation Functions ---

function createButtons(buttons, sendMessageCallback, styleOverrides = {}) {
  if (!buttons || buttons.length === 0) return null;
  
  const container = document.createElement('div');
  container.className = 'chatbot-button-container';
  applyStyles(container, 'buttons', 'container', styleOverrides.container);

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.title;
    button.className = 'chatbot-button';
    
    // Apply button styles with proper priority
    applyStyles(button, 'buttons', 'button', {
      // From button-specific config in message
      ...(btn.button_color && { backgroundColor: btn.button_color }),
      ...(btn.button_color && { color: 'white' }),
      ...(btn.button_color && { borderColor: btn.button_color }),
      // From style overrides
      ...styleOverrides.button
    });

    if (btn.payload) {
      button.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(b => b.disabled = true);
        if (sendMessageCallback) sendMessageCallback(btn.title, btn.payload);
      });
    } else if (btn.url) {
      button.addEventListener('click', () => window.open(btn.url, '_blank'));
    } else if (btn.question) {
      button.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(b => b.disabled = true);
        if (sendMessageCallback) sendMessageCallback(btn.title, btn.question);
      });
    }
    
    container.appendChild(button);
  });
  
  return container;
}

function createImage(imageUrl, styleOverrides = {}) {
  if (!imageUrl) return null;
  
  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'chatbot-image';
  applyStyles(img, 'image', 'image', styleOverrides);
  
  return img;
}

function createVideo(videoObj, styleOverrides = {}) {
  if (!videoObj.url) return null;

  // Check if the URL is a YouTube link
  const isYouTube = videoObj.url.includes("youtube.com/watch") || videoObj.url.includes("youtu.be");

  if (isYouTube) {
    // Extract video ID from URL
    let videoId;
    if (videoObj.url.includes("youtu.be")) {
      videoId = videoObj.url.split("/").pop().split("?")[0];
    } else {
      videoId = videoObj.url.split("v=")[1].split("&")[0];
    }

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    iframe.width = "250";
    iframe.height = "140";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;

    return iframe;
  } else {
    // Handle direct video file (.mp4, .webm)
    const video = document.createElement("video");
    video.src = videoObj.url;
    video.controls = true;
    video.className = "chatbot-video";
    video.style.maxWidth = styleOverrides.maxWidth || "250px";
    video.style.borderRadius = styleOverrides.borderRadius || "8px";
    video.style.marginTop = styleOverrides.marginTop || "8px";

    // Optional autoplay (muted)
    if (videoObj.autoplay) {
      video.muted = true;
      video.autoplay = true;
      video.addEventListener("canplay", () => {
        video.play().catch(err => console.log("Autoplay blocked", err));
      });
    }

    return video;
  }
}



function createCarousel(carouselItems, sendMessageCallback, styleOverrides = {}) {
  if (!carouselItems || carouselItems.length === 0) return null;
  
  const container = document.createElement('div');
  container.className = 'chatbot-carousel-container';
  applyStyles(container, 'carousel', 'container', styleOverrides.container);

  carouselItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'chatbot-carousel-card';
    applyStyles(card, 'carousel', 'card', styleOverrides.card);

    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.className = 'chatbot-carousel-card-image';
      applyStyles(img, 'carousel', 'cardImage', styleOverrides.cardImage);
      card.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'chatbot-carousel-card-content';
    applyStyles(content, 'carousel', 'cardContent', styleOverrides.content);

    const title = document.createElement('h3');
    title.className = 'chatbot-carousel-card-title';
    title.textContent = item.title;
    applyStyles(title, 'carousel', 'cardTitle', styleOverrides.title);
    content.appendChild(title);

    if (item.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'chatbot-carousel-card-subtitle';
      subtitle.textContent = item.subtitle;
      applyStyles(subtitle, 'carousel', 'cardSubtitle', styleOverrides.subtitle);
      content.appendChild(subtitle);
    }

    if (item.buttons?.length > 0) {
      const buttonsContainer = createButtons(item.buttons, sendMessageCallback, {
        ...styleOverrides,
        button: {
          ...(item.button_style || {})
        }
      });
      if (buttonsContainer) content.appendChild(buttonsContainer);
    }
    
    card.appendChild(content);
    container.appendChild(card);
  });
  
  return container;
}

function createLocationsMap(locations, styleOverrides = {}) {
  if (!locations || locations.length === 0) return null;

  const locationContainer = document.createElement('div');
  locationContainer.className = 'chatbot-location-cards';
  applyStyles(locationContainer, 'locations', 'container', styleOverrides.container);

  locations.forEach(location => {
    const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const staticMap = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=14&size=400x200&markers=color:red%7C${location.lat},${location.lng}&key=AIzaSyCYVHw1tnbSZsihFfewNPwvuKc0iXx0ymw`;

    const card = document.createElement('div');
    card.className = 'chatbot-location-card';
    applyStyles(card, 'locations', 'card', styleOverrides.card);

    // Map image
    const img = document.createElement('img');
    img.src = staticMap;
    img.alt = `${location.name} map`;
    img.className = 'chatbot-location-map';
    applyStyles(img, 'locations', 'map', styleOverrides.map);
    card.appendChild(img);

    // Card body
    const body = document.createElement('div');
    body.className = 'chatbot-location-body';
    applyStyles(body, 'locations', 'body', styleOverrides.body);

    // Title
    const title = document.createElement('div');
    title.className = 'chatbot-location-title';
    title.textContent = location.name;
    applyStyles(title, 'locations', 'title', styleOverrides.title);
    body.appendChild(title);

    // Address
    if (location.address) {
      const address = document.createElement('div');
      address.className = 'chatbot-location-address';
      address.textContent = location.address;
      applyStyles(address, 'locations', 'address', styleOverrides.address);
      body.appendChild(address);
    }

    // Button
    const button = document.createElement('a');
    button.href = mapUrl;
    button.target = '_blank';
    button.className = 'chatbot-location-button';
    button.textContent = 'View on Map';
    applyStyles(button, 'locations', 'button', {
      backgroundColor: getChatbot().config.style?.messages?.buttonColor,
      color: getChatbot().config.style?.messages?.buttonTextColor,
      ...styleOverrides.button
    });
    body.appendChild(button);

    card.appendChild(body);
    locationContainer.appendChild(card);
  });

  return locationContainer;
}

function createFaqList(faqs, styleOverrides = {}) {
    if (!faqs || faqs.length === 0) return null;
    
    const container = document.createElement('div');
    container.className = 'chatbot-faq-list-container';
    applyStyles(container, 'faq', 'container', styleOverrides.container);

    faqs.forEach((faq, index) => {
        const item = document.createElement('div');
        item.className = 'chatbot-faq-item';
        applyStyles(item, 'faq', 'item', styleOverrides.item);

        const question = document.createElement('div');
        question.className = 'chatbot-faq-question';
        question.textContent = faq.question;
        applyStyles(question, 'faq', 'question', styleOverrides.question);
        item.appendChild(question);

        const answer = document.createElement('div');
        answer.className = 'chatbot-faq-answer';
        answer.innerHTML = faq.answer;
        applyStyles(answer, 'faq', 'answer', styleOverrides.answer);
        item.appendChild(answer);

        question.addEventListener('click', () => {
            item.classList.toggle('expanded');
            if (item.classList.contains('expanded')) {
                applyStyles(answer, 'faq', 'expandedAnswer', styleOverrides.expandedAnswer);
            } else {
                applyStyles(answer, 'faq', 'answer', styleOverrides.answer);
            }
        });
        
        container.appendChild(item);
    });
    
    return container;
}

function createTable(tableData, styleOverrides = {}) {
    if (!tableData || !tableData.headers || !tableData.rows) return null;

    const container = document.createElement('div');
    container.className = 'chatbot-table-container';
    applyStyles(container, 'table', 'container', styleOverrides.container);

    const table = document.createElement('table');
    table.className = 'chatbot-table';
    applyStyles(table, 'table', 'table', styleOverrides.table);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    tableData.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        applyStyles(th, 'table', 'header', {
          backgroundColor: getChatbot().config.style?.messages?.buttonColor,
          color: getChatbot().config.style?.messages?.buttonTextColor,
          ...styleOverrides.header
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tableData.rows.forEach(rowData => {
        const tr = document.createElement('tr');
        rowData.forEach(cellData => {
            const td = document.createElement('td');
            td.textContent = cellData;
            applyStyles(td, 'table', 'cell', styleOverrides.cell);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
    return container;
}

function createRating(ratingData, sendMessageCallback, styleOverrides = {}) {
    if (!ratingData || !ratingData.scale) return null;

    const container = document.createElement('div');
    container.className = 'chatbot-rating-container';
    applyStyles(container, 'rating', 'container', styleOverrides.container);

    const title = document.createElement('div');
    title.className = 'chatbot-rating-title';
    title.textContent = ratingData.title || 'Please rate:';
    applyStyles(title, 'rating', 'title', styleOverrides.title);
    container.appendChild(title);

    const starsContainer = document.createElement('div');
    starsContainer.className = 'chatbot-stars';
    applyStyles(starsContainer, 'rating', 'starsContainer', styleOverrides.starsContainer);
    let selectedRating = 0;

    for (let i = ratingData.scale; i >= 1; i--) {
        const star = document.createElement('span');
        star.innerHTML = '&#9733;';
        star.dataset.value = i;
        applyStyles(star, 'rating', 'star', {
          color: getChatbot().config.style?.messages?.buttonColor,
          ...styleOverrides.star
        });

        star.addEventListener('mouseover', () => {
            starsContainer.querySelectorAll('span').forEach(s => {
                if (parseInt(s.dataset.value) >= i) {
                    s.classList.add('hover');
                    applyStyles(s, 'rating', 'starHover', {
                      color: getChatbot().config.style?.themeColor,
                      ...styleOverrides.starHover
                    });
                }
            });
        });

        star.addEventListener('mouseout', () => {
            starsContainer.querySelectorAll('span').forEach(s => {
                s.classList.remove('hover');
                applyStyles(s, 'rating', 'star', {
                  color: getChatbot().config.style?.messages?.buttonColor,
                  ...styleOverrides.star
                });
            });
        });

        star.addEventListener('click', () => {
            selectedRating = i;
            starsContainer.querySelectorAll('span').forEach(s => {
                if (parseInt(s.dataset.value) <= selectedRating) {
                    s.classList.add('selected');
                    applyStyles(s, 'rating', 'starSelected', {
                      color: getChatbot().config.style?.themeColor,
                      ...styleOverrides.starSelected
                    });
                } else {
                    s.classList.remove('selected');
                    applyStyles(s, 'rating', 'star', {
                      color: getChatbot().config.style?.messages?.buttonColor,
                      ...styleOverrides.star
                    });
                }
            });
            if (sendMessageCallback) {
                sendMessageCallback(`Rated ${selectedRating} stars`, `/rate_service{"rating":${selectedRating}}`);
            }
        });
        starsContainer.appendChild(star);
    }
    container.appendChild(starsContainer);
    return container;
}

function createDynamicForm(formData, sendMessageCallback, styleOverrides = {}) {
  if (!formData || !Array.isArray(formData.fields) || formData.fields.length === 0 || !formData.submit_payload) return null;

  const container = document.createElement('div');
  container.className = 'chatbot-form-container';
  applyStyles(container, 'form', 'container', styleOverrides.container);

  if (formData.title) {
    const title = document.createElement('div');
    title.className = 'chatbot-form-title';
    title.textContent = formData.title;
    applyStyles(title, 'form', 'title', styleOverrides.title);
    container.appendChild(title);
  }

  const form = document.createElement('form');
  form.className = 'chatbot-form';
  applyStyles(form, 'form', 'form', styleOverrides.form);

  formData.fields.forEach(field => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'chatbot-form-field';
    applyStyles(fieldDiv, 'form', 'field', styleOverrides.field);

    if (field.label) {
      const label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = `chatbot-form-${field.field_name}`;
      applyStyles(label, 'form', 'label', styleOverrides.label);
      fieldDiv.appendChild(label);
    }

    let inputElement;
    if (field.type === 'select' && Array.isArray(field.options)) {
      inputElement = document.createElement('select');
      inputElement.name = field.field_name;
      inputElement.id = `chatbot-form-${field.field_name}`;
      field.options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        inputElement.appendChild(option);
      });
    } else if (field.type === 'textarea') {
      inputElement = document.createElement('textarea');
      inputElement.name = field.field_name;
      inputElement.id = `chatbot-form-${field.field_name}`;
      inputElement.placeholder = field.placeholder || '';
      inputElement.required = !!field.required;
    } else {
      inputElement = document.createElement('input');
      inputElement.type = field.type || 'text';
      inputElement.name = field.field_name;
      inputElement.id = `chatbot-form-${field.field_name}`;
      inputElement.placeholder = field.placeholder || '';
      inputElement.required = !!field.required;
    }

    applyStyles(inputElement, 'form', 'input', {
      backgroundColor: getChatbot().config.style?.messages?.inputBackground,
      color: getChatbot().config.style?.messages?.inputTextColor,
      borderColor: getChatbot().config.style?.messages?.inputBorderColor,
      ...styleOverrides.input
    });

    fieldDiv.appendChild(inputElement);
    form.appendChild(fieldDiv);
  });

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'chatbot-form-submit-button';
  submitButton.textContent = formData.submit_button_text || 'Submit';
  applyStyles(submitButton, 'form', 'submitButton', {
    backgroundColor: getChatbot().config.style?.messages?.buttonColor,
    color: getChatbot().config.style?.messages?.buttonTextColor,
    ...styleOverrides.submitButton
  });
  form.appendChild(submitButton);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formValues = {};
    formData.fields.forEach(field => {
      const input = form.querySelector(`[name="${field.field_name}"]`);
      if (input) formValues[field.field_name] = input.value;
    });

    if (sendMessageCallback) {
      const userMessageText = `Submitted form: ${Object.entries(formValues).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
      const submitPayload = `${formData.submit_payload}${JSON.stringify(formValues)}`;
      sendMessageCallback(userMessageText, submitPayload);
    }
    form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
  });

  container.appendChild(form);
  return container;
}
