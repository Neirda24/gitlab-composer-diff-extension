document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');

  // Debug info elements
  const isGitLabElement = document.getElementById('isGitLab');
  const isSelfHostedElement = document.getElementById('isSelfHosted');
  const isMergeRequestElement = document.getElementById('isMergeRequest');
  const sourceBranchElement = document.getElementById('sourceBranch');
  const targetBranchElement = document.getElementById('targetBranch');
  const hasComposerLockElement = document.getElementById('hasComposerLock');

  // Update debug information
  function updateDebugInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      const activeTab = tabs[0];

      // Send a message to the content script to get debug information
      chrome.tabs.sendMessage(activeTab.id, { action: 'getDebugInfo' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error getting debug info:', chrome.runtime.lastError);
          return;
        }

        if (response) {
          // Update the debug information in the popup
          isGitLabElement.textContent = response.isGitLab ? 'Yes' : 'No';
          isGitLabElement.className = response.isGitLab ? 'true' : 'false';

          isSelfHostedElement.textContent = response.isSelfHosted ? 'Yes' : 'No';
          isSelfHostedElement.className = response.isSelfHosted ? 'true' : 'false';

          isMergeRequestElement.textContent = response.isMergeRequest ? 'Yes' : 'No';
          isMergeRequestElement.className = response.isMergeRequest ? 'true' : 'false';

          sourceBranchElement.textContent = response.sourceBranch;
          targetBranchElement.textContent = response.targetBranch;

          hasComposerLockElement.textContent = response.hasComposerLock ? 'Yes' : 'No';
          hasComposerLockElement.className = response.hasComposerLock ? 'true' : 'false';
        }
      });
    });
  }

  // Query the active tab to get information about the current page
  function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      const activeTab = tabs[0];

      // Check if we're on a GitLab page by looking for merge_requests in the URL
      // This works for both gitlab.com and self-hosted instances
      if (!activeTab.url.includes('/merge_requests/')) {
        statusElement.textContent = 'Not on a GitLab merge request. Navigate to a GitLab merge request to use this extension.';
        return;
      }

      // Send a message to the content script to check for composer.lock files
      chrome.tabs.sendMessage(activeTab.id, { action: 'checkComposerLock' }, function(response) {
        if (chrome.runtime.lastError) {
          statusElement.textContent = 'Error communicating with the page. Please refresh and try again.';
          return;
        }

        if (response && response.found) {
          statusElement.textContent = 'Found composer.lock in the merge request!';
        } else {
          statusElement.textContent = 'No composer.lock file found in this merge request.';
        }
      });
    });
  }

  updateStatus();
  updateDebugInfo();
});
