import React, { useEffect, useState } from 'react';
import { color, fonts } from '../theme/tokens';
import { t } from '../i18n';

// Two thin, top-anchored banners that surface PWA-layer state to the user.
// Kept as a single module because they share placement/styling concerns and
// neither warrants its own file.

const wrapperBase = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '10px 14px',
  fontFamily: fonts.jakarta.body,
  fontSize: 13,
  lineHeight: 1.3,
  borderBottom: `1px solid ${color.border.default}`,
  paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
};

// Surfaces the "new SW waiting" state. main.jsx dispatches sw:update-ready
// with the waiting registration so the click handler can post SKIP_WAITING.
export function UpdateBanner() {
  const [reg, setReg] = useState(null);

  useEffect(() => {
    function onReady(e) {
      setReg(e.detail?.registration || null);
    }
    window.addEventListener('sw:update-ready', onReady);
    return () => window.removeEventListener('sw:update-ready', onReady);
  }, []);

  if (!reg) return null;

  function reload() {
    const waiting = reg.waiting;
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  return (
    <div
      role="status"
      style={{
        ...wrapperBase,
        background: color.accent.primaryMuted,
        color: color.text.primary,
      }}
    >
      <span>{t('pwa.update.message')}</span>
      <button
        type="button"
        onClick={reload}
        style={{
          background: color.accent.primary,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontFamily: fonts.jakarta.body,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t('pwa.update.action')}
      </button>
    </div>
  );
}

// Shown when the page is served over plain http (Tailscale tail-net without
// `tailscale serve --https`). In that case Service Worker, Cache API, and
// install-as-PWA are all disabled by the browser regardless of our code, so
// the user has no way to know why the home-screen icon and offline boot are
// missing. This banner makes that explicit.
export function InsecureContextBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isLocal =
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    setShow(!self.isSecureContext && !isLocal);
  }, []);

  if (!show || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        ...wrapperBase,
        background: color.feedback.warningMuted,
        color: color.text.primary,
      }}
    >
      <span style={{ flex: 1, maxWidth: 720 }}>
        {t('pwa.insecure.message')}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          color: color.text.muted,
          border: `1px solid ${color.border.default}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontFamily: fonts.jakarta.body,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {t('pwa.insecure.dismiss')}
      </button>
    </div>
  );
}
