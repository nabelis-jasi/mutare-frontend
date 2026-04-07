// src/components/RoleSelection.jsx
import React from "react";

export default function RoleSelection({ onSelectRole }) {
  const roles = [
    {
      id: "field-collector",
      title: "Field Collector",
      description: "Collect data and flag points or lines",
      icon: "📱",
      color: "#4caf50",
    },
    {
      id: "field-operator",
      title: "Field Operator",
      description: "Update status and maintenance records",
      icon: "🔧",
      color: "#ff9800",
    },
    {
      id: "engineer",
      title: "Engineer",
      description: "Full access: edit, upload, delete, and manage flags",
      icon: "📊",
      color: "#2196f3",
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* No logo component – just title */}
        <h1 style={styles.title}>Wastewater GIS</h1>
        <p style={styles.subtitle}>Select your role to continue</p>
        
        <div style={styles.rolesGrid}>
          {roles.map((role) => (
            <button
              key={role.id}
              style={styles.roleCard}
              onClick={() => onSelectRole(role.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              }}
            >
              <div style={styles.roleIcon}>{role.icon}</div>
              <h3 style={styles.roleTitle}>{role.title}</h3>
              <p style={styles.roleDescription}>{role.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4ff24f",
    overflow: "hidden",
    margin: 0,
    padding: 0,
  },
  content: {
    position: "relative",
    zIndex: 2,
    maxWidth: "1200px",
    width: "90%",
    padding: "2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    color: "#2c3e50",
    marginBottom: "0.5rem",
    fontWeight: "600",
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#666",
    marginBottom: "3rem",
  },
  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
    marginTop: "2rem",
  },
  roleCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem",
    backgroundColor: "white",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    width: "100%",
    textAlign: "center",
  },
  roleIcon: {
    fontSize: "4rem",
    marginBottom: "1rem",
  },
  roleTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#333",
    marginBottom: "0.5rem",
  },
  roleDescription: {
    fontSize: "0.95rem",
    color: "#666",
    lineHeight: "1.5",
    margin: 0,
  },
};
