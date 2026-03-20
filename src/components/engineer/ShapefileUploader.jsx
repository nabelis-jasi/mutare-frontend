import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import shp from 'shpjs';

export default function ShapefileUploader({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [file, setFile] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
      setStatus('File selected: ' + selectedFile.name);
    } else {
      setStatus('Please select a .zip file containing shapefile');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first');
      return;
    }

    setUploading(true);
    setStatus('Reading shapefile...');

    try {
      // Read shapefile
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const geojson = await shp(arrayBuffer);
          
          setStatus(`Processing ${geojson.features.length} features...`);
          
          // Process features
          let manholesAdded = 0;
          let pipelinesAdded = 0;
          
          for (const feature of geojson.features) {
            if (feature.geometry.type === 'Point') {
              // Add to manholes table
              const { error } = await supabase
                .from('waste_water_manhole')
                .insert([{
                  geom: feature.geometry,
                  status: feature.properties.status || 'Good',
                  manhole_id: feature.properties.id || `MH_${Date.now()}_${manholesAdded}`,
                  created_at: new Date().toISOString()
                }]);
              
              if (!error) manholesAdded++;
            } 
            else if (feature.geometry.type === 'LineString') {
              // Add to pipelines table
              const { error } = await supabase
                .from('waste_water_pipeline')
                .insert([{
                  geom: feature.geometry,
                  status: feature.properties.status || 'Good',
                  pipe_id: feature.properties.id || `PL_${Date.now()}_${pipelinesAdded}`,
                  pipe_mat: feature.properties.material || 'Unknown',
                  length: feature.properties.length || 0,
                  created_at: new Date().toISOString()
                }]);
              
              if (!error) pipelinesAdded++;
            }
          }
          
          setStatus(`✅ Upload complete! Added ${manholesAdded} manholes and ${pipelinesAdded} pipelines.`);
          onUploadComplete();
          
        } catch (err) {
          setStatus(`❌ Error processing shapefile: ${err.message}`);
        } finally {
          setUploading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      setUploading(false);
    }
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "350px",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
    },
    header: {
      padding: "1rem",
      backgroundColor: "#4caf50",
      color: "white",
      fontWeight: "bold",
    },
    content: {
      padding: "1rem",
    },
    fileInput: {
      width: "100%",
      padding: "0.5rem",
      marginBottom: "0.5rem",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      backgroundColor: "#4caf50",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1rem",
    },
    status: {
      marginTop: "1rem",
      padding: "0.5rem",
      borderRadius: "4px",
      fontSize: "0.9rem",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        📤 Upload Shapefile/CSV
      </div>
      <div style={styles.content}>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          style={styles.fileInput}
          disabled={uploading}
        />
        <button 
          style={styles.button} 
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? "Uploading..." : "Upload Shapefile"}
        </button>
        {status && (
          <div style={styles.status}>{status}</div>
        )}
      </div>
    </div>
  );
}