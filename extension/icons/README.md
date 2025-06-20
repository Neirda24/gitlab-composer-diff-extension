# Extension Icons

This directory contains SVG versions of the extension icons and should contain the following PNG files:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## SVG Icon

The following SVG file is provided:

- `icon.svg` - Master SVG file at 512x512 pixels

## Converting SVG to PNG

The build script (`build.sh`) automatically converts the SVG icon to PNG in the required sizes. You don't need to manually convert the SVG to PNG.

## Icon Design

The icon is a combination of:

1. A simplified fox (representing Firefox, one of the supported browsers)
2. A pull request icon (representing the merge requests where the extension operates)
3. An orange background (for visibility and to match the Firefox color scheme)

This combination visually represents the extension's purpose: to enhance the experience of reviewing composer.lock files in GitLab merge requests.

## Icon Design Guidelines

When designing icons, consider the following guidelines:

- Use a simple, recognizable design that works well at small sizes
- Ensure the icon is recognizable even at 16x16 pixels
- Use a consistent style across all icon sizes
- For Chrome, use PNG format with transparency
- For Firefox, PNG is also recommended
