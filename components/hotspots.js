// components/hotspots.js - Advanced Spatial Analysis Component
// Includes: Cascading drill-down, click-to-zoom, detailed asset view

// ============================================
// STATE MANAGEMENT
// ============================================

let currentAnalysis = null;
let selectedHotspot = null;
let drillDownLevel = 0; // 0=overview, 1=hotspot details, 2=asset details
let breadcrumbPath = [];

// ============================================
// SPATIAL ANALYSIS FUNCTIONS
// ============================================

function calculateCentroid(points) {
    if (!points.length) return { lat: 0, lng: 0 };
    const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = points.reduce((sum, p) => sum + p.lng, 0);
    return { lat: sumLat / points.length, lng: sumLng / points.length };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ============================================
// 1. KERNEL DENSITY ESTIMATION
// ============================================

function calculateKernelDensity(points, bandwidth = 0.5) {
    if (!points.length) return [];
    
    const densityPoints = [];
    const gridSize = 20;
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latStep = (maxLat - minLat) / gridSize;
    const lngStep = (maxLng - minLng) / gridSize;
    
    function gaussianKernel(distance, bandwidth) {
        return Math.exp(-0.5 * Math.pow(distance / bandwidth, 2)) / (bandwidth * Math.sqrt(2 * Math.PI));
    }
    
    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            const lat = minLat + i * latStep;
            const lng = minLng + j * lngStep;
            let density = 0;
            
            for (const point of points) {
                const distance = calculateDistance(lat, lng, point.lat, point.lng);
                density += gaussianKernel(distance, bandwidth) * (point.blockages || 1);
            }
            
            if (density > 0.01) {
                densityPoints.push({ lat, lng, density });
            }
        }
    }
    
    const maxDensity = Math.max(...densityPoints.map(d => d.density));
    densityPoints.forEach(d => d.normalizedDensity = (d.density / maxDensity) * 100);
    
    return densityPoints.sort((a, b) => b.density - a.density);
}

// ============================================
// 2. GETIS-ORD GI* STATISTIC
// ============================================

function calculateGetisOrdGi(points, distanceBand = 1.0) {
    if (!points.length) return [];
    
    const totalBlockages = points.reduce((sum, p) => sum + (p.blockages || 1), 0);
    const meanBlockage = totalBlockages / points.length;
    let sumSquares = 0;
    for (const p of points) {
        sumSquares += Math.pow((p.blockages || 1) - meanBlockage, 2);
    }
    
    const results = [];
    for (let i = 0; i < points.length; i++) {
        let sumW = 0;
        let sumWx = 0;
        let sumW2 = 0;
        
        for (let j = 0; j < points.length; j++) {
            const distance = calculateDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
            const weight = distance <= distanceBand ? 1 : 0;
            if (weight > 0) {
                sumW += weight;
                sumWx += weight * (points[j].blockages || 1);
                sumW2 += Math.pow(weight, 2);
            }
        }
        
        if (sumW > 0) {
            const numerator = sumWx - (sumW * meanBlockage);
            const denominator = Math.sqrt(((sumSquares / (points.length - 1)) * ((points.length * sumW2 - Math.pow(sumW, 2)) / (points.length - 1))));
            const giStar = denominator !== 0 ? numerator / denominator : 0;
            results.push({
                ...points[i],
                giStar: giStar,
                isHotspot: giStar > 1.96,
                significance: giStar > 2.58 ? '99%' : giStar > 1.96 ? '95%' : giStar > 1.65 ? '90%' : 'Not significant'
            });
        } else {
            results.push({ ...points[i], giStar: 0, isHotspot: false, significance: 'No neighbors' });
        }
    }
    return results.sort((a, b) => b.giStar - a.giStar);
}

// ============================================
// 3. NEAREST NEIGHBOR ANALYSIS
// ============================================

function calculateNearestNeighbor(points) {
    if (points.length < 2) return null;
    let totalDistances = 0;
    let pairCount = 0;
    
    for (let i = 0; i < points.length; i++) {
        let minDist = Infinity;
        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                const dist = calculateDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
                if (dist < minDist) minDist = dist;
            }
        }
        if (minDist !== Infinity) {
            totalDistances += minDist;
            pairCount++;
        }
    }
    
    const meanObservedDist = totalDistances / pairCount;
    const area = (Math.max(...points.map(p => p.lng)) - Math.min(...points.map(p => p.lng))) *
                 (Math.max(...points.map(p => p.lat)) - Math.min(...points.map(p => p.lat)));
    const expectedDist = 0.5 / Math.sqrt(points.length / area);
    const nnRatio = meanObservedDist / expectedDist;
    
    let pattern = '';
    if (nnRatio < 0.7) pattern = 'Clustered 🔴';
    else if (nnRatio > 1.3) pattern = 'Dispersed 🟢';
    else pattern = 'Random 🟡';
    
    return {
        meanDistance: meanObservedDist.toFixed(3),
        expectedDistance: expectedDist.toFixed(3),
        nnRatio: nnRatio.toFixed(3),
        pattern: pattern,
        interpretation: nnRatio < 0.7 ? 'Strong clustering detected - blockages are concentrated' :
                       nnRatio > 1.3 ? 'Dispersed pattern - blockages are spread out' :
                       'Random pattern - no significant clustering'
    };
}

// ============================================
// 4. MORAN'S I
// ============================================

function calculateMoransI(points, distanceBand = 1.0) {
    if (points.length < 2) return null;
    
    const values = points.map(p => p.blockages || 1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    let numerator = 0;
    let denominator = 0;
    let weightsSum = 0;
    
    for (let i = 0; i < points.length; i++) {
        denominator += Math.pow(values[i] - mean, 2);
        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                const distance = calculateDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
                const weight = distance <= distanceBand ? 1 : 0;
                if (weight > 0) {
                    numerator += weight * (values[i] - mean) * (values[j] - mean);
                    weightsSum += weight;
                }
            }
        }
    }
    
    const moransI = (points.length / weightsSum) * (numerator / denominator);
    let interpretation = '';
    if (moransI > 0.3) interpretation = 'Strong positive spatial autocorrelation - similar values cluster together 🔴';
    else if (moransI > 0.1) interpretation = 'Weak positive spatial autocorrelation 🟡';
    else if (moransI < -0.3) interpretation = 'Strong negative spatial autocorrelation - checkerboard pattern 🟢';
    else interpretation = 'Random spatial distribution - no autocorrelation 📍';
    
    return { moransI: moransI.toFixed(3), interpretation };
}

// ============================================
// MAIN HOTSPOT DETECTION
// ============================================

function detectHotspots(manholes) {
    if (!manholes || manholes.length === 0) {
        return { hotspots: [], stats: {}, clustering: null, kde: [], giResults: [], moran: null };
    }
    
    const totalBlockages = manholes.reduce((sum, m) => sum + (m.blockages || 0), 0);
    const avgBlockages = totalBlockages / manholes.length;
    const stdDev = Math.sqrt(manholes.reduce((sum, m) => sum + Math.pow((m.blockages || 0) - avgBlockages, 2), 0) / manholes.length);
    const threshold = avgBlockages + stdDev;
    const hotspots = manholes.filter(m => (m.blockages || 0) > threshold).sort((a, b) => (b.blockages || 0) - (a.blockages || 0));
    
    return {
        hotspots: hotspots,
        stats: {
            totalBlockages,
            avgBlockages: avgBlockages.toFixed(1),
            maxBlockages: Math.max(...manholes.map(m => m.blockages || 0)),
            stdDev: stdDev.toFixed(2),
            threshold: threshold.toFixed(2),
            hotspotCount: hotspots.length
        },
        clustering: calculateNearestNeighbor(manholes),
        kde: calculateKernelDensity(manholes, 0.5).slice(0, 5),
        giResults: calculateGetisOrdGi(manholes, 1.0).filter(r => r.isHotspot).slice(0, 5),
        moran: calculateMoransI(manholes, 1.0)
    };
}

// ============================================
// CASCADING DRILL-DOWN FUNCTIONS
// ============================================

function showHotspotDetails(hotspot, allManholes) {
    drillDownLevel = 1;
    selectedHotspot = hotspot;
    breadcrumbPath = ['Overview', `Hotspot: ${hotspot.name || hotspot.manhole_id}`];
    
    // Find nearby assets within 500m
    const nearbyAssets = allManholes.filter(a => {
        const dist = calculateDistance(hotspot.lat, hotspot.lng, a.lat, a.lng);
        return dist <= 0.5 && a.id !== hotspot.id;
    });
    
    updateSpatialAnalysisWithDrillDown(allManholes, 'hotspot', { hotspot, nearbyAssets });
}

function showAssetDetails(asset, allManholes) {
    drillDownLevel = 2;
    breadcrumbPath = ['Overview', `Hotspot: ${selectedHotspot?.name || selectedHotspot?.manhole_id || 'Unknown'}`, `Asset: ${asset.name || asset.manhole_id}`];
    
    // Find similar assets in same suburb
    const similarAssets = allManholes.filter(a => a.suburb === asset.suburb && a.id !== asset.id);
    
    updateSpatialAnalysisWithDrillDown(allManholes, 'asset', { asset, similarAssets });
}

function showDensityArea(area, allManholes) {
    drillDownLevel = 1;
    breadcrumbPath = ['Overview', `High Density Area (${area.normalizedDensity.toFixed(1)}%)`];
    
    // Find assets within density area (within 200m of density point)
    const nearbyAssets = allManholes.filter(a => {
        const dist = calculateDistance(area.lat, area.lng, a.lat, a.lng);
        return dist <= 0.2;
    });
    
    updateSpatialAnalysisWithDrillDown(allManholes, 'density', { area, nearbyAssets });
}

function showClusterDetails(cluster, allManholes) {
    drillDownLevel = 1;
    breadcrumbPath = ['Overview', `Statistical Cluster (${cluster.significance} confidence)`];
    
    // Find nearby assets
    const nearbyAssets = allManholes.filter(a => {
        const dist = calculateDistance(cluster.lat, cluster.lng, a.lat, a.lng);
        return dist <= 0.3;
    });
    
    updateSpatialAnalysisWithDrillDown(allManholes, 'cluster', { cluster, nearbyAssets });
}

function goBackToOverview(allManholes) {
    drillDownLevel = 0;
    selectedHotspot = null;
    breadcrumbPath = ['Overview'];
    updateSpatialAnalysis(allManholes);
}

// ============================================
// DRILL-DOWN UI UPDATE
// ============================================

function updateSpatialAnalysisWithDrillDown(manholes, viewType, viewData) {
    const analysis = detectHotspots(manholes);
    const container = document.getElementById('spatialAnalysisStats');
    
    if (!container) return;
    
    // Build breadcrumb navigation
    const breadcrumbHtml = `
        <div class="breadcrumb-nav">
            ${breadcrumbPath.map((crumb, idx) => `
                <span class="breadcrumb-item ${idx === breadcrumbPath.length - 1 ? 'active' : ''}" 
                      data-breadcrumb="${idx}">
                    ${crumb}
                </span>
                ${idx < breadcrumbPath.length - 1 ? '<span class="breadcrumb-sep">›</span>' : ''}
            `).join('')}
            ${drillDownLevel > 0 ? '<button class="back-btn" id="backToOverviewBtn">← Back to Overview</button>' : ''}
        </div>
    `;
    
    if (viewType === 'hotspot' && viewData.hotspot) {
        const h = viewData.hotspot;
        container.innerHTML = `
            ${breadcrumbHtml}
            <div class="analysis-section hotspot-detail">
                <h5>🔥 HOTSPOT DETAILS</h5>
                <div class="detail-card">
                    <div class="detail-row"><span>Asset ID:</span><strong>${h.name || h.manhole_id}</strong></div>
                    <div class="detail-row"><span>Location:</span>${h.suburb || h.suburb_nam || 'N/A'}</div>
                    <div class="detail-row"><span>Blockages:</span><span class="hotspot-value">${h.blockages || 0}</span></div>
                    <div class="detail-row"><span>Coordinates:</span>${h.lat.toFixed(6)}, ${h.lng.toFixed(6)}</div>
                    <div class="detail-row"><span>Status:</span><span class="status-${h.status || 'unknown'}">${h.status || 'Unknown'}</span></div>
                    <button class="zoom-btn" data-lat="${h.lat}" data-lng="${h.lng}">📍 Zoom to Location</button>
                    <button class="drilldown-btn" data-asset-id="${h.id}">🔍 View Nearby Assets (${viewData.nearbyAssets?.length || 0})</button>
                </div>
            </div>
            
            ${viewData.nearbyAssets && viewData.nearbyAssets.length > 0 ? `
                <div class="analysis-section">
                    <h5>📍 NEARBY ASSETS (within 500m)</h5>
                    <div class="nearby-list">
                        ${viewData.nearbyAssets.slice(0, 10).map(a => `
                            <div class="nearby-item" data-lat="${a.lat}" data-lng="${a.lng}" data-asset-id="${a.id}">
                                <span>📌 ${a.name || a.manhole_id}</span>
                                <span class="blockage-badge">${a.blockages || 0} blockages</span>
                                <button class="view-asset-btn">View →</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<div class="analysis-section"><div class="stat-row">No nearby assets found</div></div>'}
        `;
    } 
    else if (viewType === 'asset' && viewData.asset) {
        const a = viewData.asset;
        container.innerHTML = `
            ${breadcrumbHtml}
            <div class="analysis-section asset-detail">
                <h5>📍 ASSET DETAILS</h5>
                <div class="detail-card">
                    <div class="detail-row"><span>Asset ID:</span><strong>${a.name || a.manhole_id}</strong></div>
                    <div class="detail-row"><span>Suburb:</span>${a.suburb || a.suburb_nam || 'N/A'}</div>
                    <div class="detail-row"><span>Blockages:</span><span class="hotspot-value">${a.blockages || 0}</span></div>
                    <div class="detail-row"><span>Coordinates:</span>${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}</div>
                    <div class="detail-row"><span>Diameter:</span>${a.diameter || 'N/A'} mm</div>
                    <div class="detail-row"><span>Material:</span>${a.material || 'N/A'}</div>
                    <button class="zoom-btn" data-lat="${a.lat}" data-lng="${a.lng}">📍 Zoom to Location</button>
                </div>
            </div>
            
            ${viewData.similarAssets && viewData.similarAssets.length > 0 ? `
                <div class="analysis-section">
                    <h5>🏘️ SIMILAR ASSETS IN ${a.suburb || a.suburb_nam}</h5>
                    <div class="nearby-list">
                        ${viewData.similarAssets.slice(0, 10).map(s => `
                            <div class="nearby-item" data-lat="${s.lat}" data-lng="${s.lng}">
                                <span>📌 ${s.name || s.manhole_id}</span>
                                <span class="blockage-badge">${s.blockages || 0} blockages</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    else if (viewType === 'density' && viewData.area) {
        container.innerHTML = `
            ${breadcrumbHtml}
            <div class="analysis-section density-detail">
                <h5>🗺️ HIGH DENSITY AREA</h5>
                <div class="detail-card">
                    <div class="detail-row"><span>Density Score:</span><span class="density-value">${viewData.area.normalizedDensity.toFixed(1)}%</span></div>
                    <div class="detail-row"><span>Coordinates:</span>${viewData.area.lat.toFixed(6)}, ${viewData.area.lng.toFixed(6)}</div>
                    <div class="detail-row"><span>Nearby Assets:</span>${viewData.nearbyAssets?.length || 0}</div>
                    <button class="zoom-btn" data-lat="${viewData.area.lat}" data-lng="${viewData.area.lng}">📍 Zoom to Area</button>
                </div>
            </div>
            
            ${viewData.nearbyAssets && viewData.nearbyAssets.length > 0 ? `
                <div class="analysis-section">
                    <h5>📍 ASSETS IN THIS AREA</h5>
                    <div class="nearby-list">
                        ${viewData.nearbyAssets.slice(0, 10).map(a => `
                            <div class="nearby-item" data-lat="${a.lat}" data-lng="${a.lng}" data-asset-id="${a.id}">
                                <span>📌 ${a.name || a.manhole_id}</span>
                                <span class="blockage-badge">${a.blockages || 0} blockages</span>
                                <button class="view-asset-btn">View →</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    else if (viewType === 'cluster' && viewData.cluster) {
        container.innerHTML = `
            ${breadcrumbHtml}
            <div class="analysis-section cluster-detail">
                <h5>🎯 STATISTICAL CLUSTER</h5>
                <div class="detail-card">
                    <div class="detail-row"><span>Asset:</span><strong>${viewData.cluster.name || viewData.cluster.manhole_id}</strong></div>
                    <div class="detail-row"><span>Gi* Score:</span>${viewData.cluster.giStar.toFixed(3)}</div>
                    <div class="detail-row"><span>Confidence:</span><span class="confidence-${viewData.cluster.significance.replace('%', '')}">${viewData.cluster.significance}</span></div>
                    <div class="detail-row"><span>Nearby Assets:</span>${viewData.nearbyAssets?.length || 0}</div>
                    <button class="zoom-btn" data-lat="${viewData.cluster.lat}" data-lng="${viewData.cluster.lng}">📍 Zoom to Cluster</button>
                </div>
            </div>
            
            ${viewData.nearbyAssets && viewData.nearbyAssets.length > 0 ? `
                <div class="analysis-section">
                    <h5>📍 ASSETS IN CLUSTER</h5>
                    <div class="nearby-list">
                        ${viewData.nearbyAssets.slice(0, 10).map(a => `
                            <div class="nearby-item" data-lat="${a.lat}" data-lng="${a.lng}" data-asset-id="${a.id}">
                                <span>📌 ${a.name || a.manhole_id}</span>
                                <span class="blockage-badge">${a.blockages || 0} blockages</span>
                                <button class="view-asset-btn">View →</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    // Attach event listeners for drill-down
    attachDrillDownEvents(manholes);
}

function updateSpatialAnalysis(manholes) {
    const analysis = detectHotspots(manholes);
    const container = document.getElementById('spatialAnalysisStats');
    
    if (!container) return;
    
    if (manholes.length === 0) {
        container.innerHTML = '<div class="stat-row">No data available for spatial analysis</div>';
        return;
    }
    
    container.innerHTML = `
        ${drillDownLevel > 0 ? `
            <div class="breadcrumb-nav">
                ${breadcrumbPath.map((crumb, idx) => `
                    <span class="breadcrumb-item ${idx === breadcrumbPath.length - 1 ? 'active' : ''}">
                        ${crumb}
                    </span>
                    ${idx < breadcrumbPath.length - 1 ? '<span class="breadcrumb-sep">›</span>' : ''}
                `).join('')}
                <button class="back-btn" id="backToOverviewBtn">← Back to Overview</button>
            </div>
        ` : ''}
        
        <div class="analysis-section">
            <h5>📊 Blockage Statistics</h5>
            <div class="stat-row"><span>Total Blockages:</span><span>${analysis.stats.totalBlockages}</span></div>
            <div class="stat-row"><span>Average per Asset:</span><span>${analysis.stats.avgBlockages}</span></div>
            <div class="stat-row"><span>Maximum Blockages:</span><span>${analysis.stats.maxBlockages}</span></div>
            <div class="stat-row"><span>Standard Deviation:</span><span>${analysis.stats.stdDev}</span></div>
            <div class="stat-row"><span>Hotspot Threshold:</span><span>> ${analysis.stats.threshold}</span></div>
            <div class="stat-row"><span>🔥 Hotspots Found:</span><span class="hotspot-count">${analysis.stats.hotspotCount}</span></div>
        </div>
        
        <div class="analysis-section">
            <h5>📍 Nearest Neighbor Analysis</h5>
            <div class="stat-row"><span>Mean Distance:</span><span>${analysis.clustering?.meanDistance || 'N/A'} km</span></div>
            <div class="stat-row"><span>Expected Distance:</span><span>${analysis.clustering?.expectedDistance || 'N/A'} km</span></div>
            <div class="stat-row"><span>NN Ratio:</span><span>${analysis.clustering?.nnRatio || 'N/A'}</span></div>
            <div class="stat-row"><span>Pattern:</span><span class="pattern-${analysis.clustering?.nnRatio < 0.7 ? 'clustered' : analysis.clustering?.nnRatio > 1.3 ? 'dispersed' : 'random'}">${analysis.clustering?.pattern || 'N/A'}</span></div>
            <div class="interpretation-text">${analysis.clustering?.interpretation || ''}</div>
        </div>
        
        <div class="analysis-section">
            <h5>🔄 Spatial Autocorrelation (Moran\'s I)</h5>
            <div class="stat-row"><span>Moran\'s I:</span><span>${analysis.moran?.moransI || 'N/A'}</span></div>
            <div class="interpretation-text">${analysis.moran?.interpretation || ''}</div>
        </div>
        
        <div class="analysis-section">
            <h5>🎯 Significant Clusters (Getis-Ord Gi*)</h5>
            ${analysis.giResults.length > 0 ? `
                <div class="cluster-list">
                    ${analysis.giResults.map(r => `
                        <div class="cluster-item" data-lat="${r.lat}" data-lng="${r.lng}" data-asset-id="${r.id}">
                            <span>📍 ${r.name || r.manhole_id}</span>
                            <span class="confidence-${r.significance.replace('%', '')}">${r.significance} confidence</span>
                            <button class="view-cluster-btn">View Cluster →</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<div class="stat-row">No significant clusters detected</div>'}
        </div>
        
        <div class="analysis-section">
            <h5>🗺️ High Density Areas (KDE)</h5>
            ${analysis.kde.length > 0 ? analysis.kde.map(area => `
                <div class="density-item" data-lat="${area.lat}" data-lng="${area.lng}">
                    <span>📍 Density: ${area.normalizedDensity.toFixed(1)}%</span>
                    <div class="density-bar-container">
                        <div class="density-bar" style="width: ${area.normalizedDensity}%"></div>
                    </div>
                    <button class="view-density-btn">View Area →</button>
                </div>
            `).join('') : '<div class="stat-row">No density areas detected</div>'}
        </div>
    `;
    
    attachDrillDownEvents(manholes);
}

// ============================================
// EVENT HANDLERS
// ============================================

function attachDrillDownEvents(manholes) {
    // Back button
    const backBtn = document.getElementById('backToOverviewBtn');
    if (backBtn) {
        backBtn.onclick = () => goBackToOverview(manholes);
    }
    
    // Zoom buttons
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                const event = new CustomEvent('zoomToLocation', { detail: { lat, lng, zoom: 18 } });
                document.dispatchEvent(event);
            }
        });
    });
    
    // View asset buttons
    document.querySelectorAll('.view-asset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.nearby-item');
            if (parent) {
                const lat = parseFloat(parent.dataset.lat);
                const lng = parseFloat(parent.dataset.lng);
                const assetId = parent.dataset.assetId;
                const asset = manholes.find(a => a.id == assetId);
                if (asset) showAssetDetails(asset, manholes);
                else if (!isNaN(lat) && !isNaN(lng)) {
                    const event = new CustomEvent('zoomToLocation', { detail: { lat, lng, zoom: 18 } });
                    document.dispatchEvent(event);
                }
            }
        });
    });
    
    // View cluster buttons
    document.querySelectorAll('.view-cluster-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.cluster-item');
            if (parent) {
                const lat = parseFloat(parent.dataset.lat);
                const lng = parseFloat(parent.dataset.lng);
                const assetId = parent.dataset.assetId;
                const cluster = manholes.find(a => a.id == assetId);
                if (cluster) showClusterDetails(cluster, manholes);
            }
        });
    });
    
    // View density buttons
    document.querySelectorAll('.view-density-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.density-item');
            if (parent) {
                const lat = parseFloat(parent.dataset.lat);
                const lng = parseFloat(parent.dataset.lng);
                const density = { lat, lng, normalizedDensity: parseFloat(parent.querySelector('.density-bar')?.style.width || '0') };
                showDensityArea(density, manholes);
            }
        });
    });
    
    // Hotspot items (from problem assets list)
    document.querySelectorAll('.hotspot-item').forEach(item => {
        item.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const asset = manholes.find(a => Math.abs(a.lat - lat) < 0.0001 && Math.abs(a.lng - lng) < 0.0001);
            if (asset) showHotspotDetails(asset, manholes);
            else if (!isNaN(lat) && !isNaN(lng)) {
                const event = new CustomEvent('zoomToLocation', { detail: { lat, lng, zoom: 18 } });
                document.dispatchEvent(event);
            }
        });
    });
}

function attachHotspotClickEvents() {
    const hotspotItems = document.querySelectorAll('.hotspot-item');
    for (let i = 0; i < hotspotItems.length; i++) {
        hotspotItems[i].addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                const event = new CustomEvent('zoomToLocation', { detail: { lat, lng, zoom: 18 } });
                document.dispatchEvent(event);
            }
        });
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateProblemAssets(manholes) {
    const analysis = detectHotspots(manholes);
    const container = document.getElementById('problemAssetsList');
    
    if (container) {
        if (analysis.hotspots.length === 0) {
            container.innerHTML = '<div class="stat-row">✅ No significant hotspots detected</div>';
        } else {
            container.innerHTML = analysis.hotspots.slice(0, 5).map(m => `
                <div class="stat-row hotspot-item" data-lat="${m.lat}" data-lng="${m.lng}" data-asset-id="${m.id}">
                    <span>🔥 ${m.name || m.manhole_id} - ${m.suburb || m.suburb_nam || 'N/A'}</span>
                    <span class="hotspot-value">${m.blockages || 0} blockages</span>
                    <button class="view-details-btn">Details →</button>
                </div>
            `).join('');
        }
    }
    
    attachHotspotClickEvents();
    attachDrillDownEvents(manholes);
}

function updateStatistics(manholes) {
    const analysis = detectHotspots(manholes);
    const statsContainer = document.getElementById('hotspotStats');
    
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-row"><span>📊 Total Blockages:</span><span>${analysis.stats.totalBlockages}</span></div>
            <div class="stat-row"><span>📈 Average per Asset:</span><span>${analysis.stats.avgBlockages}</span></div>
            <div class="stat-row"><span>⚠️ Worst Blockage:</span><span>${analysis.stats.maxBlockages}</span></div>
            <div class="stat-row"><span>🔥 Hotspots Detected:</span><span class="hotspot-count">${analysis.stats.hotspotCount}</span></div>
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
                <h4>🔥 PROBLEM ASSETS (Top 5 Hotspots)</h4>
                <div id="problemAssetsList" class="hotspot-list">
                    <div class="stat-row">📋 Loading assets...</div>
                </div>
            </div>
            
            <div class="chart-container">
                <h4>📊 SPATIAL ANALYSIS REPORT</h4>
                <div id="spatialAnalysisStats">
                    <div class="stat-row">Loading spatial analysis...</div>
                </div>
            </div>
            
            <div class="chart-container">
                <h4>📈 SUMMARY STATISTICS</h4>
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
    updateProblemAssets([]);
    updateSpatialAnalysis([]);
    updateStatistics([]);
}

function update(manholes) {
    if (manholes && manholes.length > 0) {
        updateProblemAssets(manholes);
        updateSpatialAnalysis(manholes);
        updateStatistics(manholes);
    } else {
        updateProblemAssets([]);
        updateSpatialAnalysis([]);
        updateStatistics([]);
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    render: render,
    init: init,
    update: update
};
