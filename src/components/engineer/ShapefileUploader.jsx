import React, { useState, useMemo } from 'react';
import shp from 'shpjs';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
// Updated imports for TanStack Table v8
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender 
} from '@tanstack/react-table';

export default function ShapefileUploader({ onUploadComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [layerName, setLayerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const map = useMap();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && (f.name.endsWith('.zip') || f.name.endsWith('.shp'))) {
      setFile(f);
      setError('');
    } else {
      setFile(null);
      setError('Please select a .zip or .shp file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const geojsonData = await shp(buffer);
      setGeojson(geojsonData);

      if (map) {
        const layer = L.geoJSON(geojsonData, {
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = Object.entries(feature.properties)
                .map(([k, v]) => `<strong>${k}</strong>: ${v}`)
                .join('<br>');
              layer.bindPopup(props);
            }
          }
        }).addTo(map);
        map.fitBounds(layer.getBounds());
      }
      
      setUploading(false);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setError('Failed to parse shapefile: ' + err.message);
      setUploading(false);
    }
  };

  // Internal Attribute Table Component using TanStack Table v8
  const AttributeTable = ({ data }) => {
    if (!data || !data.features || data.features.length === 0) return null;

    const columns = useMemo(() => {
      const firstFeature = data.features[0];
      if (!firstFeature.properties) return [];
      return Object.keys(firstFeature.properties).map(key => ({
        header: key,
        accessorKey: `properties.${key}`, // Use accessorKey for deep nested access
      }));
    }, [data]);

    const tableData = useMemo(() => data.features, [data]);

    // Initialize the v8 Table
    const table = useReactTable({
      data: tableData,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div style={{ marginTop: '1rem', maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f2f2f2', zIndex: 1 }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="wd-panel" style={{ width: 500, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <div className="wd-panel-header" style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
        <span style={{ fontWeight: 'bold' }}>📤 Upload Shapefile</span>
        <button className="wd-panel-close" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>
      <div className="wd-panel-body" style={{ padding: '15px' }}>
        <div className="wd-form-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Shapefile (.zip or .shp)</label>
          <input type="file" accept=".zip,.shp" onChange={handleFileChange} style={{ width: '100%' }} />
        </div>
        <div className="wd-form-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Layer Name (optional)</label>
          <input 
            type="text" 
            value={layerName} 
            onChange={e => setLayerName(e.target.value)} 
            placeholder="e.g., New Layer" 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <button 
          className="wd-btn wd-btn-primary" 
          onClick={handleUpload} 
          disabled={uploading || !file}
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: (uploading || !file) ? 'not-allowed' : 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload & Add to Map'}
        </button>
        {error && <div className="wd-status err" style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>{error}</div>}
        {geojson && <Attribute
