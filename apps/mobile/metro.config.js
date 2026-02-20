const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const patientDocumentsRoot = path.resolve(workspaceRoot, 'src/domains/patient-documents');
const appNodeModules = path.resolve(projectRoot, 'node_modules');
const resolvePkgRoot = (pkgName) =>
  fs.realpathSync(
    path.dirname(
      require.resolve(`${pkgName}/package.json`, {
        paths: [projectRoot, workspaceRoot],
      }),
    ),
  );
const resolveFromApp = (specifier) =>
  require.resolve(specifier, {
    paths: [projectRoot],
  });

const config = getDefaultConfig(projectRoot);

// Enable require.context for Expo Router
config.transformer.unstable_allowRequireContext = true;

// Allow imports from monorepo root (shared src/* and packages/*)
config.watchFolders = [workspaceRoot, patientDocumentsRoot];

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
  '@patient-documents': patientDocumentsRoot,
  react: resolvePkgRoot('react'),
  'react/jsx-runtime': fs.realpathSync(path.resolve(resolvePkgRoot('react'), 'jsx-runtime.js')),
  'react/jsx-dev-runtime': fs.realpathSync(path.resolve(resolvePkgRoot('react'), 'jsx-dev-runtime.js')),
  'react-native': resolvePkgRoot('react-native'),
  '@tanstack/react-query': resolvePkgRoot('@tanstack/react-query'),
  '@tanstack/query-core': resolvePkgRoot('@tanstack/query-core'),
};

// Keep hierarchical lookup enabled for Expo dependencies that rely on nested resolution.
config.resolver.disableHierarchicalLookup = false;

// Force all `react-native` imports (and subpaths) to resolve from the mobile app's copy.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(context, resolveFromApp(moduleName), platform);
  }

  if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
    return context.resolveRequest(context, path.join(appNodeModules, moduleName), platform);
  }

  if (
    moduleName === '@tanstack/react-query' ||
    moduleName.startsWith('@tanstack/react-query/') ||
    moduleName === '@tanstack/query-core' ||
    moduleName.startsWith('@tanstack/query-core/')
  ) {
    return context.resolveRequest(context, resolveFromApp(moduleName), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Expo SQLite web worker imports a wasm asset; ensure Metro treats it as an asset.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
