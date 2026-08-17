import { spawn } from "node:child_process";

export async function runProcess(
  executable: string,
  args: string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${executable.toUpperCase()}_TIMEOUT`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 16_000) stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(stdout)
        : reject(
            new Error(
              `${executable.toUpperCase()}_EXIT_${code}: ${stderr.slice(-2000)}`,
            ),
          );
    });
  });
}
