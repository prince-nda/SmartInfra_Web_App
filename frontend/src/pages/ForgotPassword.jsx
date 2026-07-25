import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api/auth';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRequestCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setStep('reset');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      await forgotPassword(email);
      setSuccess('A new code is on its way.');
    } finally {
      setResending(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otp.length !== 6) return setError('Enter the 6-digit code we emailed you');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setSubmitting(true);
    try {
      await resetPassword(email, otp, password);
      setSuccess('Password updated. Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'That code is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'reset') {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <div className="auth-header">
            <h1>Enter your reset code</h1>
            <p>We emailed a 6-digit code to <strong>{email}</strong>.</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}>{success}</div>}

          <form onSubmit={handleReset}>
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
            </div>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
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

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h1>Reset your password</h1>
          <p>Enter the email on your account and we'll send a reset code there.</p>
        </div>

        <form onSubmit={handleRequestCode}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset code'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}