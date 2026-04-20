// ============================================
// MAPVIEW.JS - Leaflet Map Component
// Handles all map rendering, layers, markers
// ============================================

// Tile layer definitions
const TILES = {
    osm: {
        id: "osm",
        label: "Street",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    },
    satellite: {
        id: "satellite",
        label: "Satellite",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr: "Tiles &copy; Esri",
        maxZoom: 19
    },
    topo: {
        id: "topo",
        label: "Topographic",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attr: "Map data &copy; OSM | Style &copy; OpenTopoMap",
        maxZoom: 17
    }
};

// Global variables
let map;
let currentMarkers = [];
let currentLines = [];
let currentPolygons = [];
let activeTileLayers = {};
let heatLayer = null;

// Color functions
function getManholeColor(status) {
    if (!status) return "#28a745";
    const s = String(status).toLowerCase();
    if (s.includes("critical") || s.includes("blocked")) return "#dc3545";
    if (s.includes("warning") || s.includes("maintenance")) return "#ffc107";
    return "#28a745";
}

function getPipeColor(status) {
    if (!status) return "#2b7bff";
    const s = String(status).toLowerCase();
    if (s.includes("blocked") || s.includes("critical")) return "#dc3545";
    if (s.includes("warning")) return "#ffc107";
    return "#2b7bff";
}

// Custom manhole icon
function createManholeIcon(color, size = 22) {
    return L.divIcon({
        className: "custom-marker",
        html: '<div style="' +
            'background-color: ' + color + ';' +
            'width: ' + size + 'px;' +
            'height: ' + size + 'px;' +
            'border-radius: 50%;' +
            'border: 2px solid white;' +
            'box-shadow: 0 2px 4px rgba(0,0,0,0.3);' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
            'font-size: ' + (size/2) + 'px;' +
            'font-weight: bold;' +
        '">🕳️</div>',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -(size/2 + 4)]
    });
}

// Initialize map
function initMap(centerLat, centerLng, zoom) {
    centerLat = centerLat || -18.9735;
    centerLng = centerLng || 32.6705;
    zoom = zoom || 13;
    
    map = L.map('map').setView([centerLat, centerLng], zoom);
    
    // Add default base layer
    activeTileLayers.osm = L.tileLayer(TILES.osm.url, {
        attribution: TILES.osm.attr,
        maxZoom: TILES.osm.maxZoom
    }).addTo(map);
    
    // Add scale bar
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
    
    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    // Track mouse position
    map.on('mousemove', function(e) {
        var coordStatus = document.getElementById('coordStatus');
        if (coordStatus) {
            coordStatus.innerHTML = 'LAT: ' + e.latlng.lat.toFixed(6) + ' | LNG: ' + e.latlng.lng.toFixed(6) + ' | ZOOM: ' + map.getZoom();
        }
    });
    
    return map;
}

// Switch base map
function switchBaseMap(tileId) {
    // Remove all existing tile layers
    for (var key in activeTileLayers) {
        if (activeTileLayers[key] && activeTileLayers[key].remove) {
            activeTileLayers[key].remove();
        }
    }
    activeTileLayers = {};
    
    // Add the selected tile layer
    var tile = TILES[tileId];
    if (tile) {
        activeTileLayers[tileId] = L.tileLayer(tile.url, {
            attribution: tile.attr,
            maxZoom: tile.maxZoom
        }).addTo(map);
    }
}

// Load manholes (point layer)
function loadManholes(manholes) {
    // Clear existing markers
    for (var i = 0; i < currentMarkers.length; i++) {
        if (currentMarkers[i] && currentMarkers[i].remove) {
            currentMarkers[i].remove();
        }
    }
    currentMarkers = [];
    
    if (!manholes || manholes.length === 0) return;
    
    for (var j = 0; j < manholes.length; j++) {
        var m = manholes[j];
        if (m.lat && m.lng) {
            var color = getManholeColor(m.status);
            var marker = L.marker([m.lat, m.lng], {
                icon: createManholeIcon(color, 22)
            });
            
            var popupContent = '<div style="min-width: 200px;">' +
                '<h4 style="color: #228B22; margin-bottom: 8px;">🕳️ ' + (m.asset_code || m.name || 'Manhole') + '</h4>' +
                '<table style="width:100%; font-size:12px;">' +
                '<tr><td><b>ID:</b></td><td>' + (m.id || 'N/A') + '</td></tr>' +
                '<tr><td><b>Suburb:</b></td><td>' + (m.suburb || 'N/A') + '</td></tr>' +
                '<tr><td><b>Diameter:</b></td><td>' + (m.diameter ? m.diameter + ' mm' : 'N/A') + '</td></tr>' +
                '<tr><td><b>Status:</b></td><td style="color:' + color + '">' + (m.status || 'Normal') + '</td></tr>' +
                '<tr><td><b>Blockages:</b></td><td>' + (m.blockages || 0) + '</td></tr>' +
                '</table>' +
                '<button onclick="window.zoomToAsset(' + m.lat + ', ' + m.lng + ')" style="margin-top:8px; width:100%; background:#1a3a1a; border:1px solid #228B22; color:#228B22; padding:4px; border-radius:4px; cursor:pointer;">ZOOM TO</button>' +
                '</div>';
            
            marker.bindPopup(popupContent);
            marker.addTo(map);
            currentMarkers.push(marker);
        }
    }
}

// Load pipelines (line layer)
function loadPipelines(pipelines) {
    // Clear existing lines
    for (var i = 0; i < currentLines.length; i++) {
        if (currentLines[i] && currentLines[i].remove) {
            currentLines[i].remove();
        }
    }
    currentLines = [];
    
    if (!pipelines || pipelines.length === 0) return;
    
    for (var j = 0; j < pipelines.length; j++) {
        var p = pipelines[j];
        if (p.coordinates && p.coordinates.length >= 2) {
            var color = getPipeColor(p.status);
            var polyline = L.polyline(p.coordinates, {
                color: color,
                weight: 5,
                opacity: 0.9
            });
            
            var popupContent = '<div style="min-width: 200px;">' +
                '<h4 style="color: #228B22; margin-bottom: 8px;">📏 ' + (p.asset_code || p.name || 'Pipeline') + '</h4>' +
                '<table style="width:100%; font-size:12px;">' +
                '<tr><td><b>ID:</b></td><td>' + (p.id || 'N/A') + '</td></tr>' +
                '<tr><td><b>Diameter:</b></td><td>' + (p.diameter ? p.diameter + ' mm' : 'N/A') + '</td></tr>' +
                '<tr><td><b>Material:</b></td><td>' + (p.material || 'N/A') + '</td></tr>' +
                '<tr><td><b>Status:</b></td><td style="color:' + color + '">' + (p.status || 'Normal') + '</td></tr>' +
                '</table>' +
                '</div>';
            
            polyline.bindPopup(popupContent);
            polyline.addTo(map);
            currentLines.push(polyline);
        }
    }
}

// Load suburbs (polygon layer)
function loadSuburbs(suburbs) {
    // Clear existing polygons
    for (var i = 0; i < currentPolygons.length; i++) {
        if (currentPolygons[i] && currentPolygons[i].remove) {
            currentPolygons[i].remove();
        }
    }
    currentPolygons = [];
    
    if (!suburbs || suburbs.length === 0) return;
    
    for (var j = 0; j < suburbs.length; j++) {
        var s = suburbs[j];
        if (s.coordinates && s.coordinates.length >= 3) {
            var polygon = L.polygon(s.coordinates, {
                color: "#228B22",
                weight: 2,
                fillColor: "#228B22",
                fillOpacity: 0.15
            });
            
            var popupContent = '<div>' +
                '<h4 style="color: #228B22;">🏘️ ' + (s.name || 'Suburb') + '</h4>' +
                '<p>Area: ' + (s.area ? s.area.toFixed(2) + ' km²' : 'N/A') + '</p>' +
                '<p>Assets: ' + (s.asset_count || 0) + '</p>' +
                '<p>Blockages: ' + (s.blockages || 0) + '</p>' +
                '</div>';
            
            polygon.bindPopup(popupContent);
            polygon.addTo(map);
            currentPolygons.push(polygon);
        }
    }
}

// Add heatmap
function addHeatmap(heatPoints) {
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.3
    });
    heatLayer.addTo(map);
}

// Clear heatmap
function clearHeatmap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

// Fit map to show all assets
function fitToBounds() {
    var allPoints = [];
    for (var i = 0; i < currentMarkers.length; i++) {
        var latlng = currentMarkers[i].getLatLng();
        allPoints.push([latlng.lat, latlng.lng]);
    }
    
    if (allPoints.length > 0) {
        var bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Zoom functions
window.zoomToAsset = function(lat, lng) {
    map.setView([lat, lng], 18);
};

// Export functions
window.MapView = {
    init: initMap,
    switchBaseMap: switchBaseMap,
    loadManholes: loadManholes,
    loadPipelines: loadPipelines,
    loadSuburbs: loadSuburbs,
    addHeatmap: addHeatmap,
    clearHeatmap: clearHeatmap,
    fitToBounds: fitToBounds
};
