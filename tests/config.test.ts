import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-config');
const hytraxDir = join(testDir, '.hytrax');
const configPath = join(hytraxDir, 'config.toml');

describe('Config loader', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(hytraxDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return defaults when no .hytrax/ exists', async () => {
    const { loadConfig } = await import('../src/config/loader.js');
    // Use a non-existent directory
    const config = loadConfig(join(tmpdir(), 'nonexistent-dir-for-hytrax'));
    expect(config.project.name).toBe('my-project');
    expect(config.search.max_results).toBe(10);
  });

  it('should return defaults when config.toml is missing', async () => {
    const { loadConfig } = await import('../src/config/loader.js');
    // .hytrax/ exists but no config.toml
    const config = loadConfig(testDir);
    expect(config.project.name).toBe('my-project');
    expect(config.search.max_results).toBe(10);
  });

  it('should return defaults when config.toml is corrupt', async () => {
    const { loadConfig } = await import('../src/config/loader.js');
    writeFileSync(configPath, 'this is not valid toml {{{', 'utf-8');
    const config = loadConfig(testDir);
    expect(config.project.name).toBe('my-project');
  });

  it('should parse valid config.toml', async () => {
    const { loadConfig } = await import('../src/config/loader.js');
    writeFileSync(configPath, `[project]
name = "my-app"

[search]
max_results = 25

`, 'utf-8');
    const config = loadConfig(testDir);
    expect(config.project.name).toBe('my-app');
    expect(config.search.max_results).toBe(25);
  });

  it('should merge partial config with defaults', async () => {
    const { loadConfig } = await import('../src/config/loader.js');
    writeFileSync(configPath, `[project]
name = "partial-app"
`, 'utf-8');
    const config = loadConfig(testDir);
    expect(config.project.name).toBe('partial-app');
    expect(config.search.max_results).toBe(10); // default
  });
});
