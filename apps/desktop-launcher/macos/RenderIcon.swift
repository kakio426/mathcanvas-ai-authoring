import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write(Data("usage: RenderIcon.swift OUTPUT\n".utf8))
  exit(2)
}

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()

let background = NSBezierPath(
  roundedRect: NSRect(x: 64, y: 64, width: 896, height: 896),
  xRadius: 210,
  yRadius: 210
)
NSColor(calibratedRed: 35 / 255, green: 140 / 255, blue: 245 / 255, alpha: 1).setFill()
background.fill()

let shadow = NSShadow()
shadow.shadowColor = NSColor(calibratedWhite: 0, alpha: 0.16)
shadow.shadowBlurRadius = 12
shadow.shadowOffset = NSSize(width: 0, height: -8)
shadow.set()

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 520, weight: .heavy),
  .foregroundColor: NSColor.white,
  .paragraphStyle: paragraph
]
NSString(string: "M").draw(
  in: NSRect(x: 112, y: 230, width: 800, height: 610),
  withAttributes: attributes
)

let colors = [
  NSColor(calibratedRed: 1, green: 108 / 255, blue: 118 / 255, alpha: 1),
  NSColor(calibratedRed: 40 / 255, green: 169 / 255, blue: 244 / 255, alpha: 1),
  NSColor(calibratedRed: 130 / 255, green: 217 / 255, blue: 44 / 255, alpha: 1),
  NSColor(calibratedRed: 165 / 255, green: 109 / 255, blue: 244 / 255, alpha: 1)
]
for (index, color) in colors.enumerated() {
  color.setFill()
  NSBezierPath(
    roundedRect: NSRect(x: 234 + index * 145, y: 168, width: 120, height: 34),
    xRadius: 17,
    yRadius: 17
  ).fill()
}

image.unlockFocus()
guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let png = bitmap.representation(using: .png, properties: [:])
else {
  exit(1)
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
