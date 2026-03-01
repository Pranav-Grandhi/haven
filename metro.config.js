const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve missing @expo/metro-runtime subpaths expected by expo-router (not present in 55.x)
const shimDir = path.join(__dirname, 'shims');
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime/error-overlay') {
    return {
      type: 'sourceFile',
      filePath: path.join(shimDir, 'expo-metro-runtime-error-overlay.js'),
    };
  }
  if (moduleName === '@expo/metro-runtime/src/error-overlay/ErrorOverlay') {
    return {
      type: 'sourceFile',
      filePath: path.join(shimDir, 'expo-metro-runtime-error-overlay-ErrorOverlay.js'),
    };
  }
  return originalResolve ? originalResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
