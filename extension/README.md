# Composer Diff for GitLab

A browser extension that enhances GitLab merge requests by providing a more readable diff of composer.lock files.

## Features

- Automatically detects composer.lock files in GitLab merge requests
- Displays a human-readable diff of package changes
- Provides a "Copy as Markdown" button for easy sharing
- Works with both Chrome and Firefox browsers

## Installation

### Building the Extension

1. Download or clone this repository
2. Run the build script to package the extension:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```
   The script will automatically convert the SVG icon to PNG in the required sizes.
3. The packaged extension will be available at `build/composer-diff-for-gitlab.zip`

### Chrome

1. Download or clone this repository
2. Run the build script to generate the PNG icons:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top-right corner
5. Click "Load unpacked" and select the extension directory
6. The extension should now be installed and visible in your toolbar

### Firefox

1. Download or clone this repository
2. Run the build script to generate the PNG icons:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```
3. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on..."
5. Select any file in the extension directory (e.g., manifest.json)
6. The extension should now be installed and visible in your toolbar

## Usage

1. Navigate to a GitLab merge request (on gitlab.com or a self-hosted GitLab instance) that includes changes to a composer.lock file
2. The extension will automatically detect the composer.lock file and display a readable diff
3. Use the "Copy as Markdown" button to copy the diff in Markdown format for sharing

### Self-Hosted GitLab Instances

This extension works with both gitlab.com and self-hosted GitLab instances. No additional configuration is needed for self-hosted instances, as the extension automatically detects GitLab merge requests based on the URL structure.

## How It Works

This extension uses the composer-diff CLI tool to generate readable diffs of composer.lock files. It requires:

- [composer-diff](https://github.com/IonBazan/composer-diff) - A CLI tool for generating readable composer.lock diffs

To use this extension, you need to install composer-diff globally:

```bash
composer global require ion-bazan/composer-diff
```

The extension executes the following command to generate the diff:

```bash
composer diff --base <old_composer.lock> --target <new_composer.lock> --format mdtable --with-links
```

The extension injects the diff into the GitLab merge request page, making it easier to review package changes.

## Development

### Prerequisites

- Node.js and npm (for development tools)
- Web browser (Chrome or Firefox)
- Composer (for installing composer-diff globally)
- composer-diff installed globally (`composer global require ion-bazan/composer-diff`)

### Setup

1. Clone the repository
2. Install dependencies (if any)
3. Make your changes
4. Load the extension in your browser as described in the Installation section

### Project Structure

- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` - Extension popup UI
- `content.js` - Script injected into GitLab pages
- `background.js` - Background script for extension
- `styles.css` - Styles for injected UI elements
- `icons/` - Extension icons
- `build.sh` - Script to package the extension

### Testing

To test the extension:

1. Install the extension in your browser as described in the Installation section
2. Navigate to a GitLab merge request that includes changes to a composer.lock file
   - For gitlab.com, you can find public merge requests by searching for "composer.lock" in the search bar
   - For self-hosted GitLab instances, you'll need access to a merge request with composer.lock changes
3. The extension should automatically detect the composer.lock file and display a readable diff
4. Click the extension icon in the toolbar to see the status and options
5. Use the "Refresh Diff" button if the diff doesn't appear automatically

#### Testing with Self-Hosted GitLab Instances

To test with a self-hosted GitLab instance:

1. Make sure you have access to a self-hosted GitLab instance
2. Navigate to a merge request on your self-hosted instance that includes changes to a composer.lock file
3. The extension should work the same way as it does on gitlab.com

## TODO

- [x] Update to use composer-diff CLI tool instead of PHP-WASM
- [x] Add support for self-hosted GitLab instances
- [ ] Improve error handling and user feedback
- [ ] Add settings for customizing the diff output
- [x] Create proper icons for the extension

## Icon Design

The extension icon is a combination of:

1. A simplified fox (representing Firefox, one of the supported browsers)
2. A pull request icon (representing the merge requests where the extension operates)
3. An orange background (for visibility and to match the Firefox color scheme)

This combination visually represents the extension's purpose: to enhance the experience of reviewing composer.lock files in GitLab merge requests.

A single SVG version of the icon is provided in the `icons/` directory (`icon.svg`). The build script automatically converts this SVG to PNG in the required sizes (16x16, 48x48, 128x128).

## Credits

This extension is inspired by [lyrixx/composer-diff](https://lyrixx.github.io/composer-diff/) and uses:

- [IonBazan/composer-diff](https://github.com/IonBazan/composer-diff) - CLI tool for generating readable composer.lock diffs

## License

[MIT License](LICENSE)
