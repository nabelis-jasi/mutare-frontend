// components/statistics.js - Statistics Component - Simplified
// Fetches data directly from mapview's loaded data (not from API)

let currentData = {
    manholesCount: 0,
    pipelinesCount: 0,
    totalBlockages: 0,
    criticalCount: 0,
    pendingComplaints: 0
};

const API_BASE_URL = 'http://localhost:5000/api';

// ============================================
// FETCH DATA FROM MAPVIEW (NOT API)
// ============================================

function fetchStatsFromMapView() {
    // Get manholes from mapview's stored data
    const manholes = window.mapViewRef?.getCurrentManholesData?.() || [];
    
    console.log('📊 Reading from mapview:', {
        manholesFound: manholes.length,
        hasMapViewRef: !!window.mapViewRef
    });
    
    if (!manholes.length) {
        console.log('⚠️ No manhole data available from mapview yet');
        return null;
    }
    
    // Calculate statistics from actual manhole data
    let totalBlockages = 0;
    let criticalCount = 0;
    let manholesCount = manholes.length;
    
    for (const m of manholes) {
        const status = (m.bloc_stat || m.status || 'good').toLowerCase();
        if (status === 'blocked' || status === 'critical') {
            criticalCount++;
            totalBlockages += 3;  // Critical = 3 blockage points
        } else if (status === 'partial' || status === 'warning') {
            totalBlockages += 1;  // Warning = 1 blockage point
        }
        // Good = 0 blockage points
    }
    
    // Try to get pipelines count from mapview if available
    let pipelinesCount = 0;
    if (window.mapViewRef?.allPipelineLayer) {
        // Estimate or get from another source
        pipelinesCount = Math.floor(manholesCount * 0.8); // Fallback estimate
    }
    
    return {
        manholesCount: manholesCount,
        pipelinesCount: pipelinesCount,
        totalBlockages: totalBlockages,
        criticalCount: criticalCount
    };
}

async function fetchComplaintsStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/complaints_status`);
        if (!response.ok) throw new Error('Complaints fetch failed');
        const data = await response.json();
        console.log('📋 Complaints from DB:', data);
        return data;
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return { pending: 0 };
    }
}

// ============================================
// UPDATE FUNCTIONS - FROM MAPVIEW
// ============================================

async function updateFromMapView() {
    console.log('🔄 Updating statistics from mapview...');
    
    // Get data from mapview
    const stats = fetchStatsFromMapView();
    
    if (stats) {
        currentData.manholesCount = stats.manholesCount;
        currentData.pipelinesCount = stats.pipelinesCount;
        currentData.totalBlockages = stats.totalBlockages;
        currentData.criticalCount = stats.criticalCount;
        
        updateQuickSummaryDOM();
        console.log('📊 Statistics updated from mapview:', {
            manholes: currentData.manholesCount,
            critical: currentData.criticalCount,
            blockages: currentData.totalBlockages
        });
    } else {
        console.log('⏳ Waiting for mapview data to load...');
    }

    // Still fetch complaints from API
    const complaints = await fetchComplaintsStatus();
    if (complaints) {
        currentData.pendingComplaints = complaints.pending || 0;
        const pendingEl = document.getElementById('pendingComplaints');
        if (pendingEl) pendingEl.innerText = currentData.pendingComplaints;
    }
}

function updateQuickSummaryDOM() {
    const elements = {
        totalManholes: currentData.manholesCount,
        totalPipelines: currentData.pipelinesCount,
        totalBlockages: currentData.totalBlockages,
        criticalAssets: currentData.criticalCount,
        pendingComplaints: currentData.pendingComplaints
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = value;
            console.log(`📊 Updated ${id}: ${value}`);
        }
    }
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

async function updateStatistics() {
    await updateFromMapView();
    console.log('Statistics update complete');
}

function getCurrentStatistics() {
    return currentData;
}

// ============================================
// RENDER HTML - Horizontal layout with heading
// ============================================

function render() {
    return `
        <div class="statistics-container" style="padding: 12px;">
            <!-- Heading -->
            <div style="text-align: left; margin-bottom: 10px;">
                <h3 style="color: #69f0ae; margin: 0; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">📊 QUICK SUMMARY</h3>
                <div style="height: 2px; width: 60px; background: #2e7d32; margin-top: 4px;"></div>
            </div>
            
            <!-- 5 Stats Cards - Horizontal Row -->
            <div style="display: flex; flex-direction: row; gap: 12px; justify-content: space-between; flex-wrap: wrap;">
                
                <!-- Manholes -->
                <div style="flex: 1; min-width: 70px; background: #0d2818; padding: 8px 6px; border-radius: 8px; text-align: center; border: 1px solid #9b59b6;">
                    <div style="font-size: 1.0rem; font-weight: 400; color: #9b59b6;" id="totalManholes">0</div>
                    <div style="font-size: 9px; color: #c9a0ff; font-weight: 400;">🟣 MANHOLES</div>
                </div>
                
                <!-- Pipelines -->
                <div style="flex: 1; min-width: 70px; background: #0d2818; padding: 8px 6px; border-radius: 8px; text-align: center; border: 1px solid #32cd32;">
                    <div style="font-size: 1.0rem; font-weight: 400; color: #32cd32;" id="totalPipelines">0</div>
                    <div style="font-size: 9px; color: #6bff6b; font-weight: 400;">🟢 PIPELINES</div>
                </div>
                
                <!-- Blockages -->
                <div style="flex: 1; min-width: 70px; background: #0d2818; padding: 8px 6px; border-radius: 8px; text-align: center; border: 1px solid #ffc107;">
                    <div style="font-size: 1.0rem; font-weight: 400; color: #ffc107;" id="totalBlockages">0</div>
                    <div style="font-size: 9px; color: #ffd93d; font-weight: 400;">🟡 BLOCKAGES</div>
                </div>
                
                <!-- Critical Assets -->
                <div style="flex: 1; min-width: 70px; background: #0d2818; padding: 8px 6px; border-radius: 8px; text-align: center; border: 1px solid #dc3545;">
                    <div style="font-size: 1.0rem; font-weight: 400; color: #dc3545;" id="criticalAssets">0</div>
                    <div style="font-size: 9px; color: #ff6b6b; font-weight: 400;">🔴 CRITICAL</div>
                </div>
                
                <!-- Pending Complaints -->
                <div style="flex: 1; min-width: 70px; background: #0d2818; padding: 8px 6px; border-radius: 8px; text-align: center; border: 1px solid #ff9800;">
                    <div style="font-size: 1.0rem; font-weight: 400; color: #ff9800;" id="pendingComplaints">0</div>
                    <div style="font-size: 9px; color: #ffb74d; font-weight: 400;">⏳ PENDING</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('📊 Initializing statistics component...');
    
    // Set up reference to mapview (will be populated by main.js)
    // The mapview reference is set in main.js with window.mapViewRef = MapView
    
    // Initial update from mapview
    await updateFromMapView();
    
    // Listen for map data refreshes
    document.addEventListener('mapDataRefreshed', () => {
        console.log('🗺️ Map data refreshed - updating statistics');
        updateFromMapView();
    });
    
    // Listen for filter changes
    document.addEventListener('filtersChanged', () => {
        console.log('🔍 Filters changed - updating statistics from mapview');
        updateFromMapView();
    });
    
    document.addEventListener('dataRefreshed', () => {
        updateFromMapView();
    });
    
    // Also listen for when manholes are loaded
    document.addEventListener('mapReady', () => {
        console.log('🗺️ Map ready - checking statistics');
        setTimeout(() => updateFromMapView(), 1000);
    });
    
    // Refresh every 30 seconds
    setInterval(() => {
        updateFromMapView();
    }, 30000);
    
    console.log('✅ Statistics component initialized - fetching data from mapview');
}

// ============================================
// EXPORTS
// ============================================

export default {
    render,
    init,
    update: updateStatistics,
    getCurrent: getCurrentStatistics
};