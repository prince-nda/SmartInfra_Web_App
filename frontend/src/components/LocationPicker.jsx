import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const KIGALI_CENTER = [-1.9441, 30.0619];

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}


export default function LocationPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const position = value ? [value.lat, value.lng] : KIGALI_CENTER;

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        {value ? 'Change pin on map' : 'Pick location on map'}
      </button>
    );
  }

  return (
    <div className="location-picker">
      <p className="hint" style={{ marginBottom: 'var(--space-2)' }}>Click anywhere on the map to drop a pin.</p>
      <div className="location-picker-map">
        <MapContainer center={position} zoom={13} scrollWheelZoom style={{ height: '260px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {value && <Marker position={[value.lat, value.lng]} icon={markerIcon} />}
          <ClickHandler onPick={onChange} />
        </MapContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
        <span className="gps-status">
          {value ? `Pin set: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'No pin set yet'}
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Done</button>
      </div>
    </div>
  );
}