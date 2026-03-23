// src/components/common/Header.jsx
import React from 'react';

export default function Header({ role, userId, onLogout }) {
  const getRoleDisplay = () => {
    switch(role) {
      case 'field-collector': return 'Field Collector';
      case 'field-operator': return 'Field Operator';
      case 'engineer': return 'Engineer';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  return (
    <header style={{
      height: "60px",
      backgroundColor: "white",
      borderBottom: "2px solid #e0e0e0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <img 
          src="/src/assets/logo.png" 
          alt="Logo" 
          style={{ height: "40px", width: "40px", objectFit: "contain" }}
        />
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>WASTEWATER GIS</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{
          backgroundColor: "#e8f5e8",
          color: "#2c3e50",
          padding: "0.4rem 1rem",
          borderRadius: "20px",
          fontSize: "0.9rem",
          fontWeight: "500",
          border: "1px solid #4caf50",
        }}>
          👤 {getRoleDisplay()}
        </span>
        <button 
          onClick={onLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#c82333"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#dc3545"}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
