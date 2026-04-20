import { useState } from 'react';
import { color } from './theme/tokens';
import { t } from './i18n';

const API = import.meta.env.VITE_API_URL || '';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = {
    wrapper: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color.bg.pageAlt,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    card: {
      background: color.bg.card,
      border: `1px solid ${color.border.default}`,
      borderRadius: 12,
      padding: '2rem',
      width: 320,
      textAlign: 'center',
    },
    title: {
      color: color.text.primaryAlt,
      fontSize: '1.4rem',
      fontWeight: 600,
      marginBottom: '1.5rem',
    },
    input: {
      width: '100%',
      padding: '0.6rem 0.8rem',
      border: `1px solid ${color.border.default}`,
      borderRadius: 8,
      background: color.bg.pageAlt,
      color: color.text.primaryAlt,
      fontSize: '1rem',
      outline: 'none',
      boxSizing: 'border-box',
    },
    button: {
      width: '100%',
      marginTop: '1rem',
      padding: '0.6rem',
      border: 'none',
      borderRadius: 8,
      background: color.accent.primary,
      color: color.bg.pageAlt,
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
    error: {
      color: color.feedback.errorText,
      fontSize: '0.85rem',
      marginTop: '0.75rem',
    },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setError(t('auth.error.wrongPassword'));
        return;
      }
      const data = await r.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', data.user);
      onLogin();
    } catch {
      setError(t('auth.error.connection'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.title}>{t('auth.title')}</div>
        <input
          style={styles.input}
          type="password"
          placeholder={t('auth.password.placeholder')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? t('auth.submitting') : t('auth.submit')}
        </button>
        {error && <div style={styles.error}>{error}</div>}
      </form>
    </div>
  );
}
