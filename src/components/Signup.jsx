import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Signup({ selectedRole, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole || 'pending'
          }
        }
      });

      if (error) throw error;

      setMessage(
        "✅ Verification email sent! Please check your inbox and confirm your account."
      );

      setEmail("");
      setPassword("");
      
    } catch (error) {
      setMessage(`Error: ${error.message}`);
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

  const isSuccess = message.includes("✅");
  const isError = message.includes("Error");

  const styles = {
    wrapper: {
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f0fff0",
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
    container: {
      position: "relative",
      zIndex: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
      padding: "2.5rem",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
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
      backgroundColor: "#ff9800",
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
      backgroundColor: loading ? "#ccc" : "#ff9800",
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
      backgroundColor: isSuccess ? "#d4edda" : isError ? "#f8d7da" : "transparent",
      color: isSuccess ? "#155724" : isError ? "#721c24" : "#ff4444",
      border: isSuccess ? "1px solid #c3e6cb" : isError ? "1px solid #f5c6cb" : "none",
    },
    helpText: {
      marginTop: "1rem",
      fontSize: "0.9rem",
      color: "#666",
      textAlign: "center",
    }
  };

  return (
    <div style={styles.wrapper}>
      <img 
        src="/src/assets/Untitled design_20260319_161147_0000.png" 
        alt="" 
        style={styles.backgroundLogo}
      />
      
      <div style={styles.container}>
        <h2 style={styles.title}>Create Account</h2>
        
        {selectedRole && (
          <div style={styles.roleBadge}>
            {getRoleDisplay()}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSignup}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            onFocus={(e) => e.target.style.borderColor = "#ff9800"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            onFocus={(e) => e.target.style.borderColor = "#ff9800"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />

          <button 
            style={styles.button}
            type="submit" 
            disabled={loading}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#f57c00")}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#ff9800")}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
        
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
        
        <p style={styles.helpText}>
          Already have an account? Go back and login.
        </p>
      </div>
    </div>
  );
}