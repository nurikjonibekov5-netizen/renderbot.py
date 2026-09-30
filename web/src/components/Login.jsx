import { useState } from 'react';
import { login } from '../data-source.js';

export function Login({ onDone }) {
  const [parol, setParol] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(parol);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="brand-mark big">+</div>
        <h1>Klinika 3D nazorati</h1>
        <p className="muted">Faqat rahbar va administrator uchun</p>
        <input type="password" autoFocus placeholder="Parol" value={parol} onChange={(e) => setParol(e.target.value)} aria-label="Parol" />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy || !parol}>{busy ? 'Tekshirilmoqda…' : 'Kirish'}</button>
      </form>
    </div>
  );
}
