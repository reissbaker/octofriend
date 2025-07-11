import { t } from "structural";
import * as fs from "fs/promises";
import { ContextSpace } from "../context-space.ts";
import { SequenceIdTagged } from "../history.ts";

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export async function attempt<T>(errMessage: string, callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch {
    throw new ToolError(errMessage);
  }
}

export async function attemptUntrackedStat(path: string) {
  return attempt(`Could not stat(${path}): does the file exist?`, async () => {
    return await fs.stat(path);
  });
}

export async function attemptUntrackedRead(path: string) {
  return await attempt(`${path} couldn't be read`, async () => {
    return fs.readFile(path, "utf8");
  });
}

export type ToolDef<T> = {
  ArgumentsSchema: t.Type<any>,
  Schema: t.Type<T>,
  validate: (t: T) => Promise<null>,
  run: (t: SequenceIdTagged<{ tool: T }>, c: ContextSpace) => Promise<string>,
};
