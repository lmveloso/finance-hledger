// ThemeContext unit tests.
//
// No test runner is wired into the repo yet (see package.json — only vite
// build is configured). This file is written against Vitest + Testing
// Library conventions so it will be picked up automatically when the test
// harness lands in a later PR. Until then, the assertions double as
// executable documentation for the provider contract.

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ThemeProvider,
  useTheme,
  __THEME_STORAGE_KEY,
} from './ThemeContext.jsx';
import { _getActiveMode } from '../theme/tokens.js';

function wrap({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockMatchMedia(prefersDark) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)' ? prefersDark : !prefersDark,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to dark when nothing is stored and OS prefers dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('dark');
    expect(_getActiveMode()).toBe('dark');
  });

  it('falls back to light when OS prefers light and storage is empty', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('light');
    expect(_getActiveMode()).toBe('light');
  });

  it('reads the persisted mode on first render (localStorage > prefers-color-scheme)', () => {
    mockMatchMedia(true); // OS says dark
    window.localStorage.setItem(__THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('light');
  });

  it('toggle() flips the mode, persists, and updates the tokens module', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('dark');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.mode).toBe('light');
    expect(window.localStorage.getItem(__THEME_STORAGE_KEY)).toBe('light');
    expect(_getActiveMode()).toBe('light');

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe('dark');
    expect(window.localStorage.getItem(__THEME_STORAGE_KEY)).toBe('dark');
  });

  it('setMode("light") works directly and round-trips via localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.mode).toBe('light');
    expect(window.localStorage.getItem(__THEME_STORAGE_KEY)).toBe('light');
  });

  it('setMode rejects invalid values', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(() => {
      act(() => {
        result.current.setMode('sepia');
      });
    }).toThrow();
  });

  it('useTheme throws outside of <ThemeProvider>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow();
    spy.mockRestore();
  });

  it('exposes a tokens snapshot that matches the active mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.tokens.isDark).toBe(true);
    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.tokens.isDark).toBe(false);
  });

  it('renders children without crashing', () => {
    const { container } = render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>
    );
    expect(container.textContent).toContain('hello');
  });
});
