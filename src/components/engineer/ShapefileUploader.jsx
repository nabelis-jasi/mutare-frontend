// src/components/engineer/ShapefileUploader.jsx
import React, { useState, useRef } from 'react';
import shp from 'shpjs';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTable } from '@tanstack/react-table';

export default function ShapefileUploader({ onUploadComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [layerName, setLayerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const map = useMap(); // requires MapView to be a child of MapContainer

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
      // Add to map
      if (map) {
        const layer = L.geoJSON(geojsonData, {
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = Object.entries(feature.properties).map(([k, v]) => `${k}: ${v}`).join('<br>');
              layer.bindPopup(props);
            }
          }
        }).addTo(map);
        // store layer reference if needed
      }
      setUploading(false);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setError('Failed to parse shapefile: ' + err.message);
      setUploading(false);
    }
  };

  // Attribute table using react-table
  const AttributeTable = ({ data }) => {
    if (!data || data.features.length === 0) return null;
    const columns = React.useMemo(() => {
      const firstFeature = data.features[0];
      if (!firstFeature.properties) return [];
      return Object.keys(firstFeature.properties).map(key => ({
        Header: key,
        accessor: (row) => row.properties[key],
      }));
    }, [data]);
    const tableData = React.useMemo(() => data.features, [data]);
    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns, data: tableData });
    return (
      <div style={{ marginTop: '1rem', maxHeight: '300px', overflow: 'auto' }}>
        <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps()} style={{ border: '1px solid #ddd', padding: '8px', background: '#f2f2f2' }}>
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="wd-panel" style={{ width: 500 }}>
      <div className="wd-panel-header">
        <span>📤 Upload Shapefile</span>
        <button className="wd-panel-close" onClick={onClose}>×</button>
      </div>
      <div className="wd-panel-body">
        <div className="wd-form-group">
          <label>Shapefile (.zip or .shp)</label>
          <input type="file" accept=".zip,.shp" onChange={handleFileChange} />
        </div>
        <div className="wd-form-group">
          <label>Layer Name (optional)</label>
          <input type="text" value={layerName} onChange={e => setLayerName(e.target.value)} placeholder="e.g., New Layer" />
        </div>
        <button className="wd-btn wd-btn-primary" onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload & Add to Map'}
        </button>
        {error && <div className="wd-status err">{error}</div>}
        {geojson && <AttributeTable data={geojson} />}
      </div>
    </div>
  );
}
