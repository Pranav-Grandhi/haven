import ExpoModulesCore
import Vision
import UIKit

public class CoremlDetectionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CoremlDetection")

    AsyncFunction("detectFromImageAsync") { (uri: String) -> [[String: Any]] in
      return await self.runDetection(imageUri: uri)
    }
  }

  private func runDetection(imageUri: String) async -> [[String: Any]] {
    guard let url = URL(string: imageUri),
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage else {
      return []
    }

    return await withCheckedContinuation { continuation in
      let request = VNClassifyImageRequest { request, error in
        if error != nil {
          continuation.resume(returning: [])
          return
        }
        guard let results = request.results as? [VNClassificationObservation] else {
          continuation.resume(returning: [])
          return
        }
        let detections = results.prefix(15).enumerated().map { index, obs -> [String: Any] in
          [
            "id": index + 1,
            "label": obs.identifier,
            "confidence": Double(obs.confidence),
            "x1": 0.0,
            "y1": 0.0,
            "x2": 1.0,
            "y2": 1.0
          ]
        }
        continuation.resume(returning: detections)
      }
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try? handler.perform([request])
    }
  }
}
