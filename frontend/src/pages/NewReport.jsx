import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReport, CATEGORY_OPTIONS } from '../api/reports';
import CategoryIcon from '../components/CategoryIcon';
import LocationPicker from '../components/LocationPicker';
import './Dashboard.css';
import './NewReport.css';

const MAX_IMAGES = 3;

export default function NewReport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | locating | done | denied
  const [images, setImages] = useState([]); // { file, previewUrl }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('done');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - images.length;
    const accepted = files.slice(0, remainingSlots);
    const withPreviews = accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...withPreviews]);
    e.target.value = '';
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!category) return setError('Please choose a category');
    if (!description.trim()) return setError('Please describe the issue');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      if (locationText) formData.append('locationText', locationText);
      if (coords) {
        formData.append('gpsLat', coords.lat);
        formData.append('gpsLong', coords.lng);
      }
      images.forEach((img) => formData.append('images', img.file));

      const { report } = await createReport(formData);
      navigate(`/reports/${report.report_id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1>Report an issue</h1>
          <p>The more detail you give us, the faster it gets to the right team.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-6)' }}>
        <div className="field">
          <label>Category</label>
          <div className="category-picker">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`category-option ${category === opt.value ? 'selected' : ''}`}
                onClick={() => setCategory(opt.value)}
              >
                <CategoryIcon category={opt.value} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            required
            placeholder="What's the problem, and how long has it been there?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="locationText">Location (optional)</label>
          <div className="location-row">
            <input
              id="locationText"
              placeholder="e.g. Near KG 7 Ave, Kimironko"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleUseLocation}>
              Use my location
            </button>
          </div>
          {gpsStatus === 'locating' && <span className="gps-status">Locating…</span>}
          {gpsStatus === 'done' && coords && (
            <span className="gps-status">Captured: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
          )}
          {gpsStatus === 'denied' && (
            <>
              <span className="gps-status">Couldn't get your location automatically - drop a pin on the map instead.</span>
              <LocationPicker value={coords} onChange={(c) => { setCoords(c); setGpsStatus('done'); }} />
            </>
          )}
          {gpsStatus === 'idle' && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <LocationPicker value={coords} onChange={(c) => { setCoords(c); setGpsStatus('done'); }} />
            </div>
          )}
        </div>

        <div className="field">
          <label>Photos (optional, up to {MAX_IMAGES})</label>
          {images.length < MAX_IMAGES && (
            <div className="image-dropzone" onClick={() => fileInputRef.current?.click()}>
              Click to add photos ({images.length}/{MAX_IMAGES})
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={handleFileSelect}
              />
            </div>
          )}
          {images.length > 0 && (
            <div className="image-previews">
              {images.map((img, i) => (
                <div className="image-preview" key={i}>
                  <img src={img.previewUrl} alt={`Upload preview ${i + 1}`} />
                  <button type="button" onClick={() => removeImage(i)} aria-label="Remove photo">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 'var(--space-3)' }}>
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}