// Background script for Composer Diff extension

// Handle installation and updates
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default settings on installation
    console.log('Extension installed');
  } else if (details.reason === 'update') {
    // Handle updates if needed
    console.log('Extension updated from version ' + details.previousVersion);
  }
});

// Initialize the extension
function initialize() {
}

// Run initialization
initialize();
