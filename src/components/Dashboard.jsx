import React, { useState, useEffect } from "react";
import MapView from "./MapView";
import ManholeList from "./ManholeList";
import PipeList from "./PipelineList";
import { supabase } from "../supabaseClient";
import "../style/Dashboard.css";

export default function Dashboard({ role, userId }) {
  const [manholes, setManholes] = useState([]);
  const [pipes, setPipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data based on role
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch manholes from waste_water_manhole table
        const { data: manholesData, error: manholesError } = await supabase
          .from("waste_water_manhole")
          .select("*");
        
        if (manholesError) {
          console.error("Error fetching manholes:", manholesError);
          setError(`Manholes error: ${manholesError.message}`);
        } else {
          setManholes(manholesData || []);
        }

        // Fetch pipes from waste_water_pipeline table
        const { data: pipesData, error: pipesError } = await supabase
          .from("waste_water_pipeline")
          .select("*");
        
        if (pipesError) {
          console.error("Error fetching pipes:", pipesError);
          setError(`Pipes error: ${pipesError.message}`);
        } else {
          setPipes(pipesData || []);
        }
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [role, userId]);

  // Role-specific messages
  const roleMessages = {
    "field-collector": "📱 You can collect data and flag points or lines",
    "field-operator": "🔧 You can update status and maintenance records",
    "engineer": "📊 Full access: edit, upload, delete, and manage flags",
    "admin": "👑 Admin access: approve users and manage all data",
    "pending": "⏳ Your account is pending approval"
  };

  // Role-specific actions
  const renderRoleActions = () => {
    switch (role) {
      case "field-collector":
        return (
          <div className="role-actions">
            <button className="action-btn collect-btn">📍 Collect Data</button>
            <button className="action-btn flag-btn">🚩 Flag Issue</button>
            <button className="action-btn sync-btn">🔄 Sync Data</button>
          </div>
        );
      case "field-operator":
        return (
          <div className="role-actions">
            <button className="action-btn status-btn">📝 Update Status</button>
            <button className="action-btn maintain-btn">🔧 Maintenance</button>
            <button className="action-btn sync-btn">🔄 Sync Updates</button>
          </div>
        );
      case "engineer":
        return (
          <div className="role-actions">
            <button className="action-btn edit-btn">✏️ Edit Records</button>
            <button className="action-btn upload-btn">📤 Upload Shapefile</button>
            <button className="action-btn delete-btn">🗑️ Delete Features</button>
            <button className="action-btn flag-btn">🏁 Save Flags</button>
          </div>
        );
      case "admin":
        return (
          <div className="role-actions">
            <button className="action-btn approve-btn">✅ Approve Users</button>
            <button className="action-btn manage-btn">👥 Manage Roles</button>
            <button className="action-btn config-btn">⚙️ System Config</button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className={`dashboard-layout role-${role}`}>
        {/* Left: Map */}
        <section className="map-section">
          <MapView manholes={manholes} pipes={pipes} />
        </section>

        {/* Right: Info Panel */}
        <section className="info-section">
          <div className="role-header">
            <h2>{role ? role.replace("-", " ").toUpperCase() : "DASHBOARD"}</h2>
            <p className="role-message">{roleMessages[role] || "Welcome to the dashboard"}</p>
          </div>

          {/* Role-specific actions */}
          {renderRoleActions()}

          {/* Data lists */}
          <div className="lists-section">
            <div className="list-header">
              <h3>Waste Water Manholes ({manholes.length})</h3>
              <ManholeList manholes={manholes} role={role} />
            </div>

            <div className="list-header">
              <h3>Waste Water Pipelines ({pipes.length})</h3>
              <PipeList pipes={pipes} role={role} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}