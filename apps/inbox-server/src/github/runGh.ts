/**
 * Runs the `gh` CLI with the given arguments and returns its standard output.
 *
 * @param args - The arguments after `gh`.
 * @returns The standard output of the command.
 */
const runGh = async (args: string[]) => {
  const child = Bun.spawn(['gh', ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim());
  }

  return stdout;
};

export default runGh;
