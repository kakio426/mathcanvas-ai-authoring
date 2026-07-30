import type {
  ValidationIssue
} from "@mathcanvas/contracts";

export type Bounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function intersects(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function issue(
  issues: ValidationIssue[],
  code: string,
  area: ValidationIssue["area"],
  message: string,
  path?: string
): void {
  issues.push({
    code,
    severity: "error",
    area,
    message,
    ...(path === undefined ? {} : { path })
  });
}
