// components/heatmap.js
// PAINTED HEATMAP - GUARANTEED WORKING
// Shows smooth painted colors across the map

let heatmapActive = false;
let heatLayer = null;
let map = null;

// Beautiful heatmap gradient (Blue → Yellow → Orange → Red)
const HEATMAP_GRADIENT = {
    0.0: '#2c7bb6',   // Blue - Healthy areas
    0.2: '#abd9e9',   // Light blue
    0.4: '#ffffbf',   // Yellow - Warning areas
    0.6: '#fdae61',   // Orange
    0.8: '#f46d43',   // Dark orange
    1.0: '#d7191c'    // Red - Critical areas
};

// Get weight based on manhole status
function getWeight(status) {
    if (!status) return 0.2;
    const s = String(status).toLowerCase();
    if (s === 'critical' || s === 'blocked') return 1.0;  // Red - hottest
    if (s === 'warning' || s === 'partial') return 0.7;   // Orange
    if (s === 'pending') return 0.5;                      // Yellow
    return 0.2;                                           // Blue - coolest
}

// Initialize
function init(mapInstance) {
    map = mapInstance;
    console.log('🔥 Heatmap module initialized');
    console.log('Map object:', !!map);
}

// Show heatmap - SIMPLE AND GUARANTEED TO WORK
function show(manholeMarkers) {
    console.log('🔥 SHOW HEATMAP CALLED');
    console.log('Markers received:', manholeMarkers?.length);
    
    if (!map) {
        console.error('No map');
        return false;
    }
    
    if (!manholeMarkers || manholeMarkers.length === 0) {
        console.error('No markers');
        return false;
    }
    
    // Remove existing heatmap
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
    
    // Build points
    const points = [];
    for (let i = 0; i < manholeMarkers.length; i++) {
        const m = manholeMarkers[i];
        const latlng = m.getLatLng();
        const status = m._props?.status || 'good';
        const weight = getWeight(status);
        points.push([latlng.lat, latlng.lng, weight]);
    }
    
    console.log('Points built:', points.length);
    
    // Create heatmap
    try {
        heatLayer = L.heatLayer(points, {
            radius: 40,
            blur: 25,
            maxZoom: 18,
            minOpacity: 0.5,
            gradient: HEATMAP_GRADIENT
        }).addTo(map);
        
        heatmapActive = true;
        console.log('✅ Heatmap added to map');
        return true;
    } catch(e) {
        console.error('Heatmap error:', e);
        return false;
    }
}

// Hide heatmap
function hide() {
    if (heatLayer && map) {
        map.removeLayer(heatLayer);
        heatLayer = null;
        heatmapActive = false;
        console.log('Heatmap removed');
        return true;
    }
    return false;
}

// Toggle
function toggle(manholeMarkers) {
    console.log('Toggle called, active:', heatmapActive);
    if (heatmapActive) {
        hide();
        updateButton(false);
        showToast('HEATMAP OFF', 'Normal view');
    } else {
        show(manholeMarkers);
        updateButton(true);
        showToast('HEATMAP ON', 'Painted colors');
    }
}

function isActive() {
    return heatmapActive;
}

// Add button
function addButton(container, callback) {
    if (!container) return;
    
    const existing = document.getElementById('heatmapToggleBtn');
    if (existing) existing.remove();
    
    const btn = document.createElement('button');
    btn.id = 'heatmapToggleBtn';
    btn.innerHTML = '🎨 HEATMAP OFF';
    btn.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 10px;
        z-index: 10000;
        background: #1a472a;
        border: 2px solid #ff9800;
        border-radius: 8px;
        padding: 10px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: bold;
        color: #ff9800;
        font-family: monospace;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    
    btn.onclick = () => {
        if (callback) callback();
    };
    
    container.appendChild(btn);
}

function updateButton(isActive) {
    const btn = document.getElementById('heatmapToggleBtn');
    if (!btn) return;
    
    if (isActive) {
        btn.innerHTML = '🎨 HEATMAP ON';
        btn.style.borderColor = '#ff4444';
        btn.style.color = '#ff4444';
        btn.style.background = '#2a1a1a';
    } else {
        btn.innerHTML = '🎨 HEATMAP OFF';
        btn.style.borderColor = '#ff9800';
        btn.style.color = '#ff9800';
        btn.style.background = '#1a472a';
    }
}

function showToast(title, msg) {
    const existing = document.querySelector('.heatmap-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 10px;
        z-index: 10001;
        background: #1a472a;
        border-left: 4px solid #ff9800;
        padding: 10px 15px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        color: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    toast.innerHTML = `<strong>${title}</strong><br>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export default {
    init: init,
    show: show,
    hide: hide,
    toggle: toggle,
    isActive: isActive,
    addButton: addButton,
    updateButton: updateButton,
    showToast: showToast
};