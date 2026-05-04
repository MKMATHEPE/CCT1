import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVER_PREFIX = "server/";

export function resolveRuntimePath(configuredPath: string) {
  const cwdPath = resolve(process.cwd(), configuredPath);

  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  if (configuredPath.startsWith(SERVER_PREFIX)) {
    const serverRootPath = resolve(
      process.cwd(),
      configuredPath.slice(SERVER_PREFIX.length)
    );

    if (existsSync(serverRootPath)) {
      return serverRootPath;
    }
  }

  if (!configuredPath.startsWith(SERVER_PREFIX)) {
    const repoRootPath = resolve(process.cwd(), SERVER_PREFIX, configuredPath);

    if (existsSync(repoRootPath)) {
      return repoRootPath;
    }
  }

  return cwdPath;
}
