document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const logLevelSelect = document.getElementById('logLevel');
  const logLevelFeedback = document.getElementById('logLevelFeedback');

  // Debug info elements
  const isGitLabElement = document.getElementById('isGitLab');
  const isSelfHostedElement = document.getElementById('isSelfHosted');
  const isMergeRequestElement = document.getElementById('isMergeRequest');
  const sourceBranchElement = document.getElementById('sourceBranch');
  const targetBranchElement = document.getElementById('targetBranch');
  const hasComposerLockElement = document.getElementById('hasComposerLock');

  // Log level names for display
  const LOG_LEVEL_NAMES = {
    '0': 'DEBUG',
    '1': 'INFO',
    '2': 'WARN',
    '3': 'ERROR'
  };

  // Load saved log level
  chrome.storage.sync.get('logLevel', function(data) {
    if (data.logLevel !== undefined) {
      const logLevel = data.logLevel;
      logLevelSelect.value = logLevel;

      // Show current log level briefly
      const logLevelName = LOG_LEVEL_NAMES[logLevel];
      logLevelFeedback.textContent = `Current log level: ${logLevelName}`;

      // Clear feedback after 3 seconds
      setTimeout(() => {
        logLevelFeedback.textContent = '';
      }, 3000);
    }
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

          hasComposerLockElement.textContent = response.composerLockFound ? 'Yes' : 'No';
          hasComposerLockElement.className = response.composerLockFound ? 'true' : 'false';
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

  // Handle log level changes
  logLevelSelect.addEventListener('change', function() {
    const logLevel = parseInt(logLevelSelect.value);
    const logLevelName = LOG_LEVEL_NAMES[logLevel];

    // Save the log level to storage
    chrome.storage.sync.set({ logLevel: logLevel });

    // Update feedback
    logLevelFeedback.textContent = `Log level set to ${logLevelName}`;

    // Clear feedback after 3 seconds
    setTimeout(() => {
      logLevelFeedback.textContent = '';
    }, 3000);

    // Send the new log level to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setLogLevel',
        logLevel: logLevel
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error setting log level:', chrome.runtime.lastError);
          logLevelFeedback.textContent = 'Error setting log level';
          logLevelFeedback.style.color = '#F44336';
        } else if (response && response.success) {
          console.log('Log level set successfully');
        }
      });
    });
  });

  updateStatus();
  updateDebugInfo();
});
