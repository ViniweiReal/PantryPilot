import '@testing-library/jest-dom/vitest';

Object.defineProperty(globalThis, 'isSecureContext', {
  configurable: true,
  value: true,
});
