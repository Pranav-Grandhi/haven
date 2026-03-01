/**
 * Shim for @expo/metro-runtime/src/error-overlay/ErrorOverlay (missing in @expo/metro-runtime@55.x).
 * Re-export LogBoxInspectorContainer from @expo/log-box for the _error.js entry.
 */
const { LogBoxInspectorContainer } = require('@expo/log-box/src/overlay/Overlay');
module.exports = { LogBoxInspectorContainer };
