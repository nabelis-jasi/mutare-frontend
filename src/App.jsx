import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import LandingPortal from "./components/LandingPortal";
import Splash from "./components/Splash";
import Signup from "./components/Signup";
import RequestAccess from "./components/RequestAccess";
import Login from "./components/Login";
import RoleSelection from "./components/RoleSelection";
import Header from "./components/common/Header";

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
  
  // Data states
  const [manholes, setManholes] = useState([]);
  const [pipes, setPipes] = useState([]);

  const handleSplashComplete = () => {
    console.log("Splash completed");
    setShowSplash(false);
  };

  // Handle role selection
  const handleRoleSelect = (roleId) => {
    console.log("Role selected:", roleId);
    setSelectedRole(roleId);
  };

  // Handle back to role selection
  const handleBackToRoles = () => {
    setSelectedRole(null);
    setActivePortal(null);
  };

  // Fetch data based on role
  const fetchData = async () => {
    try {
      // Fetch manholes from waste_water_manhole table
      const { data: manholesData, error: manholesError } = await supabase
        .from("waste_water_manhole")
        .select("*");
      
      if (manholesError) {
        console.error("Error fetching manholes:", manholesError);
      } else {
        setManholes(manholesData || []);
      }

      // Fetch pipes from waste_water_pipeline table
      const { data: pipesData, error: pipesError } = await supabase
        .from("waste_water_pipeline")
        .select("*");
      
      if (pipesError) {
        console.error("Error fetching pipes:", pipesError);
      } else {
        setPipes(pipesData || []);
      }
      
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // LOGIN
  const handleLogin = async (email, password) => {
    try {
      console.log("Login attempt for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;
      
      if (!profile.is_active) {
        alert("Your account is pending admin approval.");
        return;
      }

      // Check if the user's role matches the selected role
      if (profile.role !== selectedRole) {
        alert(`This account is registered as ${profile.role}. Please go back and select the correct role.`);
        return;
      }

      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("role", profile.role);
      localStorage.setItem("user_id", data.user.id);

      setRole(profile.role);
      setUserId(data.user.id);
      setIsAuthenticated(true);
      setSelectedRole(null);
      setActivePortal(null);
      
      // Fetch data after login
      await fetchData();
      
      console.log("Login successful, role:", profile.role);
      
    } catch (error) {
      alert(error.message);
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setRole(null);
      setUserId(null);
      setSelectedRole(null);
      setShowSplash(true);
      setActivePortal(null);
      setManholes([]);
      setPipes([]);
      localStorage.clear();
      console.log("Logged out");
    }
  };

  // CHECK SESSION ON LOAD
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();

        if (profile && profile.is_active) {
          setIsAuthenticated(true);
          setRole(profile.role);
          setUserId(data.session.user.id);
          setShowSplash(false);
          setSelectedRole(null);
          
          localStorage.setItem("access_token", data.session.access_token);
          localStorage.setItem("role", profile.role);
          localStorage.setItem("user_id", data.session.user.id);
          
          // Fetch data after session restore
          await fetchData();
          
          console.log("Session restored for role:", profile.role);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  // Add CSS to ensure body and html take full height
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      
      body {
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      }
      
      #root {
        display: block;
      }
      
      * {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Refresh data function
  const handleDataRefresh = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0fff0'
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #4caf50',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // SPLASH SCREEN
  if (showSplash) {
    console.log("Rendering splash");
    return <Splash onComplete={handleSplashComplete} />;
  }

  // AUTHENTICATED USERS - Show role-specific dashboards
  if (isAuthenticated) {
    console.log("Rendering authenticated view for role:", role);
    
    return (
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f0f2f5",
      }}>
        {/* Header */}
        <Header role={role} userId={userId} onLogout={handleLogout} />
        
        {/* Main Content */}
        <main style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Field Collector Dashboard */}
          {role === "field-collector" && (
            <CollectorDashboard 
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
            />
          )}
          
          {/* Field Operator Dashboard */}
          {role === "field-operator" && (
            <OperatorDashboard 
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
            />
          )}
          
          {/* Engineer Dashboard */}
          {role === "engineer" && (
            <EngineerDashboard 
              manholes={manholes}
              pipes={pipes}
              userId={userId}
              role={role}
              onDataRefresh={handleDataRefresh}
            />
          )}
          
          {/* Admin Dashboard */}
          {role === "admin" && (
            <div style={{ padding: "2rem", height: "100%", overflow: "auto" }}>
              <AdminApprove userId={userId} />
            </div>
          )}
          
          {/* Fallback for unknown role */}
          {!role && (
            <div style={{ padding: "2rem", height: "100%", overflow: "auto" }}>
              <h2>Dashboard</h2>
              <p>Select a role to continue</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Show Role Selection if no role is selected yet
  if (!selectedRole) {
    console.log("Rendering role selection");
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  // NOT AUTHENTICATED but role selected → Show Landing Portal with selected role
  console.log("Rendering landing portal with role:", selectedRole, "activePortal:", activePortal);
  
  if (activePortal === "login") {
    return <Login 
      selectedRole={selectedRole} 
      onLoginSuccess={handleLogin} 
      onBack={() => setActivePortal(null)} 
    />;
  }
  
  if (activePortal === "signup") {
    return <Signup 
      selectedRole={selectedRole} 
      onBack={() => setActivePortal(null)} 
    />;
  }
  
  if (activePortal === "request") {
    return <RequestAccess 
      selectedRole={selectedRole} 
      onBack={() => setActivePortal(null)} 
    />;
  }
  
  // Default: show LandingPortal with options
  return <LandingPortal 
    selectedRole={selectedRole} 
    setActivePortal={setActivePortal}
    onBackToRoles={handleBackToRoles}
  />;
}