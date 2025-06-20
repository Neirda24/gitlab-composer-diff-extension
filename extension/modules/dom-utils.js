/**
 * DOM utilities for the Composer Diff extension.
 * Provides functions for DOM manipulation and querying.
 */

import logger from './logger.js';

/**
 * Find an element in the DOM using multiple selectors
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {Element} [parent=document] - Parent element to search in
 * @param {Function} [filter] - Optional filter function to apply to found elements
 * @returns {Element|null} - The first matching element or null if none found
 */
function findElement(selectors, parent = document, filter = null) {
  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector);
      if (elements.length === 0) continue;

      // Convert to array for easier manipulation
      const elementsArray = Array.from(elements);

      // Log found elements for debugging
      logger.debug(`Found ${elementsArray.length} elements with selector "${selector}"`);

      // If a filter function is provided, apply it
      if (filter && typeof filter === 'function') {
        const filteredElements = elementsArray.filter(filter);
        if (filteredElements.length > 0) {
          logger.debug(`Found ${filteredElements.length} elements after filtering`);
          return filteredElements[0];
        }
      } else if (elementsArray.length > 0) {
        return elementsArray[0];
      }
    } catch (error) {
      logger.error(`Error finding element with selector "${selector}"`, error);
    }
  }

  return null;
}

/**
 * Find all elements in the DOM using multiple selectors
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {Element} [parent=document] - Parent element to search in
 * @param {Function} [filter] - Optional filter function to apply to found elements
 * @returns {Element[]} - Array of matching elements
 */
function findAllElements(selectors, parent = document, filter = null) {
  let results = [];

  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector);
      if (elements.length === 0) continue;

      // Convert to array and add to results
      const elementsArray = Array.from(elements);

      // Log found elements for debugging
      logger.debug(`Found ${elementsArray.length} elements with selector "${selector}"`);

      // If a filter function is provided, apply it
      if (filter && typeof filter === 'function') {
        results = results.concat(elementsArray.filter(filter));
      } else {
        results = results.concat(elementsArray);
      }

      // If we found elements, no need to try more selectors
      if (results.length > 0) break;
    } catch (error) {
      logger.error(`Error finding elements with selector "${selector}"`, error);
    }
  }

  return results;
}

/**
 * Find an element that contains specific text
 * @param {string} text - The text to search for
 * @param {string[]} [selectors=['*']] - Array of CSS selectors to narrow the search
 * @param {Element} [parent=document] - Parent element to search in
 * @returns {Element|null} - The first matching element or null if none found
 */
function findElementContainingText(text, selectors = ['*'], parent = document) {
  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector);
      for (const element of elements) {
        if (element.textContent && element.textContent.includes(text)) {
          logger.debug(`Found element containing text "${text}"`);
          return element;
        }
      }
    } catch (error) {
      logger.error(`Error finding element containing text "${text}" with selector "${selector}"`, error);
    }
  }

  return null;
}

/**
 * Create a DOM observer that watches for changes
 * @param {Function} callback - Function to call when changes are detected
 * @param {number|null} [timeout=null] - Optional timeout to stop observing
 * @param {boolean} [keepObserving=false] - Whether to keep observing after callback
 * @returns {MutationObserver} - The created observer
 */
function createObserver(callback, timeout = null, keepObserving = false) {
  // Create the observer
  const observer = new MutationObserver((mutations, obs) => {
    try {
      callback(mutations, obs);
      if (!keepObserving) {
        obs.disconnect();
      }
    } catch (error) {
      logger.error('Error in observer callback', error);
    }
  });

  // Configure and start the observation
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  // Add an optional timeout
  if (timeout) {
    setTimeout(() => {
      observer.disconnect();
    }, timeout);
  }

  return observer;
}

/**
 * Safely insert an element into the DOM
 * @param {Element} element - The element to insert
 * @param {Element} parent - The parent element to insert into
 * @param {string} [method='prepend'] - The insertion method (prepend, append, before, after)
 * @returns {boolean} - Whether the insertion was successful
 */
function safeInsertElement(element, parent, method = 'prepend') {
  if (!element || !parent) {
    logger.error('Cannot insert element: element or parent is null');
    return false;
  }

  try {
    switch (method) {
      case 'prepend':
        parent.prepend(element);
        break;
      case 'append':
        parent.appendChild(element);
        break;
      case 'before':
        parent.before(element);
        break;
      case 'after':
        parent.after(element);
        break;
      default:
        parent.prepend(element);
    }
    logger.debug(`Successfully inserted element using ${method}`);
    return true;
  } catch (error) {
    logger.error(`Error inserting element using ${method}`, error);
    return false;
  }
}

export default {
  findElement,
  findAllElements,
  findElementContainingText,
  createObserver,
  safeInsertElement
};
