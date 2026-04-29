// PinGate — local-only "curious people" lock.
//
// The PIN is the device's current local time formatted as HHMM (e.g. 14:43 →
// 1443). Sits above the existing Login screen so a bystander never sees the
// password form either. Not a security primitive — derivable by anyone who
// knows the trick. Idle re-prompt at 30 min, also re-locks when the tab
// returns to the foreground past the threshold.

import { useState, useRef, useEffect, useCallback } from 'react';
import { color, fonts, radius } from './theme/tokens';
import { t } from './i18n';

export const GRACE_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'pinUnlockedAt';

// Returns the set of accepted PIN strings at `now`: current minute and the
// previous one. Day-rollover safe via mod 1440.
export function validPins(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const prev = (m - 1 + 1440) % 1440;
  const fmt = (mins) =>
    String(Math.floor(mins / 60)).padStart(2, '0') +
    String(mins % 60).padStart(2, '0');
  return new Set([fmt(m), fmt(prev)]);
}

function readUnlockedAt() {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (!v) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function isUnlocked() {
  return Date.now() - readUnlockedAt() < GRACE_MS;
}

export default function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputs = useRef([null, null, null, null]);

  // Re-check on focus / visibility return — handles backgrounded PWAs.
  useEffect(() => {
    if (!unlocked) return undefined;
    const recheck = () => {
      if (document.visibilityState === 'visible' && !isUnlocked()) {
        setUnlocked(false);
      }
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [unlocked]);

  // Focus first cell whenever the gate is shown.
  useEffect(() => {
    if (!unlocked) inputs.current[0]?.focus();
  }, [unlocked]);

  const tryUnlock = useCallback((arr) => {
    const code = arr.join('');
    if (code.length !== 4) return;
    if (validPins().has(code)) {
      try {
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* sessionStorage unavailable (privacy mode) — unlock for this render only */
      }
      setUnlocked(true);
      setError(false);
      setDigits(['', '', '', '']);
    } else {
      setError(true);
      setShake(true);
      window.setTimeout(() => {
        setDigits(['', '', '', '']);
        setShake(false);
        inputs.current[0]?.focus();
      }, 400);
    }
  }, []);

  function handleChange(idx, raw) {
    const d = raw.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    if (!d && raw === '') {
      next[idx] = '';
      setDigits(next);
      return;
    }
    if (!d) return;
    next[idx] = d;
    setDigits(next);
    setError(false);
    if (idx < 3) {
      inputs.current[idx + 1]?.focus();
    } else {
      tryUnlock(next);
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        e.preventDefault();
        const next = [...digits];
        next[idx - 1] = '';
        setDigits(next);
        inputs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 3) {
      e.preventDefault();
      inputs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter') {
      tryUnlock(digits);
    }
  }

  function handlePaste(e) {
    const pasted = (e.clipboardData?.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, 4);
    if (pasted.length === 4) {
      e.preventDefault();
      const next = pasted.split('');
      setDigits(next);
      setError(false);
      tryUnlock(next);
    }
  }

  if (unlocked) return children;

  const styles = {
    wrapper: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color.bg.page,
      fontFamily: fonts.jakarta.body,
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      textAlign: 'center',
    },
    title: {
      color: color.text.primary,
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: '0.02em',
      marginBottom: 8,
    },
    subtitle: {
      color: color.text.muted,
      fontSize: 13,
      marginBottom: 32,
    },
    inputs: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      animation: shake ? 'pinShake 0.4s ease' : 'none',
    },
    input: {
      width: 56,
      height: 64,
      textAlign: 'center',
      fontSize: 26,
      fontFamily: fonts.jakarta.body,
      fontWeight: 600,
      color: error ? color.feedback.negative : color.text.primary,
      background: color.bg.card,
      border: `1.5px solid ${error ? color.feedback.negative : color.border.default}`,
      borderRadius: radius.rounded.sm,
      outline: 'none',
      caretColor: color.accent.primary,
      boxSizing: 'border-box',
    },
    error: {
      marginTop: 18,
      color: color.feedback.negative,
      fontSize: 13,
      minHeight: 18,
    },
  };

  const keyframes = `
    @keyframes pinShake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
  `;

  return (
    <div style={styles.wrapper}>
      <style>{keyframes}</style>
      <div style={styles.card}>
        <div style={styles.title}>{t('pin.title')}</div>
        <div style={styles.subtitle}>{t('pin.subtitle')}</div>
        <div style={styles.inputs}>
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={1}
              value={digits[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`${t('pin.aria.digit')} ${i + 1}`}
              style={styles.input}
            />
          ))}
        </div>
        <div style={styles.error}>{error ? t('pin.error.wrong') : ''}</div>
      </div>
    </div>
  );
}
