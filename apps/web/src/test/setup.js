// Global test setup for Vitest
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'healthy', service: 'labellens-api', llm_provider: 'mock' }),
  })
);
