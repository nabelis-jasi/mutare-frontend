import React, { useState, useEffect, useRef } from 'react';

/**
 * NavigationTool.jsx
 * 
 * Drop this alongside MapView.jsx.
 * Props:
 *   map        — the Leaflet map instance (passed from MapView via ref)
 *   onClose    — called when user closes the panel
 */

// ── OSRM public endpoint (OpenStreetMap routing) ──────────────────────────
const OSRM = 'https://router.project-osrm.org/route/v1';

// ── Compass/direction helpers ─────────────────────────────────────────────
const bearingToCardinal = (deg) => {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
};

const turnIcon = (modifier) => {
  const map = {
    'turn right':       '↱',
    'turn left':        '↰',
    'slight right':     '↗',
    'slight left':      '↖',
    'sharp right':      '⤴',
    'sharp left':       '⤵',
    'uturn':            '↩',
    'straight':         '↑',
    'roundabout':       '⟳',
    'rotary':           '⟳',
    'merge':            '⇑',
    'fork':             '⑂',
    'end of road':      '⊣',
    'continue':         '↑',
    'depart':           '◉',
    'arrive':           '⚑',
  };
  if (!modifier) return '↑';
  const key = Object.keys(map).find(k => modifier.toLowerCase().includes(k));
  return key ? map[key] : '↑';
};

const metersToHuman = (m) => {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
};

const secondsToHuman = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

// ── Geocode via Nominatim ─────────────────────────────────────────────────
const geocode = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${query}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
};

// ── Reverse geocode ───────────────────────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

// ── Main component ────────────────────────────────────────────────────────
export default function NavigationTool({ map, onClose }) {
  const [origin, setOrigin]           = useState('');
  const [destination, setDest]        = useState('');
  const [mode, setMode]               = useState('walking'); // walking | cycling | driving
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [route, setRoute]             = useState(null);         // full route object
  const [steps, setSteps]             = useState([]);
  const [activeStep, setActiveStep]   = useState(0);
  const [locating, setLocating]       = useState(false);
  const [originCoords, setOriginCoords]   = useState(null);
  const [destCoords, setDestCoords]       = useState(null);

  // Leaflet layer refs
  const routeLayerRef  = useRef(null);
  const markersRef     = useRef([]);

  // Clean up layers when component unmounts
  useEffect(() => {
    return () => clearMapLayers();
  }, []);

  const clearMapLayers = () => {
    if (!map) return;
    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
  };

  // ── Get current GPS location ──────────────────────────────────────────
  const useMyLocation = () => {
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setOriginCoords({ lat, lng });
        try {
          const label = await reverseGeocode(lat, lng);
          setOrigin(label.split(',').slice(0, 2).join(',').trim());
        } catch {
          setOrigin(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      (err) => {
        setError('Location access denied. Please type your starting point.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Pick point on map ─────────────────────────────────────────────────
  const pickOnMap = (field) => {
    if (!map) return;
    setError(`Click on the map to set your ${field}…`);
    map.once('click', async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const label = await reverseGeocode(lat, lng);
        const short = label.split(',').slice(0, 2).join(',').trim();
        if (field === 'origin') { setOrigin(short); setOriginCoords({ lat, lng }); }
        else                    { setDest(short);   setDestCoords({ lat, lng });   }
        setError('');
      } catch {
        if (field === 'origin') { setOrigin(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); setOriginCoords({ lat, lng }); }
        else                    { setDest(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);   setDestCoords({ lat, lng });   }
        setError('');
      }
    });
  };

  // ── Fetch route from OSRM ─────────────────────────────────────────────
  const fetchRoute = async () => {
    setLoading(true);
    setError('');
    setRoute(null);
    setSteps([]);
    setActiveStep(0);

    try {
      // Resolve coords
      let from = originCoords;
      let to   = destCoords;

      if (!from) from = await geocode(origin);
      if (!to)   to   = await geocode(destination);

      const profile = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
      const url = `${OSRM}/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?steps=true&geometries=geojson&overview=full&annotations=false`;

      const res  = await fetch(url);
      const data = await res.json();

      if (data.code !== 'Ok' || !data.routes.length) throw new Error('No route found between these points.');

      const r = data.routes[0];
      setRoute({
        distance: r.distance,
        duration: r.duration,
        from,
        to,
      });

      // Flatten all steps from all legs
      const allSteps = r.legs.flatMap(leg =>
        leg.steps.map(s => ({
          instruction: s.maneuver.type + (s.maneuver.modifier ? ' ' + s.maneuver.modifier : ''),
          name:        s.name || '',
          distance:    s.distance,
          duration:    s.duration,
          modifier:    `${s.maneuver.type} ${s.maneuver.modifier || ''}`.trim(),
          bearing_after: s.maneuver.bearing_after,
        }))
      );
      setSteps(allSteps);

      // ── Draw route on map ──
      clearMapLayers();

      if (map && window.L) {
        const L = window.L;
        const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        // Route line
        routeLayerRef.current = L.polyline(coords, {
          color: '#4f6ef7',
          weight: 5,
          opacity: 0.85,
          dashArray: null,
          lineJoin: 'round',
        }).addTo(map);

        // Origin marker
        const originIcon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(34,197,94,0.3)"></div>`,
          iconAnchor: [7, 7],
        });
        const destIcon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:#f85149;border:2px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(248,81,73,0.3)"></div>`,
          iconAnchor: [7, 7],
        });

        markersRef.current.push(
          L.marker([from.lat, from.lng], { icon: originIcon }).addTo(map),
          L.marker([to.lat, to.lng],     { icon: destIcon   }).addTo(map)
        );

        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
      }

    } catch (err) {
      setError(err.message || 'Routing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearMapLayers();
    setRoute(null);
    setSteps([]);
    setOrigin('');
    setDest('');
    setOriginCoords(null);
    setDestCoords(null);
    setError('');
    setActiveStep(0);
  };

  const modeOpts = [
    { id: 'walking',  icon: '🚶', label: 'Walk'  },
    { id: 'cycling',  icon: '🚴', label: 'Cycle' },
    { id: 'driving',  icon: '🚗', label: 'Drive' },
  ];

  // ── Current step for navigation view ──────────────────────────────────
  const currentStep = steps[activeStep];
  const isFirst     = activeStep === 0;
  const isLast      = activeStep === steps.length - 1;

  return (
    <div className="eng-panel" style={{ '--panel-color-bg': 'rgba(79,110,247,0.1)', '--panel-color-border': 'rgba(79,110,247,0.3)' }}>
      {/* Header */}
      <div className="eng-panel-header">
        <div className="eng-panel-header-icon">🧭</div>
        <div>
          <div className="eng-panel-title">Navigation</div>
          <div className="eng-panel-sub">OSM Turn-by-Turn Routing</div>
        </div>
        <button className="eng-panel-close" onClick={() => { handleClear(); onClose(); }}>×</button>
      </div>

      <div className="eng-panel-body">

        {/* ── Mode selector ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {modeOpts.map(m => (
            <button
              key={m.id}
              className={`eng-sync-opt${mode === m.id ? ' active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setMode(m.id)}
            >
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        {/* ── Origin field ── */}
        <div>
          <label className="eng-label">From (Origin)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="eng-input"
              style={{ flex: 1 }}
              placeholder="Start location or address…"
              value={origin}
              onChange={e => { setOrigin(e.target.value); setOriginCoords(null); }}
            />
            <button
              className="eng-btn eng-btn-ghost"
              style={{ padding: '8px 10px', flexShrink: 0 }}
              onClick={useMyLocation}
              title="Use my current location"
              disabled={locating}
            >
              {locating ? '⏳' : '📍'}
            </button>
            <button
              className="eng-btn eng-btn-ghost"
              style={{ padding: '8px 10px', flexShrink: 0 }}
              onClick={() => pickOnMap('origin')}
              title="Pick on map"
            >
              🗺️
            </button>
          </div>
        </div>

        {/* ── Destination field ── */}
        <div style={{ marginTop: 10 }}>
          <label className="eng-label">To (Destination)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="eng-input"
              style={{ flex: 1 }}
              placeholder="End location or address…"
              value={destination}
              onChange={e => { setDest(e.target.value); setDestCoords(null); }}
            />
            <button
              className="eng-btn eng-btn-ghost"
              style={{ padding: '8px 10px', flexShrink: 0 }}
              onClick={() => pickOnMap('destination')}
              title="Pick on map"
            >
              🗺️
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && <div className="eng-status err" style={{ marginTop: 10 }}>{error}</div>}

        {/* ── Route button ── */}
        {!route && (
          <div className="eng-btn-row">
            <button className="eng-btn eng-btn-ghost" onClick={handleClear}>Clear</button>
            <button
              className="eng-btn eng-btn-primary"
              style={{ flex: 2 }}
              onClick={fetchRoute}
              disabled={loading || (!origin && !originCoords) || (!destination && !destCoords)}
            >
              {loading ? '⏳ Routing…' : '🧭 Get Directions'}
            </button>
          </div>
        )}

        {/* ── Route summary ── */}
        {route && (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 14 }}>
              <div className="eng-stat-card blue" style={{ flex: 1 }}>
                <div className="sc-num" style={{ fontSize: 16 }}>{metersToHuman(route.distance)}</div>
                <div className="sc-label">Distance</div>
              </div>
              <div className="eng-stat-card green" style={{ flex: 1 }}>
                <div className="sc-num" style={{ fontSize: 16 }}>{secondsToHuman(route.duration)}</div>
                <div className="sc-label">Est. Time</div>
              </div>
            </div>

            {/* ── Active step navigator ── */}
            {currentStep && (
              <div style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--accent-blue)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: 14,
                boxShadow: '0 0 0 1px var(--accent-blue), 0 4px 20px var(--glow-blue)',
              }}>
                {/* Big direction icon */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <div style={{
                    fontSize: 40,
                    lineHeight: 1,
                    color: 'var(--accent-blue)',
                    textShadow: '0 0 20px rgba(79,110,247,0.5)',
                  }}>
                    {turnIcon(currentStep.modifier)}
                  </div>
                </div>

                {/* Instruction */}
                <div style={{
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-pri)',
                  textTransform: 'capitalize',
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}>
                  {currentStep.modifier}
                  {currentStep.name ? ` onto ${currentStep.name}` : ''}
                </div>

                {/* Distance for this step */}
                <div style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)', marginBottom: 10 }}>
                  {metersToHuman(currentStep.distance)}
                  {currentStep.bearing_after != null &&
                    ` · Head ${bearingToCardinal(currentStep.bearing_after)}`}
                </div>

                {/* Step counter + prev/next */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    className="eng-btn eng-btn-ghost"
                    style={{ padding: '6px 12px' }}
                    onClick={() => setActiveStep(s => Math.max(0, s - 1))}
                    disabled={isFirst}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-sec)' }}>
                    Step {activeStep + 1} / {steps.length}
                  </span>
                  <button
                    className="eng-btn eng-btn-primary"
                    style={{ padding: '6px 12px' }}
                    onClick={() => setActiveStep(s => Math.min(steps.length - 1, s + 1))}
                    disabled={isLast}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── All steps list ── */}
            <div className="eng-section-head">All Steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {steps.map((step, i) => (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: activeStep === i ? 'var(--glow-blue)' : 'var(--bg-base)',
                    border: `1px solid ${activeStep === i ? 'var(--accent-blue)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, color: activeStep === i ? 'var(--accent-blue)' : 'var(--text-sec)' }}>
                    {turnIcon(step.modifier)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-pri)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.modifier}{step.name ? ` onto ${step.name}` : ''}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 1 }}>
                      {metersToHuman(step.distance)} · {secondsToHuman(step.duration)}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', flexShrink: 0 }}>
                    #{i + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Re-route / clear */}
            <div className="eng-btn-row" style={{ marginTop: 16 }}>
              <button className="eng-btn eng-btn-ghost" onClick={handleClear}>
                🗑 Clear Route
              </button>
              <button className="eng-btn eng-btn-primary" onClick={fetchRoute} disabled={loading}>
                {loading ? '⏳' : '↺ Re-route'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
