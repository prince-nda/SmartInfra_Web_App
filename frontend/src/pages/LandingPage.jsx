import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon';
import { CATEGORY_OPTIONS } from '../api/reports';
import './LandingPage.css';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero landing-hero-photo">
        <div className="landing-hero-overlay" />
        <div className="container landing-hero-inner">
          <span className="landing-eyebrow">Civic Infrastructure Reporting</span>
          <h1>
            Keep Kigali <span className="accent">clean and green.</span>
          </h1>
          <p>
            Report infrastructure issues, track progress, and help build a smarter city — from
            potholes and broken streetlights to water leaks and beyond, from first report to final fix.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary">Report an issue</Link>
            <Link to="/login" className="btn btn-secondary">Log in</Link>
          </div>

          <div className="landing-stats">
            <div className="landing-stat">
              <div className="value">5</div>
              <div className="label">Issue categories</div>
            </div>
            <div className="landing-stat">
              <div className="value">24/7</div>
              <div className="label">Report anytime</div>
            </div>
            <div className="landing-stat">
              <div className="value">Live</div>
              <div className="label">Status tracking</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section container">
        <div className="landing-section-header">
          <h2>What you can report</h2>
          <p>Snap a photo, pin the location, and send it straight to the team that handles it.</p>
        </div>
        <div className="landing-category-grid">
          {CATEGORY_OPTIONS.map((c) => (
            <div className="card landing-category-card" key={c.value}>
              <span className="icon-wrap"><CategoryIcon category={c.value} /></span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section container">
        <div className="landing-section-header">
          <h2>How it works</h2>
          <p>Three steps from spotting a problem to seeing it resolved.</p>
        </div>
        <div className="landing-steps">
          <div className="card landing-step">
            <div className="step-number">01</div>
            <h3>Submit a report</h3>
            <p>Choose a category, describe the issue, and optionally attach photos and your location — auto-detected or dropped on a map.</p>
          </div>
          <div className="card landing-step">
            <div className="step-number">02</div>
            <h3>City reviews and assigns</h3>
            <p>Administrators triage incoming reports, assign them to the right team, and keep a documented history of every action taken.</p>
          </div>
          <div className="card landing-step">
            <div className="step-number">03</div>
            <h3>You get notified</h3>
            <p>Every status change — in progress, resolved, or otherwise — reaches you by email and in-app notification, with context from the team.</p>
          </div>
        </div>
      </section>

      <section className="landing-section container">
        <div className="landing-section-header">
          <h2>Built for both sides of the process</h2>
        </div>
        <div className="landing-features">
          <div className="card landing-feature-col">
            <h3>For citizens</h3>
            <ul>
              <li><CheckIcon /> Submit reports with photos and precise location</li>
              <li><CheckIcon /> Track every report's status in real time</li>
              <li><CheckIcon /> Get notified the moment something changes</li>
              <li><CheckIcon /> Manage your profile and account securely</li>
            </ul>
          </div>
          <div className="card landing-feature-col">
            <h3>For city administrators</h3>
            <ul>
              <li><CheckIcon /> Search, filter, and triage every incoming report</li>
              <li><CheckIcon /> Assign reports and document internal notes</li>
              <li><CheckIcon /> Analytics dashboard with resolution trends</li>
              <li><CheckIcon /> Full audit trail and CSV/PDF export</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="container">
          <h2>Ready to report your first issue?</h2>
          <p>It takes less than two minutes.</p>
          <Link to="/register" className="btn btn-primary">Create your account</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">SmartInfra — Smart Infrastructure Reporting System</div>
      </footer>
    </div>
  );
}