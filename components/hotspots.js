// components/hotspots.js - Hotspots Component
// Displays top 5 problem assets based on blockage count

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateProblemAssets(manholes) {
    // Sort manholes by blockages (highest first) and take top 5
    const sorted = [...manholes].sort((a, b) => (b.blockages || 0) - (a.blockages || 0)).slice(0, 5);
    const container = document.getElementById('problemAssetsList');
    
    if (container) {
        if (sorted.length === 0) {
            container.innerHTML = '<div class="stat-row">✅ No problem assets found</div>';
        } else {
            container.innerHTML = sorted.map(m => `
                <div class="stat-row hotspot-item" data-lat="${m.lat}" data-lng="${m.lng}">
                    <span>🔥 ${m.name} - ${m.suburb || 'N/A'}</span>
                    <span class="hotspot-value">${m.blockages || 0} blockages</span>
                </div>
            `).join('');
        }
    }
    
    // Add click event to zoom to asset
    attachHotspotClickEvents();
}

function attachHotspotClickEvents() {
    const hotspotItems = document.querySelectorAll('.hotspot-item');
    for (let i = 0; i < hotspotItems.length; i++) {
        hotspotItems[i].addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                // Dispatch event for map to zoom to location
                const event = new CustomEvent('zoomToLocation', {
                    detail: { lat: lat, lng: lng, zoom: 18 }
                });
                document.dispatchEvent(event);
            }
        });
    }
}

function updateStatistics(manholes) {
    // Calculate hotspot statistics
    const totalBlockages = manholes.reduce((sum, m) => sum + (m.blockages || 0), 0);
    const avgBlockages = manholes.length > 0 ? (totalBlockages / manholes.length).toFixed(1) : 0;
    const maxBlockages = manholes.length > 0 ? Math.max(...manholes.map(m => m.blockages || 0)) : 0;
    
    const statsContainer = document.getElementById('hotspotStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-row">
                <span>📊 Total Blockages:</span>
                <span>${totalBlockages}</span>
            </div>
            <div class="stat-row">
                <span>📈 Average per Asset:</span>
                <span>${avgBlockages}</span>
            </div>
            <div class="stat-row">
                <span>⚠️ Worst Blockage:</span>
                <span>${maxBlockages}</span>
            </div>
        `;
    }
}

// ============================================
// RENDER FUNCTION
// ============================================

function render() {
    return `
        <div class="hotspots-container">
            <div class="chart-container">
                <h4>🔥 PROBLEM ASSETS (Top 5)</h4>
                <div id="problemAssetsList" class="hotspot-list">
                    <div class="stat-row">📋 Loading assets...</div>
                </div>
            </div>
            <div class="chart-container">
                <h4>📊 HOTSPOT STATISTICS</h4>
                <div id="hotspotStats">
                    <div class="stat-row">Loading statistics...</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Initial load with empty data
    updateProblemAssets([]);
    updateStatistics([]);
}

// ============================================
// UPDATE FUNCTION
// ============================================

function update(manholes) {
    if (manholes && manholes.length > 0) {
        updateProblemAssets(manholes);
        updateStatistics(manholes);
    } else {
        updateProblemAssets([]);
        updateStatistics([]);
    }
}

// ============================================
// EXPORTS (ES6 MODULE)
// ============================================

export default {
    render: render,
    init: init,
    update: update
};
