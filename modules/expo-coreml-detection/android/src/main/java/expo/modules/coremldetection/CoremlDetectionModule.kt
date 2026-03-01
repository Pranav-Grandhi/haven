package expo.modules.coremldetection

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CoremlDetectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CoremlDetection")
    AsyncFunction("detectFromImageAsync") { _: String ->
      emptyList<Map<String, Any?>>()
    }
  }
}
