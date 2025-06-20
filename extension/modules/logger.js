/**
 * Logger module for the Composer Diff extension.
 * Provides centralized logging functionality with different log levels.
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * Get the name of a log level
 * @param {number} level - The log level
 * @returns {string} - The name of the log level
 */
function getLogLevelName(level) {
  for (const [name, value] of Object.entries(LOG_LEVELS)) {
    if (value === level) {
      return name;
    }
  }
  return 'UNKNOWN';
}

// Load the log level from storage when the module is loaded
try {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get('logLevel', function(data) {
      if (data.logLevel !== undefined) {
        currentLogLevel = data.logLevel;
        console.debug(`[Composer Diff] Log level loaded from storage: ${getLogLevelName(currentLogLevel)}`);
      }
    });
  }
} catch (error) {
  console.warn('[Composer Diff] Could not load log level from storage:', error);
}

/**
 * Set the current log level
 * @param {number} level - The log level to set
 */
function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;

    // Save the log level to storage if available
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ logLevel: level });
      }
    } catch (error) {
      console.warn('[Composer Diff] Could not save log level to storage:', error);
    }

    console.debug(`[Composer Diff] Log level set to: ${getLogLevelName(level)}`);
  } else {
    console.warn(`[Composer Diff] Invalid log level: ${level}`);
  }
}

/**
 * Log a debug message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
function debug(message, data) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.debug(`[Composer Diff] ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
function info(message, data) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.info(`[Composer Diff] ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
function warn(message, data) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(`[Composer Diff] ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
function error(message, data) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(`[Composer Diff] ${message}`, data !== undefined ? data : '');
  }
}

// Export the logger functions
export default {
  LOG_LEVELS,
  setLogLevel,
  getLogLevelName,
  debug,
  info,
  warn,
  error
};
