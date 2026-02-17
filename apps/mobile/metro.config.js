const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable require.context for Expo Router
config.transformer.unstable_allowRequireContext = true;

// Allow imports from monorepo root (shared src/* and packages/*)
config.watchFolders = [workspaceRoot];

// Use symlinks for pnpm
config.resolver.unstable_enableSymlinks = true;

// Resolve packages from both local and root node_modules.
// Keep React pinned via extraNodeModules below to avoid duplicate React instances.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Prevent duplicate React instances across workspace imports (invalid hook call).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: fs.realpathSync(path.resolve(projectRoot, 'node_modules/react')),
  'react/jsx-runtime': fs.realpathSync(path.resolve(projectRoot, 'node_modules/react/jsx-runtime.js')),
  'react/jsx-dev-runtime': fs.realpathSync(path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime.js')),
  'react-native': fs.realpathSync(path.resolve(projectRoot, 'node_modules/react-native')),
};

// Keep hierarchical lookup enabled so Expo Router transitive deps resolve correctly.
// React/React Native are still pinned above to avoid duplicate React instances.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
