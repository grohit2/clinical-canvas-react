const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable require.context for Expo Router
config.transformer.unstable_allowRequireContext = true;

// Allow imports from monorepo root (shared src/* and packages/*)
config.watchFolders = [workspaceRoot];

// Use symlinks for pnpm
config.resolver.unstable_enableSymlinks = true;

// Resolve packages from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
