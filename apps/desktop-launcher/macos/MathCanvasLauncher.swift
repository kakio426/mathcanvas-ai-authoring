import AppKit
import Darwin
import Foundation

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  private var statusItem: NSStatusItem!
  private var statusMenuItem: NSMenuItem!
  private var openMenuItem: NSMenuItem!
  private var restartMenuItem: NSMenuItem!
  private var serverProcess: Process?
  private var stdoutPipe: Pipe?
  private var stderrPipe: Pipe?
  private var outputBuffer = ""
  private var workspaceURL: URL?
  private var isQuitting = false
  private var signalSources: [DispatchSourceSignal] = []

  func applicationDidFinishLaunching(_ notification: Notification) {
    configureSignalHandlers()
    configureStatusItem()
    startServer()
  }

  func applicationShouldHandleReopen(
    _ sender: NSApplication,
    hasVisibleWindows flag: Bool
  ) -> Bool {
    openWorkspace(nil)
    return true
  }

  func applicationWillTerminate(_ notification: Notification) {
    isQuitting = true
    stopServer(waitForExit: true)
  }

  private func configureSignalHandlers() {
    for signalValue in [SIGINT, SIGTERM] {
      Darwin.signal(signalValue, SIG_IGN)
      let source = DispatchSource.makeSignalSource(
        signal: signalValue,
        queue: .main
      )
      source.setEventHandler { NSApp.terminate(nil) }
      source.resume()
      signalSources.append(source)
    }
  }

  private func configureStatusItem() {
    statusItem = NSStatusBar.system.statusItem(
      withLength: NSStatusItem.variableLength
    )
    if let button = statusItem.button {
      button.title = " M "
      button.font = NSFont.systemFont(ofSize: 13, weight: .bold)
      button.toolTip = "MathCanvas 수업 준비"
    }

    let menu = NSMenu()
    statusMenuItem = NSMenuItem(
      title: "시작하는 중…",
      action: nil,
      keyEquivalent: ""
    )
    statusMenuItem.isEnabled = false
    menu.addItem(statusMenuItem)
    menu.addItem(.separator())

    openMenuItem = NSMenuItem(
      title: "수업 준비 화면 열기",
      action: #selector(openWorkspace(_:)),
      keyEquivalent: "o"
    )
    openMenuItem.target = self
    openMenuItem.isEnabled = false
    menu.addItem(openMenuItem)

    restartMenuItem = NSMenuItem(
      title: "서버 다시 시작",
      action: #selector(restartServer(_:)),
      keyEquivalent: "r"
    )
    restartMenuItem.target = self
    menu.addItem(restartMenuItem)
    menu.addItem(.separator())

    let quitItem = NSMenuItem(
      title: "MathCanvas 수업 준비 종료",
      action: #selector(quitApplication(_:)),
      keyEquivalent: "q"
    )
    quitItem.target = self
    menu.addItem(quitItem)
    statusItem.menu = menu
  }

  private func projectRoot() -> URL? {
    guard
      let pathFile = Bundle.main.url(
        forResource: "project-root",
        withExtension: "txt"
      ),
      let rawPath = try? String(contentsOf: pathFile, encoding: .utf8)
    else {
      return nil
    }
    let path = rawPath.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !path.isEmpty else { return nil }
    return URL(fileURLWithPath: path, isDirectory: true)
  }

  private func nodeExecutable() -> URL? {
    let home = FileManager.default.homeDirectoryForCurrentUser.path
    var candidates: [String] = []
    if let configured = ProcessInfo.processInfo.environment["MATHCANVAS_NODE_PATH"] {
      candidates.append(configured)
    }
    if let bundled = Bundle.main.url(
      forResource: "node",
      withExtension: nil,
      subdirectory: "runtime"
    ) {
      candidates.append(bundled.path)
    }
    candidates.append(contentsOf: [
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "\(home)/.volta/bin/node",
      "\(home)/.nvm/current/bin/node",
      "/usr/bin/node"
    ])
    return candidates
      .first(where: { FileManager.default.isExecutableFile(atPath: $0) })
      .map { URL(fileURLWithPath: $0) }
  }

  private func startServer() {
    if let process = serverProcess, process.isRunning {
      openWorkspace(nil)
      return
    }
    guard let root = projectRoot() else {
      showFailure(
        title: "앱 위치를 확인할 수 없어요",
        message: "MathCanvas 수업 준비 앱을 다시 만들어 주세요."
      )
      return
    }
    let entry = root
      .appendingPathComponent("apps")
      .appendingPathComponent("teacher-ui")
      .appendingPathComponent("dist")
      .appendingPathComponent("server")
      .appendingPathComponent("main.js")
    guard FileManager.default.fileExists(atPath: entry.path) else {
      showFailure(
        title: "수업 준비 파일이 아직 없어요",
        message: "설치 프로그램을 다시 실행해 주세요."
      )
      return
    }
    guard let node = nodeExecutable() else {
      showFailure(
        title: "실행 환경을 찾지 못했어요",
        message: "이 시험판에는 Node.js 20 이상이 필요합니다. 설치 후 앱을 다시 열어 주세요."
      )
      return
    }

    statusMenuItem.title = "서버를 시작하고 있어요…"
    openMenuItem.isEnabled = false
    workspaceURL = nil
    outputBuffer = ""

    let process = Process()
    let standardOutput = Pipe()
    let standardError = Pipe()
    process.executableURL = node
    process.arguments = [entry.path]
    process.currentDirectoryURL = root
    var environment = ProcessInfo.processInfo.environment
    environment["MATHCANVAS_UI_NO_OPEN"] = "1"
    let executableDirectory = node.deletingLastPathComponent().path
    let existingPath = environment["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin"
    environment["PATH"] = "\(executableDirectory):\(existingPath)"
    process.environment = environment
    process.standardOutput = standardOutput
    process.standardError = standardError

    standardOutput.fileHandleForReading.readabilityHandler = { [weak self] handle in
      let data = handle.availableData
      guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else {
        return
      }
      DispatchQueue.main.async { self?.consumeOutput(text) }
    }
    standardError.fileHandleForReading.readabilityHandler = { handle in
      let data = handle.availableData
      guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else {
        return
      }
      FileHandle.standardError.write(Data(text.utf8))
    }
    process.terminationHandler = { [weak self] completed in
      DispatchQueue.main.async {
        self?.serverDidTerminate(status: completed.terminationStatus)
      }
    }

    do {
      try process.run()
      serverProcess = process
      stdoutPipe = standardOutput
      stderrPipe = standardError
    } catch {
      showFailure(
        title: "수업 준비 화면을 시작하지 못했어요",
        message: "앱을 종료한 뒤 다시 열어 주세요."
      )
    }
  }

  private func consumeOutput(_ text: String) {
    outputBuffer.append(text)
    let lines = outputBuffer.components(separatedBy: .newlines)
    outputBuffer = lines.last ?? ""
    for line in lines.dropLast() {
      guard
        line.hasPrefix("MathCanvas 수업 준비 책상: "),
        let separator = line.firstIndex(of: ":")
      else {
        continue
      }
      let value = line[line.index(after: separator)...]
        .trimmingCharacters(in: .whitespaces)
      guard let launchURL = URL(string: value) else { continue }
      var components = URLComponents(
        url: launchURL,
        resolvingAgainstBaseURL: false
      )
      components?.query = nil
      components?.fragment = nil
      workspaceURL = components?.url
      statusMenuItem.title = "실행 중"
      openMenuItem.isEnabled = true
      if ProcessInfo.processInfo.environment["MATHCANVAS_LAUNCHER_NO_OPEN"] != "1" {
        NSWorkspace.shared.open(launchURL)
      }
    }
  }

  private func serverDidTerminate(status: Int32) {
    stdoutPipe?.fileHandleForReading.readabilityHandler = nil
    stderrPipe?.fileHandleForReading.readabilityHandler = nil
    serverProcess = nil
    stdoutPipe = nil
    stderrPipe = nil
    workspaceURL = nil
    openMenuItem.isEnabled = false
    if isQuitting { return }
    statusMenuItem.title = "멈춤 — 다시 시작해 주세요"
    if status != 0 {
      showFailure(
        title: "수업 준비 화면이 멈췄어요",
        message: "메뉴 막대의 M을 누르고 ‘서버 다시 시작’을 선택해 주세요."
      )
    }
  }

  private func stopServer(waitForExit: Bool) {
    guard let process = serverProcess, process.isRunning else { return }
    process.terminate()
    guard waitForExit else { return }
    let deadline = Date().addingTimeInterval(3)
    while process.isRunning && Date() < deadline {
      RunLoop.current.run(until: Date().addingTimeInterval(0.05))
    }
    if process.isRunning {
      Darwin.kill(process.processIdentifier, SIGKILL)
    }
  }

  private func showFailure(title: String, message: String) {
    statusMenuItem.title = "문제가 생겼어요"
    openMenuItem.isEnabled = false
    NSApp.activate(ignoringOtherApps: true)
    let alert = NSAlert()
    alert.alertStyle = .warning
    alert.messageText = title
    alert.informativeText = message
    alert.addButton(withTitle: "확인")
    alert.runModal()
  }

  @objc private func openWorkspace(_ sender: Any?) {
    if let url = workspaceURL {
      NSWorkspace.shared.open(url)
    } else {
      startServer()
    }
  }

  @objc private func restartServer(_ sender: Any?) {
    stopServer(waitForExit: true)
    startServer()
  }

  @objc private func quitApplication(_ sender: Any?) {
    NSApp.terminate(nil)
  }
}

@main
struct MathCanvasLauncher {
  static func main() {
    let application = NSApplication.shared
    let delegate = AppDelegate()
    application.delegate = delegate
    application.setActivationPolicy(.accessory)
    withExtendedLifetime(delegate) {
      application.run()
    }
  }
}
