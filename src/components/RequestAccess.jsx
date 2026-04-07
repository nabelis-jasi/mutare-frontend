// src/components/RequestAccess.jsx
import React, { useState } from "react";
import api from "../api/api"; // our axios client

export default function RequestAccess({ selectedRole, onBack }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setStatus("Please enter your email");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      // Call backend endpoint to create access request
      await api.post("/access-requests", {
        email: email.trim(),
        role_requested: selectedRole || 'pending',
      });
      setStatus("✅ Request sent! You'll be notified when approved.");
      setEmail("");
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message;
      if (error.response?.status === 404) {
        setStatus(
          "⚠️ Access request system is being set up. Please contact admin directly."
        );
      } else {
        setStatus(`Error: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = () => {
    if (!selectedRole) return "";
    switch(selectedRole) {
      case "field-collector": return "Field Collector";
      case "field-operator": return "Field Operator";
      case "engineer": return "Engineer";
      default: return selectedRole.replace("-", " ");
    }
  };

  const isSuccess = status.includes("✅");
  const isWarning = status.includes("⚠️");
  const isError = status.includes("Error");

  const styles = {
    wrapper: {
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#6ff86f",
      position: "relative",
      overflow: "hidden",
      margin: 0,
      padding: 0,
    },
    container: {
      position: "relative",
      zIndex: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
      padding: "2.5rem",
      backgroundColor: "rgba(86, 239, 127, 0.95)",
      borderRadius: "16px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
      width: "400px",
      maxWidth: "90vw",
      backdropFilter: "blur(10px)",
    },
    title: {
      fontSize: "2rem",
      color: "#2c3e50",
      marginBottom: "0.5rem",
      textAlign: "center",
      fontWeight: "bold",
    },
    roleBadge: {
      backgroundColor: "#f44336",
      color: "white",
      padding: "0.5rem 1rem",
      borderRadius: "20px",
      fontSize: "1rem",
      fontWeight: "500",
      marginBottom: "1rem",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      width: "100%",
    },
    input: {
      padding: "1rem",
      fontSize: "1rem",
      borderRadius: "8px",
      border: "1px solid #ddd",
      outline: "none",
      width: "100%",
      transition: "border-color 0.3s, box-shadow 0.3s",
      backgroundColor: "white",
    },
    button: {
      padding: "1rem",
      fontSize: "1.1rem",
      fontWeight: "bold",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: loading ? "not-allowed" : "pointer",
      transition: "all 0.3s ease",
      width: "100%",
      marginTop: "0.5rem",
      backgroundColor: loading ? "#ccc" : "#f44336",
      opacity: loading ? 0.7 : 1,
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
      width: "100%",
      marginTop: "0.5rem",
    },
    message: {
      marginTop: "0.5rem",
      fontSize: "0.9rem",
      textAlign: "center",
      maxWidth: "300px",
      wordBreak: "break-word",
      padding: "0.5rem",
      borderRadius: "4px",
      backgroundColor: isSuccess ? "#d4edda" : isWarning ? "#fff3cd" : isError ? "#f8d7da" : "transparent",
      color: isSuccess ? "#155724" : isWarning ? "#856404" : isError ? "#721c24" : "#ff4444",
      border: isSuccess ? "1px solid #c3e6cb" : isWarning ? "1px solid #ffeeba" : isError ? "1px solid #f5c6cb" : "none",
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* No background logo */}
      <div style={styles.container}>
        <h2 style={styles.title}>Request Access</h2>
        
        {selectedRole && (
          <div style={styles.roleBadge}>
            Requesting: {getRoleDisplay()}
          </div>
        )}

        <form style={styles.form} onSubmit={handleRequest}>
          <input
            style={styles.input}
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            onFocus={(e) => e.target.style.borderColor = "#f44336"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />
          
          <button 
            style={styles.button}
            type="submit" 
            disabled={loading}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#d32f2f")}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#f44336")}
          >
            {loading ? "Sending..." : "Request Access"}
          </button>
        </form>

        {status && <p style={styles.message}>{status}</p>}
        
        {onBack && (
          <button 
            style={styles.backButton} 
            onClick={onBack}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#7f8c8d"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#95a5a6"}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
