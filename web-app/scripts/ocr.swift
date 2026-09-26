import Foundation
import Vision
import ImageIO

let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
let files = try FileManager.default.contentsOfDirectory(atPath: input).filter { $0.hasSuffix(".jpg") }.sorted()
for file in files {
    let destination = URL(fileURLWithPath: output).appendingPathComponent(file.replacingOccurrences(of: ".jpg", with: ".json"))
    if FileManager.default.fileExists(atPath: destination.path) { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: input).appendingPathComponent(file))
    try handler.perform([request])
    let rows: [[String: Any]] = (request.results ?? []).compactMap { observation in
        guard let text = observation.topCandidates(1).first else { return nil }
        let b = observation.boundingBox
        return ["text": text.string, "confidence": text.confidence, "box": [b.minX, 1-b.maxY, b.maxX, 1-b.minY]]
    }
    try JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys]).write(to: destination)
    print(file + ": " + String(rows.count) + " text regions")
}
