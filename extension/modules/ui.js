/**
 * UI module for the Composer Diff extension.
 * Provides functions for creating and manipulating UI elements.
 */

import logger from './logger.js';
import domUtils from './dom-utils.js';

// Selectors for finding composer.lock elements
const COMPOSER_LOCK_SELECTORS = [
  '.file-title-name',
  '.file-header-content .file-title-name',
  '.diff-file-header .file-title-name',
  '.diff-file .file-title',
  '.diff-file .file-header-content',
  '.js-file-title',
  '.file-header .file-title-name',
  '.file-title',
  '[data-path*="composer.lock"]',
  '[title*="composer.lock"]',
  '.diff-file-header',
  '.diff-file'
];

// Selectors for finding parent containers
const PARENT_SELECTORS = [
  '.diff-file',
  '.file',
  '.diff-file-holder',
  '.js-file-holder',
  '.file-holder',
  '.diff-content',
  '.diff-wrap'
];

// Selectors for finding content containers
const CONTENT_SELECTORS = [
  '.diff-content',
  '.file-content',
  '.diff-file-content',
  '.js-file-content',
  '.file-holder',
  '.diff-table',
  '.content-wrapper',
  '.diff-wrap-lines',
  '.diff-wrap'
];

// Selectors for fallback containers
const FALLBACK_SELECTORS = [
  '.diffs',
  '.diff-files-holder',
  '#diffs',
  '.content-wrapper'
];

/**
 * Find the composer.lock element in the page
 * @returns {Element|null} - The composer.lock element or null if not found
 */
function findComposerLockElement() {
  logger.info('Finding composer.lock element in the page');

  // First try to find elements that match our selectors
  const fileElements = domUtils.findAllElements(COMPOSER_LOCK_SELECTORS);

  // Check each element for composer.lock
  for (const element of fileElements) {
    // Check text content, data-path, and title attributes
    if (element.textContent?.trim().includes('composer.lock') ||
        (element.dataset?.path && element.dataset.path.includes('composer.lock')) ||
        (element.getAttribute('title') && element.getAttribute('title').includes('composer.lock'))) {

      logger.debug('Found element with composer.lock reference', element);

      // Try to find a suitable parent container
      for (const parentSelector of PARENT_SELECTORS) {
        const parent = element.closest(parentSelector);
        if (parent) {
          logger.info('Found composer.lock parent element', parent);
          return parent;
        }
      }
    }
  }

  // If we still couldn't find the composer.lock element, try a more aggressive approach
  logger.warn('Could not find composer.lock element using standard selectors, trying alternative approach');

  // Try to find any element that contains "composer.lock" anywhere in its text
  const elementWithText = domUtils.findElementContainingText('composer.lock');
  if (elementWithText) {
    logger.debug('Found element with composer.lock text', elementWithText);

    // Try to find a suitable parent container
    for (const parentSelector of PARENT_SELECTORS) {
      const parent = elementWithText.closest(parentSelector);
      if (parent) {
        logger.info('Found composer.lock parent element using alternative approach', parent);
        return parent;
      }
    }
  }

  // If we still couldn't find it, try to find the first diff file as a fallback
  logger.warn('Still could not find composer.lock element, trying to use first diff file as fallback');

  const firstDiffFile = domUtils.findElement(PARENT_SELECTORS);
  if (firstDiffFile) {
    logger.info('Using first diff file as fallback', firstDiffFile);
    return firstDiffFile;
  }

  // As a last resort, try to find a container for diffs
  logger.warn('Could not find any suitable element in the page for insertion, trying fallback containers');

  const diffsContainer = domUtils.findElement(FALLBACK_SELECTORS);
  if (diffsContainer) {
    logger.info('Using diffs container as last resort', diffsContainer);
    return diffsContainer;
  }

  // If all else fails, just use the body
  logger.warn('Using document body as final fallback');
  return document.body;
}

/**
 * Find the content element to insert the diff into
 * @param {Element} composerLockElement - The composer.lock element
 * @returns {Element} - The content element
 */
function findContentElement(composerLockElement) {
  logger.info('Finding content element to insert diff into');

  // Only try to find a child element if composerLockElement is not the body
  if (composerLockElement !== document.body) {
    for (const selector of CONTENT_SELECTORS) {
      try {
        const element = composerLockElement.querySelector(selector);
        if (element) {
          logger.debug(`Found content element with selector "${selector}"`, element);
          return element;
        }
      } catch (error) {
        logger.error(`Error finding element with selector "${selector}"`, error);
      }
    }
  }

  // If we still can't find a suitable element, use the composer.lock element itself
  logger.info('Could not find specific content element, using composer.lock element itself');
  return composerLockElement;
}

/**
 * Create the diff container element
 * @param {string} htmlContent - The HTML content to insert
 * @returns {Element} - The created container element
 */
function createDiffContainer(htmlContent) {
  logger.info('Creating diff container');

  // Create the container for our diff
  const diffContainer = document.createElement('div');
  diffContainer.className = 'composer-diff-container';

  // Add a header
  const header = document.createElement('div');
  header.className = 'composer-diff-header';

  const title = document.createElement('h3');
  title.className = 'composer-diff-title';
  title.textContent = 'Composer Diff';

  header.appendChild(title);

  // Add the diff content
  const content = document.createElement('div');
  content.className = 'markdown-content';
  content.innerHTML = htmlContent;

  // Add everything to the container
  diffContainer.appendChild(header);
  diffContainer.appendChild(content);

  return diffContainer;
}

/**
 * Insert the diff into the page
 * @param {string} htmlContent - The HTML content to insert
 * @returns {boolean} - Whether the insertion was successful
 */
function insertDiffIntoPage(htmlContent) {
  logger.info('Inserting diff into page');

  try {
    // Find the composer.lock element
    const composerLockElement = findComposerLockElement();
    if (!composerLockElement) {
      logger.error('Could not find any element to insert diff into');
      return false;
    }

    // Check if we already added our diff
    const existingDiff = composerLockElement.querySelector('.composer-diff-container');
    if (existingDiff) {
      logger.debug('Removing existing diff');
      existingDiff.remove();
    }

    // Create the diff container
    const diffContainer = createDiffContainer(htmlContent);

    // Find the content element to insert the diff into
    const contentElement = findContentElement(composerLockElement);

    // Insert the container
    return domUtils.safeInsertElement(diffContainer, contentElement, 'prepend');
  } catch (error) {
    logger.error('Error inserting diff into page', error);
    return false;
  }
}

/**
 * Add a scroll event listener to re-insert the diff if it disappears
 * @param {string} htmlContent - The HTML content to insert
 */
function addScrollEventListener(htmlContent) {
  logger.info('Adding scroll event listener');

  // Only add the scroll event listener once
  if (window.composerDiffScrollListenerAdded) {
    logger.debug('Scroll event listener already added');
    return;
  }

  window.composerDiffScrollListenerAdded = true;

  window.addEventListener('scroll', function() {
    // Use a debounce to avoid too many checks
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(function() {
      // Check if the diff is still in the DOM
      const existingDiff = document.querySelector('.composer-diff-container');
      if (!existingDiff) {
        logger.info('Diff disappeared after scroll, re-inserting');
        insertDiffIntoPage(htmlContent);
      }
    }, 200);
  });

  logger.debug('Scroll event listener added');
}

/**
 * Get debug information about the current page
 * @returns {Object} - Debug information
 */
function getDebugInfo() {
  logger.info('Getting debug information');

  const url = window.location.href;
  const isGitLab = url.includes('gitlab.com') || document.querySelector('meta[content*="GitLab"]') !== null;
  const isSelfHosted = isGitLab && !url.includes('gitlab.com');
  const isMergeRequest = url.includes('/merge_requests/');

  // Get source and target branches
  let sourceBranch = 'Unknown';
  let targetBranch = 'Unknown';
  let mrDataUrl = null;

  // Try to get the data-url attribute from the merge request element
  const mergeRequestElement = document.querySelector('#content-body > div.merge-request');
  if (mergeRequestElement) {
    mrDataUrl = mergeRequestElement.getAttribute('data-url');
    logger.debug('Found merge request data-url', mrDataUrl);

    // If we have the data-url, we can extract more information from it
    if (mrDataUrl) {
      try {
        // The data-url might contain JSON data with branch information
        const mrData = JSON.parse(mergeRequestElement.getAttribute('data-mr-metadata') || '{}');
        logger.debug('Merge request metadata', mrData);

        if (mrData.source_branch) {
          sourceBranch = mrData.source_branch;
          logger.debug('Source branch from metadata', sourceBranch);
        }

        if (mrData.target_branch) {
          targetBranch = mrData.target_branch;
          logger.debug('Target branch from metadata', targetBranch);
        }
      } catch (error) {
        logger.error('Error parsing merge request metadata', error);
      }
    }
  }

  // Try to get branch information using the specified CSS selector
  if (sourceBranch === 'Unknown' || targetBranch === 'Unknown') {
    logger.debug('Trying to get branch information using CSS selector');

    const branchSelector = "#content-body > div.merge-request > div.merge-request-details.issuable-details > div.detail-page-description.gl-pt-2.gl-pb-4.gl-flex.gl-items-baseline.gl-flex-wrap.gl-text-subtle.is-merge-request > a[title]";
    const branchLinks = document.querySelectorAll(branchSelector);

    if (branchLinks.length >= 2) {
      // First result is the source branch
      sourceBranch = branchLinks[0].textContent.trim();
      // Second result is the target branch
      targetBranch = branchLinks[1].textContent.trim();
      logger.debug('Branches from specified selector', { sourceBranch, targetBranch });
    }
  }

  // If we couldn't get the branches from the data-url or the specified selector, fall back to DOM selectors
  if (sourceBranch === 'Unknown' || targetBranch === 'Unknown') {
    logger.debug('Falling back to DOM selectors for branch information');

    // Try to find branch information in the DOM
    const branchElements = document.querySelectorAll('.ref-name');
    if (branchElements.length >= 2) {
      sourceBranch = branchElements[0].textContent.trim();
      targetBranch = branchElements[1].textContent.trim();
      logger.debug('Branches from .ref-name elements', { sourceBranch, targetBranch });
    }

    // If we still couldn't find the branches, try other selectors
    if (sourceBranch === 'Unknown') {
      const sourceElement = document.querySelector('.js-source-branch') ||
                           document.querySelector('.source-branch-name');
      if (sourceElement) {
        sourceBranch = sourceElement.textContent.trim();
        logger.debug('Source branch from alternative selector', sourceBranch);
      }
    }

    if (targetBranch === 'Unknown') {
      const targetElement = document.querySelector('.js-target-branch') ||
                           document.querySelector('.target-branch-name');
      if (targetElement) {
        targetBranch = targetElement.textContent.trim();
        logger.debug('Target branch from alternative selector', targetBranch);
      }
    }
  }

  return {
    isGitLab,
    isSelfHosted,
    isMergeRequest,
    sourceBranch,
    targetBranch,
    mrDataUrl
  };
}

export default {
  findComposerLockElement,
  findContentElement,
  createDiffContainer,
  insertDiffIntoPage,
  addScrollEventListener,
  getDebugInfo
};
