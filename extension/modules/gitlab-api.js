/**
 * GitLab API module for the Composer Diff extension.
 * Provides functions for interacting with the GitLab API.
 */

import logger from './logger.js';

/**
 * GitLab API client
 */
class GitLabApi {
  /**
   * Create a new GitLab API client
   * @param {string} projectId - The GitLab project ID
   * @param {string} projectPath - The GitLab project path
   */
  constructor(projectId, projectPath) {
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.mergeRequestId = null;
    this.sourceBranch = null;
    this.targetBranch = null;
  }

  /**
   * Set the merge request ID
   * @param {string} mergeRequestId - The merge request ID
   * @returns {GitLabApi} - The GitLab API client (for chaining)
   */
  setMergeRequestId(mergeRequestId) {
    this.mergeRequestId = mergeRequestId;
    return this;
  }

  /**
   * Set the source and target branches
   * @param {string} sourceBranch - The source branch
   * @param {string} targetBranch - The target branch
   * @returns {GitLabApi} - The GitLab API client (for chaining)
   */
  setBranches(sourceBranch, targetBranch) {
    this.sourceBranch = sourceBranch;
    this.targetBranch = targetBranch;
    return this;
  }

  /**
   * Load merge request changes from the GitLab API
   * @returns {Promise<Object>} - The merge request changes
   */
  async loadMergeRequestChanges() {
    if (!this.projectId || !this.mergeRequestId) {
      throw new Error('Project ID and merge request ID are required');
    }

    const changesUrl = `/api/v4/projects/${this.projectId}/merge_requests/${this.mergeRequestId}/changes`;
    logger.info('Fetching merge request changes', changesUrl);

    try {
      const response = await fetch(changesUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch changes: ${response.status} ${response.statusText}`);
      }

      const changes = await response.json();
      logger.debug('Received merge request changes', changes);

      // Update branches if they're in the response
      if (changes.source_branch) {
        this.sourceBranch = changes.source_branch;
      }

      if (changes.target_branch) {
        this.targetBranch = changes.target_branch;
      }

      return changes;
    } catch (error) {
      logger.error('Error loading merge request changes', error);
      throw error;
    }
  }

  /**
   * Check if composer.lock file is present in the merge request changes
   * @param {Object} changes - The merge request changes
   * @returns {boolean} - Whether composer.lock is present
   */
  hasComposerLock(changes) {
    logger.info('Checking for composer.lock file in changes');

    if (!changes || !changes.changes) {
      logger.warn('No changes found in the merge request');
      return false;
    }

    for (const change of changes.changes) {
      if (change.new_path.includes('composer.lock') || change.old_path.includes('composer.lock')) {
        logger.info('Found composer.lock in changes');
        return true;
      }
    }

    logger.info('No composer.lock file found in changes');
    return false;
  }

  /**
   * Fetch the content of composer.lock from source and target branches
   * @returns {Promise<Object>} - Object containing oldContent and newContent
   */
  async fetchComposerLockContent() {
    if (!this.projectPath || !this.sourceBranch || !this.targetBranch) {
      throw new Error('Project path, source branch, and target branch are required');
    }

    logger.info('Fetching composer.lock content from source and target branches');

    try {
      // Construct the URLs for the raw files
      const sourceFileUrl = `/${this.projectPath}/-/raw/${this.sourceBranch}/composer.lock`;
      const targetFileUrl = `/${this.projectPath}/-/raw/${this.targetBranch}/composer.lock`;

      logger.debug('Source file URL', sourceFileUrl);
      logger.debug('Target file URL', targetFileUrl);

      // Fetch both files in parallel
      const [sourceResponse, targetResponse] = await Promise.all([
        fetch(sourceFileUrl),
        fetch(targetFileUrl)
      ]);

      // Check if both requests were successful
      if (sourceResponse.ok && targetResponse.ok) {
        const sourceContent = await sourceResponse.text();
        const targetContent = await targetResponse.text();

        logger.info('Successfully fetched composer.lock files');

        return {
          oldContent: targetContent, // Target branch is the "old" content (base branch)
          newContent: sourceContent  // Source branch is the "new" content (feature branch)
        };
      } else {
        logger.warn('Failed to fetch complete files');

        if (!sourceResponse.ok) {
          logger.error('Source file fetch failed', sourceResponse.status);
        }

        if (!targetResponse.ok) {
          logger.error('Target file fetch failed', targetResponse.status);
        }

        // Return empty objects as fallback
        return {
          oldContent: '{}',
          newContent: '{}'
        };
      }
    } catch (error) {
      logger.error('Error fetching composer.lock content', error);

      // Return empty objects as fallback
      return {
        oldContent: '{}',
        newContent: '{}'
      };
    }
  }

  /**
   * Extract project information from the page
   * @returns {Object} - Object containing project information
   */
  static extractProjectInfoFromPage() {
    logger.info('Extracting project information from page');

    const bodyElement = document.querySelector('body');
    if (!bodyElement) {
      logger.error('Could not find body element');
      return {};
    }

    const projectPath = bodyElement.getAttribute('data-project-full-path');
    const projectId = bodyElement.getAttribute('data-project-id');
    const mergeRequestId = bodyElement.getAttribute('data-page-type-id');

    logger.debug('Extracted project information', { projectPath, projectId, mergeRequestId });

    return {
      projectPath,
      projectId,
      mergeRequestId
    };
  }

  /**
   * Check if the current page is a GitLab merge request diff page
   * @returns {boolean} - Whether the current page is a GitLab merge request diff page
   */
  static isGitLabMergeRequestDiffPage() {
    const url = window.location.href;
    return url.includes('/merge_requests/') && url.includes('/diffs');
  }

  /**
   * Check if the current page is a GitLab instance
   * @returns {Promise<boolean>} - Whether the current page is a GitLab instance
   */
  static async isGitLabInstance() {
    try {
      const response = await fetch('/-/manifest.json');
      if (!response.ok) {
        return false;
      }

      const manifest = await response.json();
      return manifest.name === 'GitLab';
    } catch (error) {
      logger.error('Error checking if page is GitLab instance', error);
      return false;
    }
  }
}

export default GitLabApi;
