import React from 'react';
import L from 'leaflet';

export default function MapControls({ map, onZoomIn, onZoomOut, onCenter }) {
  const styles = {
    container: {
      position: "absolute",
      top: "20px",
      left: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: 1000,
    },
    button: {
      width: "40px",
      height: "40px",
      backgroundColor: "white",
      border: "1px solid #ccc",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.button} onClick={onZoomIn} title="Zoom In">+</button>
      <button style={styles.button} onClick={onZoomOut} title="Zoom Out">-</button>
      <button style={styles.button} onClick={onCenter} title="Center Map">🎯</button>
    </div>
  );
}