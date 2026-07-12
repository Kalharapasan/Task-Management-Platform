import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Mock requestAnimationFrame for components that might use it
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Global mock for fetch if needed
global.fetch = global.fetch || (() => Promise.resolve(new Response()));
