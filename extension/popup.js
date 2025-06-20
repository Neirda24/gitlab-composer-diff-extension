document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const autoRunCheckbox = document.getElementById('autoRun');
  const refreshButton = document.getElementById('refreshButton');
  const copyMarkdownButton = document.getElementById('copyMarkdownButton');

  // Debug info elements
  const isGitLabElement = document.getElementById('isGitLab');
  const isSelfHostedElement = document.getElementById('isSelfHosted');
  const isMergeRequestElement = document.getElementById('isMergeRequest');
  const sourceBranchElement = document.getElementById('sourceBranch');
  const targetBranchElement = document.getElementById('targetBranch');
  const hasComposerLockElement = document.getElementById('hasComposerLock');

  // Load saved settings
  chrome.storage.sync.get(['autoRun'], function(result) {
    if (result.autoRun !== undefined) {
      autoRunCheckbox.checked = result.autoRun;
    }
  });

  // Save settings when changed
  autoRunCheckbox.addEventListener('change', function() {
    chrome.storage.sync.set({ autoRun: autoRunCheckbox.checked });
  });

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

  // Refresh button click handler
  refreshButton.addEventListener('click', function() {
    statusElement.textContent = 'Refreshing...';

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshDiff' }, function(response) {
        if (chrome.runtime.lastError) {
          statusElement.textContent = 'Error communicating with the page. Please refresh and try again.';
          return;
        }

        if (response && response.success) {
          statusElement.textContent = 'Diff refreshed successfully!';
        } else {
          statusElement.textContent = 'Failed to refresh diff. ' + (response ? response.message : '');
        }
      });
    });
  });

  // Copy as Markdown button click handler
  copyMarkdownButton.addEventListener('click', function() {
    statusElement.textContent = 'Getting markdown diff...';

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getMarkdownDiff' }, function(response) {
        if (chrome.runtime.lastError) {
          statusElement.textContent = 'Error communicating with the page. Please refresh and try again.';
          return;
        }

        if (response && response.markdown) {
          // Copy the markdown to the clipboard
          navigator.clipboard.writeText(response.markdown)
            .then(() => {
              statusElement.textContent = 'Markdown copied to clipboard!';
              setTimeout(() => {
                statusElement.textContent = 'Found composer.lock in the merge request!';
              }, 2000);
            })
            .catch(err => {
              console.error('Failed to copy text: ', err);
              statusElement.textContent = 'Failed to copy to clipboard: ' + err.message;
            });
        } else {
          statusElement.textContent = 'Failed to get markdown diff. ' + (response ? response.message : '');
        }
      });
    });
  });


  console.log(chrome);
  // Update status and debug info when popup opens
  updateStatus();
  updateDebugInfo();
});
