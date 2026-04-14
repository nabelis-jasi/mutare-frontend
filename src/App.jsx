// src/App.jsx
import React, { useState, useEffect } from "react";
import api from "./api/api";
import Splash from "./components/Splash";
import RoleSelection from "./components/RoleSelection";
import EngineerDashboard from "./components/engineer/EngineerDashboard";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId] = useState("demo-user-123");

  const [manholes, setManholes] = useState([]);
  const [pipes, setPipes] = useState([]);

  const handleSplashComplete = () => setShowSplash(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [manholesRes, pipesRes] = await Promise.all([
        api.get("/manholes"),
        api.get("/pipelines")
      ]);
      setManholes(manholesRes.data || []);
      setPipes(pipesRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDataRefresh = () => fetchData();

  // Global styles
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

  // Clear any old auth data that might cause issues
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (!role) {
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  // Only engineer role is supported now
  if (role !== "engineer") {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <p>Only engineer dashboard is available in this version.</p>
        <button onClick={() => setRole(null)}>Go back</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f0f2f5"
    }}>
      <main style={{ flex: 1, overflow: "hidden" }}>
        <EngineerDashboard
          manholes={manholes}
          pipes={pipes}
          userId={userId}
          role={role}
          onDataRefresh={handleDataRefresh}
        />
      </main>
    </div>
  );
}
