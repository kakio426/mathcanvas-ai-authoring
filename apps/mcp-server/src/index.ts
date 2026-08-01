#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAuthoringRuntime } from "@mathcanvas/authoring-runtime";
import { createMcpServer } from "./server.js";

process.stderr.write(
  [
    "MathCanvas AI 로컬 MCP 서버가 시작되었습니다.",
    "확장 프로그램과 Computer Use를 사용하지 않습니다.",
    "로그인 뒤 생성과 검증은 사용자 화면을 점유하지 않습니다.",
    ""
  ].join("\n")
);

const runtime = createAuthoringRuntime();
const server = createMcpServer(runtime.service);
const transport = new StdioServerTransport();

const shutdown = async () => {
  await server.close();
  await runtime.dispose();
};
process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await server.connect(transport);
