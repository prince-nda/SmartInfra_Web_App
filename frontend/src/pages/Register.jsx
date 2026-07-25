import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { RWANDA_DISTRICTS } from '../constants/districts';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    nationalIdNo: '', district: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        nationalIdNo: form.nationalIdNo,
        district: form.district,
      });
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Report infrastructure problems in your neighborhood and track them to resolution.</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
          </div>

          <div className="auth-row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="07xxxxxxxx" />
              <span className="hint">Used for future SMS notifications</span>
            </div>
          </div>

          <div className="auth-row">
            <div className="field">
              <label htmlFor="nationalIdNo">National ID (optional)</label>
              <input id="nationalIdNo" value={form.nationalIdNo} onChange={(e) => update('nationalIdNo', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="district">District</label>
              <select id="district" value={form.district} onChange={(e) => update('district', e.target.value)}>
                <option value="">Select district</option>
                {RWANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="auth-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required value={form.password} onChange={(e) => update('password', e.target.value)} />
              <span className="hint">At least 8 characters</span>
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}