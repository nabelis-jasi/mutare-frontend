import React, { useState } from "react";
import { supabase } from "../supabaseClient";

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
      console.log("Login attempt for email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      console.log("Login successful, user:", data.user.id);
      setDebugInfo("Login successful! Checking profile...");

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          setDebugInfo(`Profile error: ${profileError.message}`);
          
          if (profileError.code === '42P01') {
            setMessage("Database tables not set up. Please run the SQL setup script in Supabase.");
            await supabase.auth.signOut();
            return;
          }
          throw profileError;
        }

        if (!profile) {
          setDebugInfo("No profile found, creating one...");
          
          const { error: insertError } = await supabase
            .from("profiles")
            .insert([{
              id: data.user.id,
              email: data.user.email,
              role: 'pending',
              is_active: false
            }]);

          if (insertError) {
            console.error("Profile creation error:", insertError);
            setDebugInfo(`Profile creation error: ${insertError.message}`);
            throw insertError;
          }

          setMessage("Account created! Please wait for admin approval.");
          await supabase.auth.signOut();
          return;
        }

        if (!profile.is_active) {
          setMessage("Your account is pending admin approval.");
          await supabase.auth.signOut();
          return;
        }

        if (profile.role !== selectedRole) {
          setMessage(`This account is registered as ${profile.role}. Please go back and select the correct role.`);
          await supabase.auth.signOut();
          return;
        }

        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("role", profile.role);
        localStorage.setItem("user_id", data.user.id);
        
        setMessage(`Welcome ${profile.role}! Login successful.`);
        
        if (onLoginSuccess) {
          onLoginSuccess(email, password);
        } else {
          window.location.reload();
        }
        
      } catch (profileErr) {
        console.error("Profile handling error:", profileErr);
        setMessage(`Profile error: ${profileErr.message}`);
      }

    } catch (error) {
      console.error("Login error:", error);
      
      if (error.message.includes("Invalid login credentials")) {
        setMessage("Invalid email or password");
      } else if (error.message.includes("Email not confirmed")) {
        setMessage("Please confirm your email address first");
      } else {
        setMessage(`Login failed: ${error.message}`);
      }
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
        src="/src/assets/Untitled design_20260319_161147_0000.png" 
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