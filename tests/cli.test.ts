import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-cli');
const cliEntry = join('E:', 'hytrax-harness', 'dist', 'index.js');

function run(args: string, cwd: string = testDir): string {
  return execSync(`node "${cliEntry}" ${args}`, {
    cwd,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

describe('CLI integration', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should show help with no arguments', () => {
    let output = '';
    try {
      output = execSync(`node "${cliEntry}"`, {
        cwd: testDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (e: any) {
      // Commander outputs help to stderr with exit code 1
      output = e.stderr?.toString() || e.stdout?.toString() || '';
    }
    expect(output).toContain('hytrax');
    expect(output).toContain('init');
    expect(output).toContain('plan');
    expect(output).toContain('search');
    expect(output).toContain('record');
    expect(output).toContain('query');
    expect(output).toContain('validate');
    expect(output).toContain('stats');
    expect(output).toContain('knowledge');
  });

  it('should show version with --version', () => {
    const output = execSync(`node "${cliEntry}" --version`, {
      cwd: testDir,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should init a project', () => {
    const output = run('init');
    expect(output).toContain('Initialized Hytrax');
    expect(output).toContain('.hytrax/knowledge/architecture/');
    expect(output).toContain('.hytrax/knowledge/constraints/');
    expect(output).toContain('.hytrax/knowledge/patterns/');
    expect(output).toContain('.hytrax/knowledge/workflows/');
    expect(output).toContain('.hytrax/config.toml');
    expect(existsSync(join(testDir, '.hytrax'))).toBe(true);
    expect(existsSync(join(testDir, '.hytrax', 'config.toml'))).toBe(true);
  });

  it('should add Hytrax instructions without replacing AGENTS.md', () => {
    writeFileSync(join(testDir, 'AGENTS.md'), '# Existing instructions\n');
    const output = run('init --agent-instructions');
    const instructions = readFileSync(join(testDir, 'AGENTS.md'), 'utf8');
    expect(output).toContain('AGENTS.md: updated');
    expect(instructions).toContain('Existing instructions');
    expect(instructions).toContain('npx hytrax plan');
  });

  it('should validate a clean project', () => {
    const output = run('validate');
    expect(output).toContain('Valid');
  });

  it('should validate strict governance checks', () => {
    const output = run('validate --strict');
    expect(output).toContain('Valid');
  });

  it('should plan against knowledge', () => {
    // Add a knowledge file first
    run('knowledge add --type architecture --title "Test App"');

    const output = run('plan "build frontend"');
    expect(output).toContain('task:');
    expect(output).toContain('verify:');
    expect(output).toContain('- build');
    expect(output).toContain('- lint');
  });

  it('should search with results', () => {
    // Now search for something that should match
    const output = run('search "frontend"');
    expect(output).toBeTruthy();
  });

  it('should record an outcome', () => {
    const output = run('record --build passed --lint passed --task "test task" --files "test.ts"');
    expect(output).toContain('Recorded:');
    expect(output).toContain('ACCEPTED');
  });

  it('should show stats after recording', () => {
    const output = run('stats');
    expect(output).toContain('Outcomes:');
  });

  it('should fail gracefully without .hytrax/', () => {
    const emptyDir = join(tmpdir(), 'hytrax-no-project');
    rmSync(emptyDir, { recursive: true, force: true });
    mkdirSync(emptyDir, { recursive: true });

    try {
      execSync(`node "${cliEntry}" plan "test"`, {
        cwd: emptyDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      // Shouldn't reach here
      expect(true).toBe(false);
    } catch (e: any) {
      const stderr = e.stderr?.toString() || '';
      expect(stderr).toContain('.hytrax');
    }
  });
});
