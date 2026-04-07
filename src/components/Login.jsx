import React, { useState } from "react";
import api from "../api/api";  // our axios client (to be created)

export default function Login({ selectedRole, onLoginSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setDebugInfo("");

    if (!email || !password) {
      setMessage("Please enter both email and password");
      return;
    }

    setLoading(true);
    setDebugInfo("Attempting login...");

    try {
      // 1. Call /token with OAuth2 form data
      const formData = new URLSearchParams();
      formData.append("username", email.trim());
      formData.append("password", password);

      const tokenRes = await api.post("/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const { access_token } = tokenRes.data;
      localStorage.setItem("token", access_token);
      setDebugInfo("Token obtained. Fetching user profile...");

      // 2. Get user profile from /me
      const userRes = await api.get("/me");
      const user = userRes.data;
      setDebugInfo(`Profile loaded. Role: ${user.role}, Active: ${user.is_active}`);

      // 3. Validate role and active status
      if (!user.is_active) {
        setMessage("Your account is pending admin approval.");
        localStorage.removeItem("token");
        return;
      }

      if (user.role !== selectedRole) {
        setMessage(`This account is registered as ${user.role}. Please go back and select the correct role.`);
        localStorage.removeItem("token");
        return;
      }

      // 4. Store user info and succeed
      localStorage.setItem("user", JSON.stringify(user));
      setMessage(`Welcome ${user.role}! Login successful.`);

      if (onLoginSuccess) {
        onLoginSuccess(user);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Login error:", error);
      setDebugInfo(`Error: ${error.message}`);

      if (error.response?.status === 401) {
        setMessage("Invalid email or password");
      } else if (error.response?.status === 403) {
        setMessage("Account not active or insufficient permissions");
      } else {
        setMessage(`Login failed: ${error.message}`);
      }
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = () => {
    switch(selectedRole) {
      case "field-collector": return "Field Collector";
      case "field-operator": return "Field Operator";
      case "engineer": return "Engineer";
      case "admin": return "Admin";
      default: return selectedRole ? selectedRole.replace("-", " ") : "Unknown";
    }
  };

  const isSuccess = message?.includes("Welcome") || message?.includes("successful");
  const isError = message?.includes("Invalid") || message?.includes("failed") || message?.includes("pending") || message?.includes("Error");

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
      backgroundColor: "#4caf50",
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
      backgroundColor: loading ? "#ccc" : "#4caf50",
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
    debugInfo: {
      marginTop: "0.5rem",
      fontSize: "0.8rem",
      color: "#666",
      textAlign: "left",
      maxWidth: "300px",
      wordBreak: "break-word",
      backgroundColor: "#f5f5f5",
      padding: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ddd",
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
        src="/src/assets/logo.png" 
        alt="" 
        style={styles.backgroundLogo}
      />
      
      <div style={styles.container}>
        <h2 style={styles.title}>Welcome Back</h2>
        
        {selectedRole && (
          <div style={styles.roleBadge}>
            {getRoleDisplay()}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            onFocus={(e) => e.target.style.borderColor = "#4caf50"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            onFocus={(e) => e.target.style.borderColor = "#4caf50"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />

          <button 
            style={styles.button}
            type="submit" 
            disabled={loading}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#45a049")}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#4caf50")}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
        {debugInfo && <pre style={styles.debugInfo}>{debugInfo}</pre>}
        
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
          Don't have an account? Go back and sign up.
        </p>
      </div>
    </div>
  );
}
