import { readEnvironmentFromLoginShell, ShellEnvironmentReader } from "@t3tools/shared/shell";

/**
 * Environment variables to sync from the user's login shell.
 * Electron apps launched from Dock/Finder don't inherit shell env vars,
 * so we explicitly read them via a login shell invocation.
 */
const SHELL_ENV_VARS_TO_SYNC = [
  "PATH",
  "SSH_AUTH_SOCK",
  // Anthropic / Claude Code proxy support
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
] as const;

export function syncShellEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  options: {
    platform?: NodeJS.Platform;
    readEnvironment?: ShellEnvironmentReader;
  } = {},
): void {
  if ((options.platform ?? process.platform) !== "darwin") return;

  try {
    const shell = env.SHELL ?? "/bin/zsh";
    const shellEnvironment = (options.readEnvironment ?? readEnvironmentFromLoginShell)(shell, [
      ...SHELL_ENV_VARS_TO_SYNC,
    ]);

    // Always overwrite PATH from login shell (macOS Dock doesn't get full PATH).
    if (shellEnvironment.PATH) {
      env.PATH = shellEnvironment.PATH;
    }

    // Only set SSH_AUTH_SOCK if not already present.
    if (!env.SSH_AUTH_SOCK && shellEnvironment.SSH_AUTH_SOCK) {
      env.SSH_AUTH_SOCK = shellEnvironment.SSH_AUTH_SOCK;
    }

    // Sync all Anthropic env vars (overwrite with shell values if present).
    for (const key of SHELL_ENV_VARS_TO_SYNC) {
      if (key === "PATH" || key === "SSH_AUTH_SOCK") continue;
      if (shellEnvironment[key]) {
        env[key] = shellEnvironment[key];
      }
    }
  } catch {
    // Keep inherited environment if shell lookup fails.
  }
}
