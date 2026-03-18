import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Splash from "./components/Splash";
import RequestAccess from "./components/RequestAccess";
import Signup from "./components/Signup";
import AdminApprove from "./components/AdminApprove";

export default function App() {
  // Vite env vars (optional) — show a non-blocking warning if missing
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const missingEnv = !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY;

  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Continue from splash screen
  const handleSplashContinue = () => setShowSplash(false);

  // Handle login with Supabase JWT
  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return alert(error.message);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) return alert(profileError.message);

    if (!profile.is_active) {
      return alert("Your account is pending admin approval.");
    }

    // Store JWT and role
    localStorage.setItem("access_token", data.session.access_token);
    localStorage.setItem("role", profile.role);

    setRole(profile.role);
    setUserId(data.user.id);
    setIsAuthenticated(true);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole(null);
    setUserId(null);
    setShowSplash(true);
    localStorage.clear();
  };

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthenticated(true);
        setRole(localStorage.getItem("role"));
        setUserId(data.session.user.id);
        setShowSplash(false);
      }
    });
  }, []);

  // Decide inner content based on state, then render wrapper with optional banner
  let inner = null;
  if (showSplash) inner = <Splash onContinue={handleSplashContinue} />;
  else if (showRequestAccess) inner = <RequestAccess onBack={() => setShowRequestAccess(false)} />;
  else if (showSignup) inner = <Signup onSignupComplete={() => setShowSignup(false)} />;
  else if (!isAuthenticated)
    inner = (
      <div>
        <Login onLogin={handleLogin} />
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={() => setShowSignup(true)}>Sign Up</button>
          <button onClick={() => setShowRequestAccess(true)}>Request Access</button>
        </div>
      </div>
    );
  else if (role === "admin") inner = <AdminApprove />;
  else
    inner = (
      <div className={`app-container role-${role}`}>
        <header className="app-header">
          <h1>WASTEWATER GIS</h1>
          <div className="header-controls">
            <span className="current-role">Role: {role ? role.replace("-", " ") : "unknown"}</span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </header>
        <main className="app-main">
          <Dashboard role={role} userId={userId} />
        </main>
      </div>
    );

  return (
    <div>
      {missingEnv && (
        <div style={{ background: "#331", color: "#fff", padding: "0.75rem 1rem", textAlign: "center" }}>
          Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — functionality that talks to Supabase will be disabled. Set these in your dev `.env` or in Render.
        </div>
      )}
      {inner}
    </div>
  );
}