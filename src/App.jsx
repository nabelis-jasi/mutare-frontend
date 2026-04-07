// src/App.jsx
import React, { useState, useEffect } from "react";
import api from "./api/api";
import LandingPortal from "./components/LandingPortal";
import Splash from "./components/Splash";
import Signup from "./components/Signup";
import RequestAccess from "./components/RequestAccess";
import Login from "./components/Login";
import RoleSelection from "./components/RoleSelection";

// Role-based dashboards
import CollectorDashboard from "./components/fieldCollector/CollectorDashboard";
import OperatorDashboard from "./components/fieldOperator/OperatorDashboard";
import EngineerDashboard from "./components/engineer/EngineerDashboard";
import AdminApprove from "./components/AdminApprove";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activePortal, setActivePortal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [manholes, setManholes] = useState([]);
  const [pipes, setPipes] = useState([]);

  const handleSplashComplete = () => setShowSplash(false);

  const handleRoleSelect = (roleId) => setSelectedRole(roleId);

  const handleBackToRoles = () => {
    setSelectedRole(null);
    setActivePortal(null);
  };

  const fetchData = async () => {
    try {
      const [manholesRes, pipesRes] = await Promise.all([
        api.get("/manholes"),
        api.get("/pipelines")
      ]);
      setManholes(manholesRes.data || []);
      setPipes(pipesRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleLogin = async (user) => {
    // Called from Login component after successful authentication
    // user object contains { id, email, role, is_active, name }
    if (!user.is_active) {
      alert("Your account is pending admin approval.");
      return;
    }
    if (user.role !== selectedRole) {
      alert(`This account is registered as ${user.role}. Select the correct role.`);
      return;
    }
    setRole(user.role);
    setUserId(user.id);
    setIsAuthenticated(true);
    setSelectedRole(null);
    setActivePortal(null);
    await fetchData();
  };

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setRole(null);
    setUserId(null);
    setSelectedRole(null);
    setShowSplash(true);
    setActivePortal(null);
    setManholes([]);
    setPipes([]);
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Verify token is still valid by calling /me
          await api.get("/me");
          // If successful, set session
          setRole(user.role);
          setUserId(user.id);
          setIsAuthenticated(true);
          setShowSplash(false);
          await fetchData();
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // Global styles for full‑screen layout
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      * {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleDataRefresh = () => fetchData();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (isAuthenticated) {
    return (
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f0f2f5"
      }}>
        <main style={{ flex: 1, overflow: "hidden" }}>
          
          {role === "field-collector" && (
            <CollectorDashboard
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
              onLogout={handleLogout}
            />
          )}

          {role === "field-operator" && (
            <OperatorDashboard
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
              onLogout={handleLogout}
            />
          )}

          {role === "engineer" && (
            <EngineerDashboard
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
              onLogout={handleLogout}
            />
          )}

          {role === "admin" && (
            <div style={{ padding: "2rem", height: "100%", overflow: "auto" }}>
              <AdminApprove userId={userId} />
            </div>
          )}

        </main>
      </div>
    );
  }

  if (!selectedRole) {
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  if (activePortal === "login") {
    return (
      <Login
        selectedRole={selectedRole}
        onLoginSuccess={handleLogin}
        onBack={() => setActivePortal(null)}
      />
    );
  }

  if (activePortal === "signup") {
    return (
      <Signup
        selectedRole={selectedRole}
        onBack={() => setActivePortal(null)}
      />
    );
  }

  if (activePortal === "request") {
    return (
      <RequestAccess
        selectedRole={selectedRole}
        onBack={() => setActivePortal(null)}
      />
    );
  }

  return (
    <LandingPortal
      selectedRole={selectedRole}
      setActivePortal={setActivePortal}
      onBackToRoles={handleBackToRoles}
    />
  );
}
