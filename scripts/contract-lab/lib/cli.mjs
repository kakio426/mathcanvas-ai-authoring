export function parseArguments(argv, definitions) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith("--")) {
      throw new Error(`알 수 없는 인자입니다: ${String(argument)}`);
    }
    const name = argument.slice(2);
    const definition = definitions[name];
    if (!definition) throw new Error(`알 수 없는 옵션입니다: --${name}`);
    if (definition.type === "boolean") {
      parsed[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`--${name} 값이 필요합니다.`);
    }
    parsed[name] = value;
    index += 1;
  }
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition.required && parsed[name] === undefined) {
      throw new Error(`--${name} 옵션이 필요합니다.`);
    }
    if (
      parsed[name] === undefined &&
      Object.prototype.hasOwnProperty.call(definition, "default")
    ) {
      parsed[name] = definition.default;
    }
  }
  return parsed;
}

export function failCli(error) {
  const message =
    error instanceof Error ? error.message : String(error);
  process.stderr.write(`ERROR ${message}\n`);
  process.exitCode = 1;
}
