import React from 'react';
import { LayersControl, TileLayer } from "react-leaflet";

export default function BaseLayers({ selectedLayer, onLayerChange }) {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer 
        checked={selectedLayer === 'street'} 
        name="OpenStreetMap"
      >
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer 
        checked={selectedLayer === 'hybrid'} 
        name="Hybrid (Google)"
      >
        <TileLayer
          attribution='Google'
          url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0','mt1','mt2','mt3']}
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer 
        checked={selectedLayer === 'satellite'} 
        name="Satellite (Esri)"
      >
        <TileLayer 
          attribution="Tiles &copy; Esri" 
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Topographic">
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}