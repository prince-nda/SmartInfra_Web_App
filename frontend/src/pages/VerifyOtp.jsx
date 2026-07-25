import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api/auth';
import './Auth.css';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) return setError('Enter the email you registered with');
    if (otp.length !== 6) return setError('Enter the 6-digit code we emailed you');

    setSubmitting(true);
    try {
      await verifyOtp(email, otp);
      setSuccess('Verified! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'That code is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email) return setError('Enter the email you registered with first');
    setError('');
    setResending(true);
    try {
      await resendOtp(email);
      setSuccess('A new code is on its way.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h1>Verify your account</h1>
          <p>Enter the 6-digit code we emailed you to activate your account.</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: '0.3em', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)', textAlign: 'center' }}
              autoFocus
            />
            <span className="hint">Expires 10 minutes after it's sent</span>
          </div>
          <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify account'}
          </button>
        </form>

        <div className="auth-footer">
          Didn't get a code?{' '}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: 0, fontSize: 'inherit' }}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}