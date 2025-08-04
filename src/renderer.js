// src/renderer.js
import { loadScript } from './utils';

/**
 * Renders various message types.
 * @param {object} messageData - The message object from the bot response.
 * @param {string} type - The type of content to render (e.g., 'buttons', 'image', 'video', 'carousel').
 * @param {function} [sendMessageCallback] - Callback for sending messages (e.g., for button clicks).
 * @returns {HTMLElement|null} The created HTML element or null if type is not recognized.
 */
export function renderMessage(messageData, type, sendMessageCallback = null) {
  switch (type) {
    case 'buttons':
      return createButtons(messageData.buttons, sendMessageCallback);
    case 'image':
      return createImage(messageData.image);
    case 'video':
      return createVideo(messageData.video);
    case 'carousel':
      return createCarousel(messageData.carousel, sendMessageCallback);
    default:
      return null;
  }
}

/**
 * Renders custom payload types.
 * @param {object} customPayload - The 'custom' object from the bot response.
 * @param {function} [sendMessageCallback] - Callback for sending messages (e.g., for form submissions).
 * @returns {HTMLElement|null} The created HTML element or null if no custom payload.
 */
export function renderCustomPayload(customPayload, sendMessageCallback = null) {
    if (!customPayload) return null;

    const customContainer = document.createElement('div');
    customContainer.classList.add('chatbot-custom-payload');

    if (customPayload.locations) {
        const mapEl = createLocationsMap(customPayload.locations);
        if (mapEl) customContainer.appendChild(mapEl);
    }
    if (customPayload.faq_list) {
        const faqEl = createFaqList(customPayload.faq_list);
        if (faqEl) customContainer.appendChild(faqEl);
    }
    if (customPayload.table) {
        const tableEl = createTable(customPayload.table);
        if (tableEl) customContainer.appendChild(tableEl);
    }
    if (customPayload.rating) {
        const ratingEl = createRating(customPayload.rating, sendMessageCallback);
        if (ratingEl) customContainer.appendChild(ratingEl);
    }
    if (customPayload.forms) {
        const formEl = createDynamicForm(customPayload.forms, sendMessageCallback);
        if (formEl) customContainer.appendChild(formEl);
    }

    return customContainer.children.length > 0 ? customContainer : null;
}


// --- Helper functions for specific message types ---

function createButtons(buttons, sendMessageCallback) {
  if (!buttons || buttons.length === 0) return null;
  const container = document.createElement('div');
  container.className = 'chatbot-button-container';

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.title;
    if (btn.button_color) {
        button.style.backgroundColor = btn.button_color;
        button.style.color = 'white'; // Ensure text is visible
        button.style.borderColor = btn.button_color;
    }

    if (btn.payload) {
      button.addEventListener('click', () => {
        // Prevent multiple clicks on buttons by disabling them after click
        container.querySelectorAll('button').forEach(b => b.disabled = true);
        if (sendMessageCallback) {
            sendMessageCallback(btn.title, btn.payload);
        }
      });
    } else if (btn.url) {
      button.addEventListener('click', () => window.open(btn.url, '_blank'));
    }
    container.appendChild(button);
  });
  return container;
}

function createImage(imageUrl) {
  if (!imageUrl) return null;
  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'chatbot-image';
  return img;
}

function createVideo(videoUrl) {
  if (!videoUrl) return null;
  const video = document.createElement('video');
  video.src = videoUrl;
  video.controls = true;
  video.className = 'chatbot-video';
  return video;
}

function createCarousel(carouselItems, sendMessageCallback) {
  if (!carouselItems || carouselItems.length === 0) return null;
  const container = document.createElement('div');
  container.className = 'chatbot-carousel-container';

  carouselItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'chatbot-carousel-card';

    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.className = 'chatbot-carousel-card-image';
      card.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'chatbot-carousel-card-content';

    const title = document.createElement('h3');
    title.className = 'chatbot-carousel-card-title';
    title.textContent = item.title;
    content.appendChild(title);

    if (item.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'chatbot-carousel-card-subtitle';
      subtitle.textContent = item.subtitle;
      content.appendChild(subtitle);
    }

    if (item.buttons && item.buttons.length > 0) {
      const buttonsContainer = createButtons(item.buttons, sendMessageCallback);
      if (buttonsContainer) content.appendChild(buttonsContainer);
    }
    card.appendChild(content);
    container.appendChild(card);
  });
  return container;
}

function createLocationsMap(locations) {
    if (!locations || locations.length === 0) return null;

    const mapContainer = document.createElement('div');
    mapContainer.className = 'chatbot-map-container';
    mapContainer.style.width = '100%';
    mapContainer.style.height = '300px';
    mapContainer.style.borderRadius = '8px';
    mapContainer.style.marginTop = '10px';
    mapContainer.style.overflow = 'hidden';

    // Placeholder for map - actual map rendering needs external library like Google Maps or Leaflet.
    // For Google Maps, you'd typically need to load their API script and initialize.
    // This example assumes Google Maps API is loaded via `loadScript` in `utils.js`
    // and you have an API key.

    // Example with Google Maps (requires API Key):
    const API_KEY = 'YOUR_Maps_API_KEY'; // Replace with your actual API key
    if (!API_KEY || API_KEY === 'YOUR_Maps_API_KEY') {
        mapContainer.textContent = 'Map requires Google Maps API Key.';
        mapContainer.style.backgroundColor = '#f8d7da';
        mapContainer.style.color = '#721c24';
        mapContainer.style.padding = '10px';
        mapContainer.style.textAlign = 'center';
        return mapContainer;
    }

    loadScript(`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initChatbotMap`, 'google-maps-api')
        .then(() => {
            // Define global callback if not already
            if (typeof window.initChatbotMap === 'undefined') {
                window.initChatbotMap = () => {
                    // This callback is called by Google Maps API once it's loaded
                    // We need to re-trigger the map creation for any pending maps
                    document.querySelectorAll('.chatbot-map-container[data-map-initialized="false"]').forEach(el => {
                        const mapLocations = JSON.parse(el.dataset.locations);
                        createGoogleMapInstance(el, mapLocations);
                    });
                };
            }
            // If API is already loaded, callback might not fire, so check
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                 createGoogleMapInstance(mapContainer, locations);
            }
        })
        .catch(error => console.error("Error loading Google Maps script:", error));

    // Store locations and initialization status for later use by global callback
    mapContainer.setAttribute('data-map-initialized', 'false');
    mapContainer.setAttribute('data-locations', JSON.stringify(locations));


    function createGoogleMapInstance(mapElement, locs) {
        if (mapElement.getAttribute('data-map-initialized') === 'true') {
            return; // Already initialized
        }
        if (!locs || locs.length === 0) return;

        const centerLat = locs.reduce((sum, l) => sum + l.lat, 0) / locs.length;
        const centerLng = locs.reduce((sum, l) => sum + l.lng, 0) / locs.length;

        const map = new google.maps.Map(mapElement, {
            center: { lat: centerLat, lng: centerLng },
            zoom: 10,
        });

        locs.forEach(loc => {
            new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lng },
                map: map,
                title: loc.name,
                label: loc.label || loc.name[0],
            });
        });
        mapElement.setAttribute('data-map-initialized', 'true');
    }

    return mapContainer;
}

function createFaqList(faqs) {
    if (!faqs || faqs.length === 0) return null;
    const container = document.createElement('div');
    container.className = 'chatbot-faq-list-container';
    container.style.marginTop = '10px';

    faqs.forEach((faq, index) => {
        const item = document.createElement('div');
        item.className = 'chatbot-faq-item';

        const question = document.createElement('div');
        question.className = 'chatbot-faq-question';
        question.textContent = faq.question;
        item.appendChild(question);

        const answer = document.createElement('div');
        answer.className = 'chatbot-faq-answer';
        answer.innerHTML = faq.answer; // Assuming answer can contain HTML/markdown already
        item.appendChild(answer);

        question.addEventListener('click', () => {
            item.classList.toggle('expanded');
        });
        container.appendChild(item);
    });
    return container;
}

function createTable(tableData) {
    if (!tableData || !tableData.headers || !tableData.rows) return null;

    const container = document.createElement('div');
    container.className = 'chatbot-table-container';

    const table = document.createElement('table');
    table.className = 'chatbot-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    tableData.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
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
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
    return container;
}

function createRating(ratingData, sendMessageCallback) {
    if (!ratingData || !ratingData.scale) return null;

    const container = document.createElement('div');
    container.className = 'chatbot-rating-container';

    const title = document.createElement('div');
    title.className = 'chatbot-rating-title';
    title.textContent = ratingData.title || 'Please rate:';
    container.appendChild(title);

    const starsContainer = document.createElement('div');
    starsContainer.className = 'chatbot-stars';
    let selectedRating = 0;

    for (let i = ratingData.scale; i >= 1; i--) {
        const star = document.createElement('span');
        star.innerHTML = '&#9733;'; // Unicode star character
        star.dataset.value = i;

        star.addEventListener('mouseover', () => {
            starsContainer.querySelectorAll('span').forEach(s => {
                if (parseInt(s.dataset.value) >= i) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });

        star.addEventListener('mouseout', () => {
            starsContainer.querySelectorAll('span').forEach(s => s.classList.remove('hover'));
        });

        star.addEventListener('click', () => {
            selectedRating = i;
            starsContainer.querySelectorAll('span').forEach(s => {
                if (parseInt(s.dataset.value) <= selectedRating) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
            if (sendMessageCallback) {
                // Send the rating as a payload
                sendMessageCallback(`Rated ${selectedRating} stars`, `/rate_service{"rating":${selectedRating}}`);
            }
        });
        starsContainer.appendChild(star);
    }
    container.appendChild(starsContainer);
    return container;
}

function createDynamicForm(formData, sendMessageCallback) {
    if (!formData || !formData.fields || !formData.submit_payload) return null;

    const container = document.createElement('div');
    container.className = 'chatbot-form-container';

    if (formData.title) {
        const title = document.createElement('div');
        title.className = 'chatbot-form-title';
        title.textContent = formData.title;
        container.appendChild(title);
    }

    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formValues = {};
        formData.fields.forEach(field => {
            const input = form.querySelector(`[name="${field.field_name}"]`);
            if (input) {
                formValues[field.field_name] = input.value;
            }
        });

        if (sendMessageCallback) {
            // Construct a human-readable message for the user's bubble
            const userMessageText = `Submitted form: ${Object.entries(formValues).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
            // Send the payload with form data
            const submitPayload = `${formData.submit_payload}${JSON.stringify(formValues)}`;
            sendMessageCallback(userMessageText, submitPayload);
        }
        // Optionally disable form after submission to prevent re-submission
        form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
    });

    formData.fields.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'chatbot-form-field';

        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = `chatbot-form-${field.field_name}`;
        fieldDiv.appendChild(label);

        let inputElement;
        if (field.type === 'select' && field.options) {
            inputElement = document.createElement('select');
            field.options.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                inputElement.appendChild(option);
            });
        } else {
            inputElement = document.createElement('input');
            inputElement.type = field.type;
        }
        inputElement.id = `chatbot-form-${field.field_name}`;
        inputElement.name = field.field_name;
        inputElement.placeholder = field.placeholder || '';
        inputElement.required = field.required || false;

        fieldDiv.appendChild(inputElement);
        form.appendChild(fieldDiv);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'chatbot-form-submit-button';
    submitButton.textContent = formData.submit_button_text || 'Submit';
    form.appendChild(submitButton);

    container.appendChild(form);
    return container;
}