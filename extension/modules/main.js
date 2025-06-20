/**
 * Main module for the Composer Diff extension.
 * Entry point for the extension.
 */

import logger from './logger.js';
import GitLabApi from './gitlab-api.js';
import composerDiff from './composer-diff.js';
import ui from './ui.js';

// Global state
let composerLockFound = false;
let diffGenerated = false;

/**
 * Initialize the extension
 */
async function initialize() {
  logger.info('Initializing extension');

  try {
    // Check if we're on a GitLab instance
    const isGitLab = await GitLabApi.isGitLabInstance();
    if (!isGitLab) {
      logger.info('Not a GitLab instance, exiting initialization');
      return;
    }

    // Check if we're on a merge request diff page
    if (!GitLabApi.isGitLabMergeRequestDiffPage()) {
      logger.info('Not on a merge request diff page, exiting initialization');
      return;
    }

    logger.info('On a GitLab merge request diff page, continuing initialization');

    // Extract project information from the page
    const { projectId, projectPath, mergeRequestId } = GitLabApi.extractProjectInfoFromPage();

    if (!projectId || !projectPath || !mergeRequestId) {
      logger.error('Could not extract project information from page');
      return;
    }

    // Create a GitLab API client
    const gitlabApi = new GitLabApi(projectId, projectPath);
    gitlabApi.setMergeRequestId(mergeRequestId);

    // Load merge request changes
    const changes = await gitlabApi.loadMergeRequestChanges();

    // Update branches
    gitlabApi.setBranches(changes.source_branch, changes.target_branch);

    // Check if composer.lock is present in the changes
    composerLockFound = gitlabApi.hasComposerLock(changes);

    if (!composerLockFound) {
      logger.info('No composer.lock file found in this merge request');
      return;
    }

    // Generate the diff
    await generateDiff(gitlabApi);

  } catch (error) {
    logger.error('Error during initialization', error);
  }
}

/**
 * Generate the composer diff and insert it into the page
 * @param {GitLabApi} gitlabApi - The GitLab API client
 */
async function generateDiff(gitlabApi) {
  logger.info('Generating composer diff');

  if (!composerLockFound) {
    logger.warn('No composer.lock file found, cannot generate diff');
    return;
  }

  try {
    // Fetch composer.lock content
    const { oldContent, newContent } = await gitlabApi.fetchComposerLockContent();

    // Generate HTML diff
    const htmlDiff = composerDiff.generateHtml(oldContent, newContent);

    // Insert the diff into the page
    const inserted = ui.insertDiffIntoPage(htmlDiff);

    if (inserted) {
      logger.info('Diff inserted successfully');
      diffGenerated = true;

      // Add scroll event listener to re-insert the diff if it disappears
      ui.addScrollEventListener(htmlDiff);
    } else {
      logger.error('Failed to insert diff into page');
    }
  } catch (error) {
    logger.error('Error generating diff', error);
  }
}

/**
 * Handle messages from the popup
 * @param {Object} request - The request message
 * @param {Object} sender - The sender of the message
 * @param {Function} sendResponse - Function to send a response
 */
function handleMessage(request, sender, sendResponse) {
  logger.info('Received message from popup', request);

  if (request.action === 'checkComposerLock') {
    // If we've already found composer.lock, no need to check again
    if (composerLockFound) {
      sendResponse({ found: true });
    } else {
      // We haven't found composer.lock yet
      sendResponse({ found: false });
    }
  } else if (request.action === 'getDebugInfo') {
    // Gather debug information
    const debugInfo = ui.getDebugInfo();
    debugInfo.composerLockFound = composerLockFound;
    debugInfo.diffGenerated = diffGenerated;

    sendResponse(debugInfo);
  }
}

// Note: We no longer need these event listeners since we're explicitly calling initialize from content.js
// But we'll keep them commented out for reference
/*
document.addEventListener('DOMContentLoaded', function() {
  logger.info('DOMContentLoaded event fired');
  // Wait a short time to ensure GitLab has finished rendering
  setTimeout(initialize, 1000);
});

window.addEventListener('load', function() {
  logger.info('Window load event fired');
  // Wait a short time to ensure GitLab has finished rendering
  setTimeout(initialize, 1000);
});
*/

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(handleMessage);

// Export for testing
export default {
  initialize,
  generateDiff,
  handleMessage
};
