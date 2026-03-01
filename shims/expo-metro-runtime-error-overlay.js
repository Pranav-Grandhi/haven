/**
 * Shim for @expo/metro-runtime/error-overlay (missing in @expo/metro-runtime@55.x).
 * Expo Router expects withErrorOverlay(Component); we pass through the component so the app loads.
 */
function withErrorOverlay(Component) {
  return Component;
}
module.exports = { withErrorOverlay };
