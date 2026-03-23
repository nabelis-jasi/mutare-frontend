import React, { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";
import RequestAccess from "./RequestAccess";

// Define styles
const styles = {
  landingWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    gap: "2rem",
    backgroundColor: "#cffbcf",
    position: "relative",
    overflow: "hidden",
    margin: 0,
    padding: 0,
  },
  backgroundLogo: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.20,
    pointerEvents: "none",
    zIndex: 1,
    objectFit: "cover",
  },
  contentContainer: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2rem",
    width: "100%",
    maxWidth: "400px",
    padding: "2rem",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  },
  roleBadge: {
    backgroundColor: "#4caf50",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "1rem",
    fontWeight: "500",
    marginBottom: "0.5rem",
  },
  welcomeTitle: {
    fontSize: "2rem",
    color: "#2c3e50",
    marginBottom: "0.5rem",
    textAlign: "center",
    fontWeight: "bold",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
  },
  landingButton: {
    padding: "1rem",
    fontSize: "1.2rem",
    fontWeight: "bold",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
    width: "100%",
  },
  backButton: {
    padding: "0.8rem",
    fontSize: "1rem",
    fontWeight: "bold",
    backgroundColor: "#95a5a6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginTop: "1rem",
    width: "100%",
  },
  formWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#f0fff0",
    position: "relative",
  },
  formBackButton: {
    position: "absolute",
    top: "1rem",
    left: "1rem",
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    fontWeight: "bold",
    backgroundColor: "#79f37d",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.3s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    zIndex: 3,
  }
};

export default function LandingPortal({ selectedRole, setActivePortal, onBackToRoles }) {
  const [activeTab, setActiveTab] = useState(null); // "login", "signup", "request"

  const getRoleDisplay = () => {
    switch(selectedRole) {
      case "field-collector": return "Field Collector";
      case "field-operator": return "Field Operator";
      case "engineer": return "Engineer";
      default: return selectedRole ? selectedRole.replace("-", " ") : "Unknown";
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActivePortal(tab);
  };

  const handleBack = () => {
    setActiveTab(null);
    setActivePortal(null);
  };

  const renderForm = () => {
    switch (activeTab) {
      case "login":
        return (
          <div style={styles.formWrapper}>
            <button style={styles.formBackButton} onClick={handleBack}>
              ← Back
            </button>
            <Login 
              selectedRole={selectedRole} 
              onBack={handleBack}
            />
          </div>
        );
      case "signup":
        return (
          <div style={styles.formWrapper}>
            <button style={styles.formBackButton} onClick={handleBack}>
              ← Back
            </button>
            <Signup 
              selectedRole={selectedRole} 
              onBack={handleBack}
            />
          </div>
        );
      case "request":
        return (
          <div style={styles.formWrapper}>
            <button style={styles.formBackButton} onClick={handleBack}>
              ← Back
            </button>
            <RequestAccess 
              selectedRole={selectedRole} 
              onBack={handleBack}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (activeTab) return renderForm();

  return (
    <div style={styles.landingWrapper}>
      {/* Full screen faint background logo */}
      <img 
        src="/src/assets/logo.png" 
        alt="" 
        style={styles.backgroundLogo}
      />
      
      {/* Content overlay */}
      <div style={styles.contentContainer}>
        <h2 style={styles.welcomeTitle}>Welcome</h2>
        
        {selectedRole && (
          <div style={styles.roleBadge}>
            Role: {getRoleDisplay()}
          </div>
        )}
        
        <div style={styles.buttonContainer}>
          <button 
            style={{ ...styles.landingButton, backgroundColor: "#0fcb16" }} 
            onClick={() => handleTabChange("login")}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 8px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            Login
          </button>
          <button 
            style={{ ...styles.landingButton, backgroundColor: "rgb(166, 246, 18)", color: "#333" }} 
            onClick={() => handleTabChange("signup")}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 8px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            Sign Up
          </button>
          <button 
            style={{ ...styles.landingButton, backgroundColor: "#fc5e0a" }} 
            onClick={() => handleTabChange("request")}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 8px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            Request Access
          </button>
        </div>

        {onBackToRoles && (
          <button 
            style={styles.backButton}
            onClick={onBackToRoles}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#7f8c8d";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#95a5a6";
            }}
          >
            ← Change Role
          </button>
        )}
      </div>
    </div>
  );
}
