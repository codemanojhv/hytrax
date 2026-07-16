import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Several CLI integration tests intentionally exercise the same fixed
    // temporary project paths. Keep files serial so cleanup is deterministic
    // on Windows as well as POSIX.
    fileParallelism: false,
  },
});
