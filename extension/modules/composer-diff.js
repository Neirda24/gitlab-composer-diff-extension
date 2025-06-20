/**
 * Composer Diff module for the Composer Diff extension.
 * Provides functions for generating diffs between composer.lock files.
 */

import logger from './logger.js';

/**
 * @typedef {Object} ComposerPackage
 * @property {string} name - Package name
 * @property {string} version - Package version
 */

/**
 * @typedef {Object} Diff
 * @property {string} name - Package name
 * @property {'require'|'require-dev'|null} previousSection - Previous section (null if package was added)
 * @property {'require'|'require-dev'|null} newSection - New section (null if package was removed)
 * @property {string|null} previousVersion - Previous version (null if package was added)
 * @property {string|null} newVersion - New version (null if package was removed)
 */

/**
 * Parse composer.lock content
 * @param {string} content - The composer.lock content
 * @returns {Object} - The parsed composer.lock content
 */
function parseComposerLock(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error parsing composer.lock content', error);
    return { packages: [], 'packages-dev': [] };
  }
}

/**
 * Generate a diff between two composer.lock files
 * @param {string} oldContent - The old composer.lock content
 * @param {string} newContent - The new composer.lock content
 * @returns {Object} - Object containing added, updated, and removed packages
 */
function generateDiff(oldContent, newContent) {
  logger.info('Generating diff between composer.lock files');

  const oldLock = parseComposerLock(oldContent);
  const newLock = parseComposerLock(newContent);

  // Create a map of all packages in the old lock file
  /** @type {Record<string, Diff>} */
  const diffList = {};

  // Process packages from old lock file
  oldLock.packages = oldLock.packages || [];
  oldLock['packages-dev'] = oldLock['packages-dev'] || [];

  oldLock.packages.forEach(oldPackage => {
    diffList[oldPackage.name] = {
      name: oldPackage.name,
      previousSection: 'require',
      newSection: null,
      previousVersion: oldPackage.version,
      newVersion: null,
    };
  });

  oldLock['packages-dev'].forEach(oldPackage => {
    diffList[oldPackage.name] = {
      name: oldPackage.name,
      previousSection: 'require-dev',
      newSection: null,
      previousVersion: oldPackage.version,
      newVersion: null,
    };
  });

  // Process packages from new lock file
  newLock.packages = newLock.packages || [];
  newLock['packages-dev'] = newLock['packages-dev'] || [];

  newLock.packages.forEach(newPackage => {
    const diff = diffList[newPackage.name];
    if (diff) {
      diff.newVersion = newPackage.version;
      diff.newSection = 'require';
    } else {
      diffList[newPackage.name] = {
        name: newPackage.name,
        previousSection: null,
        newSection: 'require',
        previousVersion: null,
        newVersion: newPackage.version,
      };
    }
  });

  newLock['packages-dev'].forEach(newPackage => {
    const diff = diffList[newPackage.name];
    if (diff) {
      diff.newVersion = newPackage.version;
      diff.newSection = 'require-dev';
    } else {
      diffList[newPackage.name] = {
        name: newPackage.name,
        previousSection: null,
        newSection: 'require-dev',
        previousVersion: null,
        newVersion: newPackage.version,
      };
    }
  });

  // Categorize packages as added, updated, or removed
  /** @type {Record<string, Diff>} */
  const addedPackages = {};

  /** @type {Record<string, Diff>} */
  const updatedPackages = {};

  /** @type {Record<string, Diff>} */
  const removedPackages = {};

  for (const packageName in diffList) {
    const diff = diffList[packageName];

    if (diff.previousSection === null && diff.newSection !== null) {
      // Package was added
      addedPackages[diff.name] = diff;
    } else if (diff.previousSection !== null && diff.newSection === null) {
      // Package was removed
      removedPackages[diff.name] = diff;
    } else if (diff.previousSection !== null && diff.newSection !== null &&
              (diff.previousVersion !== diff.newVersion || diff.previousSection !== diff.newSection)) {
      // Package was updated (version or section changed)
      updatedPackages[diff.name] = diff;
    }
  }

  logger.debug('Diff generated', {
    added: Object.keys(addedPackages).length,
    updated: Object.keys(updatedPackages).length,
    removed: Object.keys(removedPackages).length
  });

  return {
    added: addedPackages,
    updated: updatedPackages,
    removed: removedPackages
  };
}

/**
 * Generate HTML for the added packages table
 * @param {Record<string, Diff>} addedPackages - The added packages
 * @returns {string} - The HTML for the added packages table
 */
function generateAddedPackagesHtml(addedPackages) {
  if (Object.keys(addedPackages).length === 0) {
    return '';
  }

  return `
    <h2>Added packages</h2>
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Version</th>
          <th>Section</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(addedPackages).map(packageName => {
          const diff = addedPackages[packageName];
          return `
            <tr class="package-added">
              <td>${diff.name}</td>
              <td>${diff.newVersion}</td>
              <td>${diff.newSection}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate HTML for the updated packages table
 * @param {Record<string, Diff>} updatedPackages - The updated packages
 * @returns {string} - The HTML for the updated packages table
 */
function generateUpdatedPackagesHtml(updatedPackages) {
  if (Object.keys(updatedPackages).length === 0) {
    return '';
  }

  return `
    <h2>Updated packages</h2>
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Version</th>
          <th>Section</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(updatedPackages).map(packageName => {
          const diff = updatedPackages[packageName];
          
          const versionChanged = diff.previousVersion !== diff.newVersion;
          const version = versionChanged 
            ? `<span class="version-from">${diff.previousVersion}</span> → <span class="version-to">${diff.newVersion}</span>` 
            : diff.newVersion;
          
          const sectionChanged = diff.previousSection !== diff.newSection;
          const section = sectionChanged 
            ? `<span class="section-from">${diff.previousSection}</span> → <span class="section-to">${diff.newSection}</span>` 
            : diff.newSection;
          
          return `
            <tr class="package-updated">
              <td>${diff.name}</td>
              <td>${version}</td>
              <td>${section}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate HTML for the removed packages table
 * @param {Record<string, Diff>} removedPackages - The removed packages
 * @returns {string} - The HTML for the removed packages table
 */
function generateRemovedPackagesHtml(removedPackages) {
  if (Object.keys(removedPackages).length === 0) {
    return '';
  }

  return `
    <h2>Removed packages</h2>
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Version</th>
          <th>Section</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(removedPackages).map(packageName => {
          const diff = removedPackages[packageName];
          return `
            <tr class="package-removed">
              <td>${diff.name}</td>
              <td>${diff.previousVersion}</td>
              <td>${diff.previousSection}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate HTML for the composer diff
 * @param {string} oldContent - The old composer.lock content
 * @param {string} newContent - The new composer.lock content
 * @returns {string} - The HTML for the composer diff
 */
function generateHtml(oldContent, newContent) {
  logger.info('Generating HTML for composer diff');

  const { added, updated, removed } = generateDiff(oldContent, newContent);

  const addedHtml = generateAddedPackagesHtml(added);
  const updatedHtml = generateUpdatedPackagesHtml(updated);
  const removedHtml = generateRemovedPackagesHtml(removed);

  // If there are no changes, show a message
  if (!addedHtml && !updatedHtml && !removedHtml) {
    return '<p>No changes found in composer.lock file.</p>';
  }

  return [addedHtml, updatedHtml, removedHtml].join('\n');
}

export default {
  parseComposerLock,
  generateDiff,
  generateHtml
};
