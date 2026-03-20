import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to get map instance and show coordinates
function MapEvents({ setCoordinates }) {
  const map = useMap();
  
  useEffect(() => {
    map.on('mousemove', (e) => {
      setCoordinates({
        lat: e.latlng.lat.toFixed(6),
        lng: e.latlng.lng.toFixed(6)
      });
    });
  }, [map, setCoordinates]);

  return null;
}

// Component for routing control
function RoutingControl({ waypoints, showRoute }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!showRoute || waypoints.length < 2) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    routingControlRef.current = L.Routing.control({
      waypoints: waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
      routeWhileDragging: true,
      showAlternatives: true,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#6366f1', weight: 6 }]
      }
    }).addTo(map);

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, waypoints, showRoute]);

  return null;
}

export default function MapView({ manholes = [], pipes = [], role, userId }) {
  const [mapCenter] = useState([-18.97, 32.67]); // Harare area
  const [mapZoom] = useState(13);
  const [mouseCoordinates, setMouseCoordinates] = useState({ lat: 0, lng: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState('street');
  const [markerSize, setMarkerSize] = useState('medium');

  // Helper to extract coordinates from MultiPoint geometry
  const getCoordinatesFromMultiPoint = (geom) => {
    if (!geom) return null;
    
    try {
      // If geom is a string (from database), parse it
      let geomObj = geom;
      if (typeof geom === 'string') {
        geomObj = JSON.parse(geom);
      }
      
      // Handle different geometry formats
      if (geomObj.type === 'MultiPoint' && geomObj.coordinates) {
        // Return the first point (assuming each manhole has one point)
        const [lng, lat] = geomObj.coordinates[0];
        return { lat, lng, type: 'Point' };
      } 
      else if (geomObj.type === 'Point' && geomObj.coordinates) {
        const [lng, lat] = geomObj.coordinates;
        return { lat, lng, type: 'Point' };
      }
      else if (geomObj.coordinates && Array.isArray(geomObj.coordinates[0])) {
        // MultiLineString or LineString
        return { coordinates: geomObj.coordinates, type: geomObj.type || 'MultiLineString' };
      }
      else if (geomObj.coordinates) {
        return { coordinates: geomObj.coordinates, type: geomObj.type || 'LineString' };
      }
    } catch (e) {
      console.error("Error parsing geometry:", e);
    }
    return null;
  };

  // Helper to extract coordinates from MultiLineString geometry
  const getCoordinatesFromMultiLineString = (geom) => {
    if (!geom) return null;
    
    try {
      let geomObj = geom;
      if (typeof geom === 'string') {
        geomObj = JSON.parse(geom);
      }
      
      if (geomObj.type === 'MultiLineString' && geomObj.coordinates) {
        // Flatten MultiLineString to array of points
        const points = [];
        geomObj.coordinates.forEach(line => {
          line.forEach(point => {
            points.push([point[1], point[0]]); // [lat, lng]
          });
        });
        return points;
      }
      else if (geomObj.type === 'LineString' && geomObj.coordinates) {
        return geomObj.coordinates.map(coord => [coord[1], coord[0]]);
      }
      else if (geomObj.coordinates && Array.isArray(geomObj.coordinates[0])) {
        if (Array.isArray(geomObj.coordinates[0][0])) {
          // MultiLineString
          const points = [];
          geomObj.coordinates.forEach(line => {
            line.forEach(point => {
              points.push([point[1], point[0]]);
            });
          });
          return points;
        } else {
          // LineString
          return geomObj.coordinates.map(coord => [coord[1], coord[0]]);
        }
      }
    } catch (e) {
      console.error("Error parsing pipeline geometry:", e);
    }
    return null;
  };

  // Get marker color based on block status
  const getMarkerColor = (bloc_stat) => {
    if (!bloc_stat) return '#28a745';
    if (bloc_stat.toLowerCase().includes('block')) return '#dc3545';
    if (bloc_stat.toLowerCase().includes('maintenance')) return '#ffc107';
    if (bloc_stat.toLowerCase().includes('service')) return '#dc3545';
    return '#28a745';
  };

  // Get marker size based on settings
  const getMarkerSize = () => {
    switch(markerSize) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  // Handle adding waypoint for routing
  const handleAddWaypoint = (lat, lng, type, id) => {
    setRouteWaypoints(prev => [...prev, { lat, lng, type, id }]);
    alert(`Added ${type} ${id} to route`);
  };

  // Clear route waypoints
  const handleClearRoute = () => {
    setRouteWaypoints([]);
    setShowRoute(false);
  };

  // Start routing
  const handleStartRoute = () => {
    if (routeWaypoints.length >= 2) {
      setShowRoute(true);
      setShowSettings(false);
    } else {
      alert('Please add at least 2 points to calculate a route');
    }
  };

  const styles = {
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      backgroundColor: "#f0f2f5",
    },
    mapWrapper: {
      flex: 1,
      position: "relative",
      margin: "10px",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      border: "2px solid #fff",
    },
    sidebar: {
      width: "320px",
      backgroundColor: "white",
      borderLeft: "1px solid #e0e0e0",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      margin: "10px 10px 10px 0",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      border: "2px solid #fff",
    },
    sidebarHeader: {
      padding: "1rem",
      backgroundColor: "#f8f9fa",
      borderBottom: "2px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sidebarTitle: {
      margin: 0,
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#333",
    },
    sidebarContent: {
      flex: 1,
      overflowY: "auto",
      padding: "1rem",
    },
    waypointList: {
      listStyle: "none",
      padding: 0,
      margin: 0,
    },
    waypointItem: {
      padding: "0.75rem",
      marginBottom: "0.5rem",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    waypointInfo: {
      fontSize: "0.9rem",
    },
    waypointType: {
      fontSize: "0.8rem",
      color: "#666",
    },
    removeWaypoint: {
      background: "none",
      border: "none",
      color: "#dc3545",
      cursor: "pointer",
      fontSize: "1.2rem",
      padding: "0 0.5rem",
    },
    routeButton: {
      width: "100%",
      padding: "0.75rem",
      marginTop: "1rem",
      backgroundColor: "#6366f1",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "1rem",
    },
    clearButton: {
      width: "100%",
      padding: "0.75rem",
      marginTop: "0.5rem",
      backgroundColor: "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "1rem",
    },
    legend: {
      position: "absolute",
      bottom: "20px",
      left: "20px",
      background: "white",
      padding: "12px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      fontSize: "12px",
      minWidth: "180px",
      border: "2px solid #fff",
    },
    coordinates: {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      background: "rgba(0,0,0,0.8)",
      color: "white",
      padding: "8px 16px",
      borderRadius: "20px",
      fontSize: "13px",
      fontFamily: "monospace",
      zIndex: 1000,
    },
    toolbar: {
      position: "absolute",
      top: "20px",
      right: "20px",
      display: "flex",
      gap: "8px",
      zIndex: 1000,
    },
    toolbarButton: {
      width: "44px",
      height: "44px",
      borderRadius: "10px",
      backgroundColor: "white",
      border: "2px solid #fff",
      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "1.3rem",
      transition: "all 0.2s",
    },
    settingsPanel: {
      position: "absolute",
      top: "70px",
      right: "20px",
      width: "280px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
      border: "2px solid #fff",
    },
    settingsHeader: {
      padding: "1rem",
      backgroundColor: "#f8f9fa",
      borderBottom: "2px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingsTitle: {
      margin: 0,
      fontSize: "1rem",
      fontWeight: "600",
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "1.2rem",
      cursor: "pointer",
      color: "#666",
    },
    settingsContent: {
      padding: "1rem",
    },
    settingItem: {
      marginBottom: "1rem",
    },
    settingLabel: {
      display: "block",
      fontSize: "0.9rem",
      color: "#666",
      marginBottom: "0.25rem",
    },
    settingSelect: {
      width: "100%",
      padding: "0.5rem",
      borderRadius: "6px",
      border: "1px solid #ddd",
    },
    userMenu: {
      position: "absolute",
      top: "70px",
      right: "20px",
      width: "200px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
      border: "2px solid #fff",
    },
    userMenuItem: {
      padding: "0.75rem 1rem",
      cursor: "pointer",
      transition: "background 0.2s",
      borderBottom: "1px solid #f0f0f0",
    },
    userRole: {
      padding: "1rem",
      backgroundColor: "#f8f9fa",
      borderBottom: "2px solid #e0e0e0",
      fontSize: "0.9rem",
      color: "#666",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.mapWrapper}>
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <MapEvents setCoordinates={setMouseCoordinates} />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked={selectedLayer === 'street'} name="OpenStreetMap">
              <TileLayer 
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Satellite">
              <TileLayer 
                attribution="Tiles &copy; Esri" 
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Render manholes - handle MultiPoint geometry */}
          {manholes.map((m) => {
            const pointData = getCoordinatesFromMultiPoint(m.geom);
            if (!pointData || pointData.type !== 'Point') return null;
            
            const { lat, lng } = pointData;
            const markerColor = getMarkerColor(m.bloc_stat);
            const size = getMarkerSize();
            
            const customIcon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                background-color: ${markerColor}; 
                width: ${size}px; 
                height: ${size}px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-size: ${size/2}px;
              ">🕳️</div>`,
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
            });
            
            return (
              <Marker 
                key={`manhole-${m.gid}`} 
                position={[lat, lng]}
                icon={customIcon}
              >
                <Popup>
                  <div style={{ maxWidth: '300px' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>
                      Manhole: {m.manhole_id || 'N/A'}
                    </h4>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr><td><strong>Pipe ID:</strong></td><td>{m.pipe_id || 'N/A'}</td></tr>
                        <tr><td><strong>Depth:</strong></td><td>{m.mh_depth || 'N/A'} m</td></tr>
                        <tr><td><strong>Status:</strong></td><td>{m.bloc_stat || 'Normal'}</td></tr>
                        <tr><td><strong>Type:</strong></td><td>{m.type || 'Standard'}</td></tr>
                        <tr><td><strong>Suburb:</strong></td><td>{m.suburb_nam || 'N/A'}</td></tr>
                        <tr><td><strong>Coordinates:</strong></td><td>{lat.toFixed(6)}, {lng.toFixed(6)}</td></tr>
                      </tbody>
                    </table>
                    <button
                      onClick={() => handleAddWaypoint(lat, lng, 'manhole', m.gid)}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Add to Route
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render pipelines - handle MultiLineString geometry */}
          {pipes.map((p) => {
            const positions = getCoordinatesFromMultiLineString(p.geom);
            if (!positions || positions.length < 2) return null;
            
            // Determine line color based on block status
            const lineColor = p.block_stat?.toLowerCase().includes('block') ? '#dc3545' : '#2b7bff';
            
            return (
              <Polyline 
                key={`pipe-${p.gid}`} 
                positions={positions} 
                color={lineColor}
                weight={5}
                opacity={1}
              >
                <Popup>
                  <div style={{ maxWidth: '300px' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>
                      Pipeline: {p.pipe_id || 'N/A'}
                    </h4>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr><td><strong>Start MH:</strong></td><td>{p.start_mh || 'N/A'}</td></tr>
                        <tr><td><strong>End MH:</strong></td><td>{p.end_mh || 'N/A'}</td></tr>
                        <tr><td><strong>Material:</strong></td><td>{p.pipe_mat || 'N/A'}</td></tr>
                        <tr><td><strong>Size:</strong></td><td>{p.pipe_size || 'N/A'}</td></tr>
                        <tr><td><strong>Length:</strong></td><td>{p.length || 'N/A'} m</td></tr>
                        <tr><td><strong>Status:</strong></td><td>{p.block_stat || 'Normal'}</td></tr>
                      </tbody>
                    </table>
                    <button
                      onClick={() => {
                        const midPoint = positions[Math.floor(positions.length/2)];
                        handleAddWaypoint(midPoint[0], midPoint[1], 'pipeline', p.gid);
                      }}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Add to Route
                    </button>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Routing Control */}
          {showRoute && (
            <RoutingControl waypoints={routeWaypoints} showRoute={showRoute} />
          )}
        </MapContainer>

        {/* Mouse Coordinates */}
        <div style={styles.coordinates}>
          📍 {mouseCoordinates.lat}, {mouseCoordinates.lng}
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button 
            style={styles.toolbarButton}
            onClick={() => window.location.href = '/'}
            title="Home"
          >
            🏠
          </button>
          <button 
            style={styles.toolbarButton}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            style={styles.toolbarButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="User"
          >
            👤
          </button>
          <button 
            style={styles.toolbarButton}
            onClick={handleStartRoute}
            title="Route"
          >
            🗺️
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={styles.settingsPanel}>
            <div style={styles.settingsHeader}>
              <h3 style={styles.settingsTitle}>Map Settings</h3>
              <button style={styles.closeButton} onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div style={styles.settingsContent}>
              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>Base Layer</label>
                <select 
                  style={styles.settingSelect}
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value)}
                >
                  <option value="street">OpenStreetMap</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>

              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>Marker Size</label>
                <select 
                  style={styles.settingSelect}
                  value={markerSize}
                  onChange={(e) => setMarkerSize(e.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* User Menu */}
        {showUserMenu && (
          <div style={styles.userMenu}>
            <div style={styles.userRole}>
              <strong>Role:</strong> {role ? role.replace('-', ' ') : 'Unknown'}<br/>
              <strong>ID:</strong> {userId ? userId.substring(0,8) + '...' : 'N/A'}
            </div>
            <div style={styles.userMenuItem} onClick={() => alert('Profile settings')}>
              👤 Profile Settings
            </div>
            <div style={styles.userMenuItem} onClick={() => alert('Help')}>
              ❓ Help
            </div>
            <div style={styles.userMenuItem} onClick={() => alert('About')}>
              ℹ️ About
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={styles.legend}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Legend</div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 14, height: 4, background: '#2b7bff', marginRight: 8 }}></span>
            Pipeline - Normal
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 14, height: 4, background: '#dc3545', marginRight: 8 }}></span>
            Pipeline - Blocked
          </div>
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 14, height: 14, background: '#28a745', marginRight: 8, borderRadius: '50%' }}></span>
            Manhole - Normal
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 14, height: 14, background: '#ffc107', marginRight: 8, borderRadius: '50%' }}></span>
            Manhole - Needs Maintenance
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 14, height: 14, background: '#dc3545', marginRight: 8, borderRadius: '50%' }}></span>
            Manhole - Blocked/Out of Service
          </div>
        </div>
      </div>

      {/* Route Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Route Planner</h3>
          <span style={{fontWeight: 'bold', color: '#6366f1'}}>{routeWaypoints.length} points</span>
        </div>
        <div style={styles.sidebarContent}>
          {routeWaypoints.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              Click "Add to Route" on any manhole or pipeline to start planning
            </p>
          ) : (
            <>
              <ul style={styles.waypointList}>
                {routeWaypoints.map((wp, index) => (
                  <li key={index} style={styles.waypointItem}>
                    <div style={styles.waypointInfo}>
                      <strong>{index + 1}. </strong>
                      {wp.type === 'manhole' ? '🕳️ Manhole' : '📏 Pipeline'}
                      <div style={styles.waypointType}>
                        {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                      </div>
                    </div>
                    <button 
                      style={styles.removeWaypoint}
                      onClick={() => {
                        setRouteWaypoints(prev => prev.filter((_, i) => i !== index));
                        setShowRoute(false);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              
              {routeWaypoints.length >= 2 && (
                <button style={styles.routeButton} onClick={handleStartRoute}>
                  🗺️ Calculate Route
                </button>
              )}
              
              <button style={styles.clearButton} onClick={handleClearRoute}>
                Clear All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}