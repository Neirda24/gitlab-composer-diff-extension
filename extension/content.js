/**
 * Content script for the Composer Diff extension.
 * This is the entry point for the extension.
 * It imports and uses the modules from the modules directory.
 */

// Use dynamic import to load the main module
(async () => {
  try {
    console.log('[Composer Diff] Loading main module...');
    const src = chrome.runtime.getURL('modules/main.js');
    console.log('[Composer Diff] Main module URL:', src);
    const mainModule = await import(src);
    console.log('[Composer Diff] Main module loaded successfully');
    // Call the initialize function from the main module
    console.log('[Composer Diff] Calling initialize function...');
    mainModule.default.initialize();
    console.log('[Composer Diff] Initialize function called successfully');
  } catch (error) {
    console.error('[Composer Diff] Error loading main module:', error);
  }
})();

// This file is intentionally minimal.
// All functionality is in the modules directory.
