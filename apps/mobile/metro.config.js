const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

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
  appNodeModules,
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

// Keep hierarchical lookup enabled for Expo dependencies that rely on nested resolution.
config.resolver.disableHierarchicalLookup = false;

// Force all `react-native` imports (and subpaths) to resolve from the mobile app's copy.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
    return context.resolveRequest(context, path.join(appNodeModules, moduleName), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Expo SQLite web worker imports a wasm asset; ensure Metro treats it as an asset.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
