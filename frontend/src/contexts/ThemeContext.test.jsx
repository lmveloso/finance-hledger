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

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to light when nothing is stored', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('light');
    expect(_getActiveMode()).toBe('light');
  });

  it('reads the persisted mode on first render — dark wins over the light default when set', () => {
    window.localStorage.setItem(__THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('dark');
  });

  it('toggle() flips the mode, persists, and updates the tokens module', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.mode).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.mode).toBe('dark');
    expect(window.localStorage.getItem(__THEME_STORAGE_KEY)).toBe('dark');
    expect(_getActiveMode()).toBe('dark');

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe('light');
    expect(window.localStorage.getItem(__THEME_STORAGE_KEY)).toBe('light');
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
    expect(result.current.tokens.isDark).toBe(false);
    act(() => {
      result.current.setMode('dark');
    });
    expect(result.current.tokens.isDark).toBe(true);
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
