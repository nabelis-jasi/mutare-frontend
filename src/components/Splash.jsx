import React, { useEffect } from 'react';
import logo from '../assets/logo.png'; // adjust path if Splash.jsx is not in src/components

export default function Splash({ onComplete }) {
  useEffect(() => {
    console.log("🔵 Splash mounted at:", new Date().toLocaleTimeString());
    
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      console.log("🟢 10 seconds elapsed - calling onComplete at:", new Date().toLocaleTimeString());
      onComplete();
    }, 10000);

    // Cleanup timer if component unmounts
    return () => {
      console.log("🔴 Splash unmounted - clearing timer");
      clearTimeout(timer);
    };
  }, [onComplete]);

  // Manual click handler for testing
  const handleClick = () => {
    console.log("👆 Manual click - calling onComplete");
    onComplete();
  };

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        cursor: "pointer",
      }}
      onClick={handleClick}
    >
      <img 
        src={logo}   // ✅ uses imported image
        alt="Logo" 
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div style={{
        position: "absolute",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#666",
        fontSize: "1rem",
        backgroundColor: "rgba(255,255,255,0.8)",
        padding: "8px 16px",
        borderRadius: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        Loading...
      </div>
    </div>
  );
}