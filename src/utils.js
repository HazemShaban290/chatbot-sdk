// src/utils.js

/**
 * Generates a unique session ID.
 * @returns {string} A unique ID.
 */
export function generateUniqueId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Stores data in localStorage.
 * @param {string} key - The key to store data under.
 * @param {*} value - The data to store.
 */
export function setLocalStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Chatbot SDK: localStorage write error:', e);
  }
}

/**
 * Retrieves data from localStorage.
 * @param {string} key - The key to retrieve data from.
 * @returns {*} The retrieved data, or null if not found/error.
 */
export function getLocalStorageItem(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn('Chatbot SDK: localStorage read error:', e);
    return null;
  }
}

/**
 * Basic Markdown parsing for bold, italics, links.
 * This is a simplified parser. For full markdown, consider a tiny library if allowed.
 * @param {string} text - The text to parse.
 * @returns {string} HTML string with basic markdown applied.
 */
export function parseMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italics: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br/>');

    return html;
}

/**
 * Dynamically loads an external script.
 * @param {string} url - The URL of the script.
 * @param {string} id - A unique ID for the script tag.
 * @returns {Promise<void>} A promise that resolves when the script is loaded.
 */
export function loadScript(url, id) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            return resolve(); // Already loaded
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = url;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}