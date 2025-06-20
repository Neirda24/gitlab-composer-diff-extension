// Global variables
let composerLockFound = false;
let diffGenerated = false;
let mergeRequestId = null;
let sourceBranch = null;
let targetBranch = null;
let projectId = null;
let projectPath = null;
let changes = null;

// Initialize the extension when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded event fired');
  // Wait a short time to ensure GitLab has finished rendering
  setTimeout(initialize, 1000);
});

// Also try to initialize when the window is fully loaded
window.addEventListener('load', function() {
  console.log('Window load event fired');
  // Wait a short time to ensure GitLab has finished rendering
  setTimeout(initialize, 1000);
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Received message from popup:', request);

  if (request.action === 'checkComposerLock') {
    // If we've already found composer.lock, no need to check again
    if (composerLockFound) {
      sendResponse({ found: true });
    } else {
      // Check for composer.lock files
      const found = checkForComposerLock();
      sendResponse({ found });
    }
  } else if (request.action === 'getDebugInfo') {
    // Gather debug information
    const debugInfo = getDebugInfo();
    sendResponse(debugInfo);
  }
});

// Initialize the extension
async function initialize() {
  const manifest = await fetch('/-/manifest.json').then(response => response.json());

  console.log(manifest);
  if (manifest.name !== 'GitLab') {
    console.log('Not a GitLab instance, exiting initialization');
    return;
  }

  // Check if we're on a merge request page
  if (!window.location.href.includes('/merge_requests/')) {
    console.log('Not on a merge request page, exiting initialization');
    return;
  }

  // Check if we're on the diff tab
  if (!window.location.href.includes('/diffs')) {
    console.log('Not on the diffs tab, exiting initialization');
    return;
  }

  const bodyElement = document.querySelector('body');

  projectPath = bodyElement.getAttribute('data-project-full-path');
  projectId = bodyElement.getAttribute('data-project-id');
  mergeRequestId = bodyElement.getAttribute('data-page-type-id');

  changes = await loadChanges();

  sourceBranch = changes.source_branch;
  targetBranch = changes.target_branch;

  console.log('On a merge request page, continuing initialization');

  try {
    composerLockFound = await checkForComposerLock(changes);

    // If composer.lock is found and auto-run is enabled, generate the diff
    if (composerLockFound) {
      console.log('Composer.lock found, generating diff');
      try {
        await generateDiff();
        console.log('Diff generated successfully during initialization');
      } catch (error) {
        console.error('Error generating diff during initialization:', error);
      }
    } else {
      console.log('No composer.lock file found during initialization');
    }

  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

async function loadChanges() {
  const changesUrl = `/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}/changes`;
  console.log('Fetching changes from:', changesUrl);

  return await fetch(changesUrl).then(response => response.json());
}

// Check if composer.lock file is present in the merge request
async function checkForComposerLock(changes) {
  console.log('Checking for composer.lock file...');

  if (changes.changes) {
    for (const change of changes.changes) {
      if (change.new_path.includes('composer.lock') || change.old_path.includes('composer.lock')) {
        console.log('Found composer.lock in changes API response');

        return true
      }
    }
  }

  return false;
}

// Get debug information about the current page
function getDebugInfo() {
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
    console.log('Found merge request data-url:', mrDataUrl);

    // If we have the data-url, we can extract more information from it
    if (mrDataUrl) {
      try {
        // The data-url might contain JSON data with branch information
        const mrData = JSON.parse(mergeRequestElement.getAttribute('data-mr-metadata') || '{}');
        console.log('Merge request metadata:', mrData);

        if (mrData.source_branch) {
          sourceBranch = mrData.source_branch;
          console.log('Source branch from metadata:', sourceBranch);
        }

        if (mrData.target_branch) {
          targetBranch = mrData.target_branch;
          console.log('Target branch from metadata:', targetBranch);
        }

        // Check if there are endpoints we can use
        const endpoints = {
          patch_path: mergeRequestElement.getAttribute('data-patch-path'),
          plain_diff_path: mergeRequestElement.getAttribute('data-plain-diff-path'),
          diffs_path: mergeRequestElement.getAttribute('data-diffs-path')
        };
        console.log('Available endpoints:', endpoints);
      } catch (error) {
        console.error('Error parsing merge request metadata:', error);
      }
    }
  } else {
    console.log('Could not find merge request element with selector "#content-body > div.merge-request"');
  }

  // Try to get branch information using the specified CSS selector
  if (sourceBranch === 'Unknown' || targetBranch === 'Unknown') {
    console.log('Trying to get branch information using the specified CSS selector');

    const branchSelector = "#content-body > div.merge-request > div.merge-request-details.issuable-details > div.detail-page-description.gl-pt-2.gl-pb-4.gl-flex.gl-items-baseline.gl-flex-wrap.gl-text-subtle.is-merge-request > a[title]";
    const branchLinks = document.querySelectorAll(branchSelector);

    if (branchLinks.length >= 2) {
      // First result is the source branch
      sourceBranch = branchLinks[0].textContent.trim();
      // Second result is the target branch
      targetBranch = branchLinks[1].textContent.trim();
      console.log('Branches from specified selector:', { sourceBranch, targetBranch });
    } else {
      console.log('Could not find branch information using the specified selector, found', branchLinks.length, 'elements');
    }
  }

  // If we couldn't get the branches from the data-url or the specified selector, fall back to DOM selectors
  if (sourceBranch === 'Unknown' || targetBranch === 'Unknown') {
    console.log('Falling back to DOM selectors for branch information');

    // Try to find branch information in the DOM
    const branchElements = document.querySelectorAll('.ref-name');
    if (branchElements.length >= 2) {
      sourceBranch = branchElements[0].textContent.trim();
      targetBranch = branchElements[1].textContent.trim();
      console.log('Branches from .ref-name elements:', { sourceBranch, targetBranch });
    }

    // If we still couldn't find the branches, try other selectors
    if (sourceBranch === 'Unknown') {
      const sourceElement = document.querySelector('.js-source-branch') ||
                           document.querySelector('.source-branch-name');
      if (sourceElement) {
        sourceBranch = sourceElement.textContent.trim();
        console.log('Source branch from alternative selector:', sourceBranch);
      }
    }

    if (targetBranch === 'Unknown') {
      const targetElement = document.querySelector('.js-target-branch') ||
                           document.querySelector('.target-branch-name');
      if (targetElement) {
        targetBranch = targetElement.textContent.trim();
        console.log('Target branch from alternative selector:', targetBranch);
      }
    }
  }

  // Check if composer.lock is present in the diff
  const hasComposerLock = checkForComposerLock();

  return {
    isGitLab,
    isSelfHosted,
    isMergeRequest,
    sourceBranch,
    targetBranch,
    hasComposerLock,
    mrDataUrl
  };
}

/**
 * @param {function} callback
 * @param {number|null} [timeout=null]
 * @param {boolean} [keepObserving=false]
 * @returns {MutationObserver}
 */
function watch(callback, timeout = null, keepObserving = false) {
  // Créer l'observateur
  const observer = new MutationObserver((mutations, obs) => {
      try {
        callback();
        if (!keepObserving) {
          obs.disconnect();
        }
      } catch (error) {
        console.error('Error in callback:', error);
      }
  });

  // Configurer et démarrer l'observation
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  // Ajouter un timeout optionnel
  if (timeout) {
    setTimeout(() => {
      observer.disconnect();
    }, timeout);
  }

  return observer;
}

async function generateDiff() {
  if (!composerLockFound) {
    throw new Error('No composer.lock file found in this merge request.');
  }

  try {
    const { oldContent, newContent } = await extractComposerLockContent();

    const htmlDiff = await generateComposerDiff(oldContent, newContent);

    // Insert the diff into the page initially
    insertDiffIntoPage(htmlDiff);

    // Only add the scroll event listener once
    if (!window.composerDiffScrollListenerAdded) {
      window.composerDiffScrollListenerAdded = true;

      window.addEventListener('scroll', function() {
        // Use a debounce to avoid too many checks
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(function() {
          // Check if the diff is still in the DOM
          const existingDiff = document.querySelector('.composer-diff-container');
          if (!existingDiff && composerLockFound && diffGenerated) {
            console.log('Diff disappeared after scroll, re-inserting...');
            insertDiffIntoPage(htmlDiff);
          }
        }, 200);
      });
    }

    return true;
  } catch (error) {
    console.error('Error generating diff:', error);
    throw error;
  }
}

async function extractComposerLockContent() {
  console.log('Extracting composer.lock content...');

  // If we have the source and target branches and project path, try to fetch the complete files
  console.log('Attempting to fetch complete composer.lock files from source and target branches');

  try {
    // Construct the URLs for the raw files
    const sourceFileUrl = `/${projectPath}/-/raw/${sourceBranch}/composer.lock`;
    const targetFileUrl = `/${projectPath}/-/raw/${targetBranch}/composer.lock`;

    console.log('Fetching source file from:', sourceFileUrl);
    console.log('Fetching target file from:', targetFileUrl);

    // Fetch both files in parallel
    const [sourceResponse, targetResponse] = await Promise.all([
      fetch(sourceFileUrl),
      fetch(targetFileUrl)
    ]);

    // Check if both requests were successful
    if (sourceResponse.ok && targetResponse.ok) {
      const sourceContent = await sourceResponse.text();
      const targetContent = await targetResponse.text();

      console.log('Successfully fetched complete composer.lock files');

      return {
        oldContent: targetContent, // Target branch is the "old" content (base branch)
        newContent: sourceContent  // Source branch is the "new" content (feature branch)
      };
    } else {
      console.log('Failed to fetch complete files, falling back to diff extraction');
      if (!sourceResponse.ok) {
        console.error('Source file fetch failed with status:', sourceResponse.status);
      }
      if (!targetResponse.ok) {
        console.error('Target file fetch failed with status:', targetResponse.status);
      }
    }
  } catch (error) {
    console.error('Error fetching complete composer.lock files:', error);
  }

  return {
    oldContent: '{}', // Placeholder for old composer.lock content
    newContent: '{}' // Placeholder for new composer.lock content
  };
}

// Generate composer diff using the composer-diff CLI tool
async function generateComposerDiff(oldContent, newContent) {
  /**
   * @typedef {Object} Diff
   * @property {string} name
   * @property {'require'|'require-dev'|null} previousSection
   * @property {'require'|'require-dev'|null} newSection
   * @property {string|null} previousVersion
   * @property {string|null} newVersion
   */

  /**
   * @param {JSON} oldLock
   * @param {JSON} newLock
   *
   * @returns {Record<string, Diff>[]}
   */
  function getDiff(oldLock, newLock) {
    /**
     * @type {Record<string, Diff>}
     */
    const diffList = {};

    oldLock['packages'].forEach(oldPackage => {
      diffList[oldPackage.name] = {
        name: oldPackage.name,
        previousSection: 'require',
        newSection: null,
        previousVersion: oldPackage.version,
        newVersion: null,
      };
    });

    oldLock['packages-dev'].forEach(oldPackage => {
      diffList[oldPackage.name] = {
        name: oldPackage.name,
        previousSection: 'require-dev',
        newSection: null,
        previousVersion: oldPackage.version,
        newVersion: null,
      };
    });

    newLock['packages'].forEach(newPackage => {
      const diff = diffList[newPackage.name];
      if (diff) {
        diff.newVersion = newPackage.version;
        diff.newSection = 'require';
      } else {
        diffList[newPackage.name] = {
          name: newPackage.name,
          previousSection: null,
          newSection: 'require',
          previousVersion: null,
          newVersion: newPackage.version,
        };
      }
    });

    newLock['packages-dev'].forEach(newPackage => {
      const diff = diffList[newPackage.name];
      if (diff) {
        diff.newVersion = newPackage.version;
        diff.newSection = 'require-dev';
      } else {
        diffList[newPackage.name] = {
          name: newPackage.name,
          previousSection: null,
          newSection: 'require-dev',
          previousVersion: null,
          newVersion: newPackage.version,
        };
      }
    });

    /**
     * @type {Record<string, Diff>}
     */
    const updatedDiffList = {};

    /**
     * @type {Record<string, Diff>}
     */
    const removedDiffList = {};

    /**
     * @type {Record<string, Diff>}
     */
    const addedDiffList = {};

    for (const packageName in diffList) {
      const diff = diffList[packageName];
      if (diff.previousSection === null && diff.newSection !== null) {
        addedDiffList[diff.name] = diff;
      } else if (diff.previousSection !== null && diff.newSection === null) {
        removedDiffList[diff.name] = diff;
      } else if (diff.previousSection !== null && diff.newSection !== null && diff.previousVersion !== diff.newVersion) {
        updatedDiffList[diff.name] = diff;
      }
    }

    return [addedDiffList, updatedDiffList, removedDiffList];
  }

  /**
   *
   * @param {Record<string, Diff>} addedDiffList
   * @param {Record<string, Diff>} updatedDiffList
   * @param {Record<string, Diff>} removedDiffList
   *
   * @return string
   */
  function renderHtml(addedDiffList, updatedDiffList, removedDiffList)
  {
    let addedTable = '';
    let updatedTable = '';
    let removedTable = '';

    if (Object.keys(addedDiffList).length > 0) {
      addedTable = `
            <h2>Added packages</h2>
            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>Section</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(addedDiffList).map(packageName => {
                      const diff = addedDiffList[packageName];

                      return `
                        <tr>
                            <td>${diff.name}</td>
                            <td>${diff.newVersion}</td>
                            <td>${diff.newSection}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    if (Object.keys(updatedDiffList).length > 0) {
      updatedTable = `
            <h2>Updated packages</h2>
            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>Section</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(updatedDiffList).map(packageName => {
                      const diff = updatedDiffList[packageName];

                      const versionChanged = diff.previousVersion !== diff.newVersion;
                      const version = versionChanged ? `From ${diff.previousVersion} to ${diff.newVersion}` : diff.newVersion;

                      const sectionChanged = diff.previousSection !== diff.newSection;
                      const section = sectionChanged ? `From ${diff.previousSection} to ${diff.newSection}` : diff.newSection;

                      return `
                          <tr>
                              <td>${diff.name}</td>
                              <td>${version}</td>
                              <td>${section}</td>
                          </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    if (Object.keys(removedDiffList).length > 0) {
      removedTable = `
            <h2>Removed packages</h2>
            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>Section</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(removedDiffList).map(packageName => {
                      const diff = removedDiffList[packageName];

                      return `
                          <tr>
                              <td>${diff.name}</td>
                              <td>${diff.previousVersion}</td>
                              <td>${diff.previousSection}</td>
                          </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    return [addedTable, updatedTable, removedTable].join("\n");
  }

  const [addedDiffList, updatedDiffList, removedDiffList] = getDiff(JSON.parse(oldContent), JSON.parse(newContent));

  return renderHtml(addedDiffList, updatedDiffList, removedDiffList);
}

// Insert the generated diff into the GitLab page
function insertDiffIntoPage(htmlContent) {
  console.log('Inserting diff into page...');

  // Find the composer.lock file in the diff using various selectors
  const selectors = [
    '.file-title-name',                // Original selector
    '.file-header-content .file-title-name', // Another possible selector
    '.diff-file-header .file-title-name',    // Another possible selector
    '.diff-file .file-title',          // Another possible selector
    '.diff-file .file-header-content', // Another possible selector
    '.js-file-title',                  // Another possible selector
    '.file-header .file-title-name',   // Another possible selector
    '.file-title',                     // More generic selector
    '[data-path*="composer.lock"]',    // Data attribute selector
    '[title*="composer.lock"]',        // Title attribute selector
    '.diff-file-header',               // Generic diff file header
    '.diff-file'                       // Generic diff file
  ];

  let fileElements = [];
  let composerLockElement = null;

  // Try each selector
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}" found ${elements.length} elements for insertion`);

    if (elements.length > 0) {
      fileElements = Array.from(elements);

      // Log the text content of each element for debugging
      fileElements.forEach((el, index) => {
        console.log(`Element ${index} text content:`, el.textContent.trim());
        console.log(`Element ${index} has composer.lock:`, el.textContent.trim().includes('composer.lock'));

        // Also check data attributes
        if (el.dataset && el.dataset.path) {
          console.log(`Element ${index} data-path:`, el.dataset.path);
        }
        if (el.getAttribute('title')) {
          console.log(`Element ${index} title:`, el.getAttribute('title'));
        }
      });

      break;
    }
  }

  // Check each element for composer.lock
  for (const element of fileElements) {
    // Check text content, data-path, and title attributes
    if (element.textContent.trim().includes('composer.lock') ||
        (element.dataset && element.dataset.path && element.dataset.path.includes('composer.lock')) ||
        (element.getAttribute('title') && element.getAttribute('title').includes('composer.lock'))) {

      console.log('Found element with composer.lock reference:', element);

      // Try different parent selectors to find the diff file container
      const parentSelectors = [
        '.diff-file',
        '.file',
        '.diff-file-holder',
        '.js-file-holder',
        '.file-holder',
        '.diff-content',
        '.diff-wrap'
      ];

      for (const parentSelector of parentSelectors) {
        const parent = element.closest(parentSelector);
        if (parent) {
          composerLockElement = parent;
          console.log('Found composer.lock parent element for insertion:', parent);
          break;
        }
      }

      if (composerLockElement) break;
    }
  }

  // If we still couldn't find the composer.lock element, try a more aggressive approach
  if (!composerLockElement) {
    console.log('Could not find composer.lock element using standard selectors, trying alternative approach');

    // Try to find any element that contains "composer.lock" anywhere in its text
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.textContent && element.textContent.includes('composer.lock')) {
        console.log('Found element with composer.lock text:', element);

        // Try to find a suitable parent container
        const parent = element.closest('.diff-file') ||
                      element.closest('.file') ||
                      element.closest('.diff-file-holder') ||
                      element.closest('.js-file-holder') ||
                      element.closest('.file-holder') ||
                      element.closest('.diff-content') ||
                      element.closest('.diff-wrap');

        if (parent) {
          composerLockElement = parent;
          console.log('Found composer.lock parent element using alternative approach:', parent);
          break;
        }
      }
    }
  }

  // If we still couldn't find it, try to find the first diff file as a fallback
  if (!composerLockElement) {
    console.log('Still could not find composer.lock element, trying to use first diff file as fallback');

    const firstDiffFile = document.querySelector('.diff-file') ||
                         document.querySelector('.file') ||
                         document.querySelector('.diff-file-holder') ||
                         document.querySelector('.js-file-holder');

    if (firstDiffFile) {
      composerLockElement = firstDiffFile;
      console.log('Using first diff file as fallback:', firstDiffFile);
    }
  }

  if (!composerLockElement) {
    console.error('Could not find any suitable element in the page for insertion.');

    // As a last resort, try to insert at the top of the diffs container
    const diffsContainer = document.querySelector('.diffs') ||
                          document.querySelector('.diff-files-holder') ||
                          document.querySelector('#diffs') ||
                          document.querySelector('.content-wrapper');

    if (diffsContainer) {
      composerLockElement = diffsContainer;
      console.log('Using diffs container as last resort:', diffsContainer);
    } else {
      // If all else fails, just use the body
      composerLockElement = document.body;
      console.log('Using document body as final fallback');
    }
  }

  // Check if we already added our diff
  const existingDiff = composerLockElement.querySelector('.composer-diff-container');
  if (existingDiff) {
    existingDiff.remove();
  }

  // Create the container for our diff
  const diffContainer = document.createElement('div');
  diffContainer.className = 'composer-diff-container';
  diffContainer.style.padding = '15px';
  diffContainer.style.backgroundColor = '#f8f8f8';
  diffContainer.style.border = '1px solid #e1e1e1';
  diffContainer.style.borderRadius = '3px';
  diffContainer.style.margin = '15px';

  // Add a header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '10px';

  const title = document.createElement('h3');
  title.textContent = 'Composer Diff';
  title.style.margin = '0';

  header.appendChild(title);

  // Add the diff content
  const content = document.createElement('div');
  content.className = 'markdown-content';
  content.innerHTML = htmlContent;

  // Add everything to the container
  diffContainer.appendChild(header);
  diffContainer.appendChild(content);

  // Find the appropriate element to insert our diff into
  console.log('Looking for diff content element to insert into...');

  // Try different selectors for the diff content
  const contentSelectors = [
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

  let fileContent = null;

  // Only try to find a child element if composerLockElement is not the body
  if (composerLockElement !== document.body) {
    for (const selector of contentSelectors) {
      try {
        const element = composerLockElement.querySelector(selector);
        if (element) {
          console.log(`Found diff content element with selector "${selector}"`);
          fileContent = element;
          break;
        }
      } catch (error) {
        console.error(`Error finding element with selector "${selector}":`, error);
      }
    }
  }

  // If we still can't find a suitable element, try to insert at the beginning of the composer.lock element
  if (!fileContent) {
    console.log('Could not find specific diff content element, using composer.lock element itself');
    fileContent = composerLockElement;
  }

  // Insert the container at the beginning of the content
  console.log('Inserting diff container into page');
  try {
    fileContent.prepend(diffContainer);
    console.log('Successfully inserted diff container');
    diffGenerated = true;
  } catch (error) {
    console.error('Error inserting diff container:', error);

    // Try appendChild as a fallback if prepend fails
    try {
      console.log('Trying appendChild as fallback');
      fileContent.appendChild(diffContainer);
      console.log('Successfully inserted diff container using appendChild');
      diffGenerated = true;
    } catch (appendError) {
      console.error('Error inserting diff container using appendChild:', appendError);

      // If all else fails, try to insert into the body
      try {
        console.log('Trying to insert into document body as last resort');
        document.body.prepend(diffContainer);
        console.log('Successfully inserted diff container into document body');
        diffGenerated = true;
      } catch (bodyError) {
        console.error('Failed to insert diff container anywhere:', bodyError);
      }
    }
  }
}
