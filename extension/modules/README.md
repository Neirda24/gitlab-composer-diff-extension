# Composer Diff Extension Modules

This directory contains the modular components of the Composer Diff extension. The code has been refactored into separate modules for better organization, readability, and performance.

## Module Structure

- **logger.js**: Centralized logging functionality with different log levels
- **dom-utils.js**: DOM manipulation utilities for finding elements and handling DOM events
- **gitlab-api.js**: GitLab API client for interacting with the GitLab API
- **composer-diff.js**: Functions for generating diffs between composer.lock files
- **ui.js**: UI-related functionality for creating and manipulating UI elements
- **main.js**: Entry point for the extension, coordinates the other modules

## How It Works

1. The content.js file imports main.js, which is the entry point for the extension
2. main.js initializes the extension and coordinates the other modules
3. When a GitLab merge request page is loaded, the extension checks if it contains a composer.lock file
4. If a composer.lock file is found, the extension fetches the content from the source and target branches
5. The extension generates a diff between the two composer.lock files and inserts it into the page
6. The extension adds a scroll event listener to re-insert the diff if it disappears after scrolling

## Performance Optimizations

- **Modular Code**: Code is split into smaller, focused modules for better organization and maintainability
- **Efficient DOM Queries**: DOM queries are optimized to minimize performance impact
- **Debounced Event Listeners**: Event listeners use debouncing to avoid excessive function calls
- **Error Handling**: Comprehensive error handling to prevent crashes and provide useful debugging information
- **Logging Levels**: Configurable logging levels to control the amount of logging output

## Maintainability Improvements

- **JSDoc Comments**: Comprehensive JSDoc comments for better code documentation
- **Type Annotations**: TypeScript-like type annotations for better code understanding
- **Consistent Naming**: Consistent naming conventions for variables, functions, and modules
- **Separation of Concerns**: Each module has a specific responsibility
- **Clean Code**: Code is formatted consistently and follows best practices
