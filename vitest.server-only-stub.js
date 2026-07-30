// Stub for `server-only` package in test environment.
// The real package (bundled with Next) only re-throws in client bundles.
// Under vitest (node) the import is a no-op.
export {};