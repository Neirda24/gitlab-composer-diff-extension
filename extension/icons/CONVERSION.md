# SVG to PNG Conversion

The extension requires PNG files for the icons, but you don't need to manually convert the SVG to PNG. The build script (`build.sh`) automatically handles this conversion.

## Automatic Conversion

When you run the build script, it:

1. Checks if the SVG icon file (`icon.svg`) exists
2. Checks if ImageMagick is installed
3. Converts the SVG icon to PNG in the required sizes (16x16, 48x48, 128x128)

The conversion is done using ImageMagick with the following commands:

```bash
convert -background none -resize 16x16 icons/icon.svg icons/icon16.png
convert -background none -resize 48x48 icons/icon.svg icons/icon48.png
convert -background none -resize 128x128 icons/icon.svg icons/icon128.png
```

## Manual Conversion (if needed)

If you need to manually convert the SVG to PNG for any reason, you can:

1. Install ImageMagick
   - For macOS: `brew install imagemagick`
   - For Ubuntu/Debian: `sudo apt-get install imagemagick`
2. Run the conversion commands above
3. Or use a graphics editor like Adobe Illustrator, Inkscape, or GIMP to export the SVG as PNG

## Required Files

The extension requires the following PNG files:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

Make sure all files are in the `icons` directory.

## Icon Description

The icon is a combination of:

1. A simplified fox (representing Firefox, one of the supported browsers)
2. A pull request icon (representing the merge requests where the extension operates)
3. An orange background (for visibility and to match the Firefox color scheme)

This combination visually represents the extension's purpose: to enhance the experience of reviewing composer.lock files in GitLab merge requests.
