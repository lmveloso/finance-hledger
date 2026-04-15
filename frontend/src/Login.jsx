import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1816',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: '#252220',
    border: '1px solid #3a3632',
    borderRadius: 12,
    padding: '2rem',
    width: 320,
    textAlign: 'center',
  },
  title: {
    color: '#e8e0d4',
    fontSize: '1.4rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    border: '1px solid #3a3632',
    borderRadius: 8,
    background: '#1a1816',
    color: '#e8e0d4',
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
    background: '#d4a574',
    color: '#1a1816',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#e05252',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
  },
};

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        setError('Senha incorreta');
        return;
      }
      const data = await r.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', data.user);
      onLogin();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.title}>🔐 Finance Hledger</div>
        <input
          style={styles.input}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
        {error && <div style={styles.error}>{error}</div>}
      </form>
    </div>
  );
}
