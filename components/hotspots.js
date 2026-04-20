// components/hotspots.js - Advanced Spatial Analysis Component
// Includes: Kernel Density Estimation, Hotspot Clustering, Nearest Neighbor Analysis

// ============================================
// SPATIAL ANALYSIS FUNCTIONS
// ============================================

// Calculate centroid of points
function calculateCentroid(points) {
    if (!points.length) return { lat: 0, lng: 0 };
    const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = points.reduce((sum, p) => sum + p.lng, 0);
    return { lat: sumLat / points.length, lng: sumLng / points.length };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ============================================
// 1. KERNEL DENSITY ESTIMATION (KDE)
// Detects areas with high concentration of blockages
// ============================================

function calculateKernelDensity(points, bandwidth = 0.5) {
    if (!points.length) return [];
    
    const densityPoints = [];
    const gridSize = 20; // 20x20 grid
    
    // Get bounds
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latStep = (maxLat - minLat) / gridSize;
    const lngStep = (maxLng - minLng) / gridSize;
    
    // Gaussian kernel function
    function gaussianKernel(distance, bandwidth) {
        return Math.exp(-0.5 * Math.pow(distance / bandwidth, 2)) / (bandwidth * Math.sqrt(2 * Math.PI));
    }
    
    // Calculate density at each grid point
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
    
    // Normalize densities
    const maxDensity = Math.max(...densityPoints.map(d => d.density));
    densityPoints.forEach(d => d.normalizedDensity = (d.density / maxDensity) * 100);
    
    return densityPoints.sort((a, b) => b.density - a.density);
}

// ============================================
// 2. GETIS-ORD GI* STATISTIC (Hotspot Clustering)
// Identifies statistically significant clusters
// ============================================

function calculateGetisOrdGi(points, distanceBand = 1.0) {
    if (!points.length) return [];
    
    // Calculate spatial weights matrix
    const weights = [];
    const totalBlockages = points.reduce((sum, p) => sum + (p.blockages || 1), 0);
    const meanBlockage = totalBlockages / points.length;
    
    // Calculate sum of squares
    let sumSquares = 0;
    for (const p of points) {
        sumSquares += Math.pow((p.blockages || 1) - meanBlockage, 2);
    }
    
    const results = [];
    
    for (let i = 0; i < points.length; i++) {
        let sumW = 0;
        let sumWx = 0;
        let sumW2 = 0;
        
        // Find neighbors within distance band
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
                isHotspot: giStar > 1.96, // 95% confidence
                isColdspot: giStar < -1.96,
                significance: giStar > 2.58 ? '99%' : giStar > 1.96 ? '95%' : giStar > 1.65 ? '90%' : 'Not significant'
            });
        } else {
            results.push({ ...points[i], giStar: 0, isHotspot: false, isColdspot: false, significance: 'No neighbors' });
        }
    }
    
    return results.sort((a, b) => b.giStar - a.giStar);
}

// ============================================
// 3. NEAREST NEIGHBOR ANALYSIS
// Detects clustering patterns vs random distribution
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
// 4. MORAN'S I (Spatial Autocorrelation)
// Measures how similar neighboring areas are
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
// MAIN HOTSPOT DETECTION FUNCTION
// ============================================

function detectHotspots(manholes) {
    if (!manholes || manholes.length === 0) {
        return { hotspots: [], stats: {}, clustering: null, kde: [], giResults: [], moran: null };
    }
    
    // 1. Basic statistics
    const totalBlockages = manholes.reduce((sum, m) => sum + (m.blockages || 0), 0);
    const avgBlockages = (totalBlockages / manholes.length).toFixed(1);
    const maxBlockages = Math.max(...manholes.map(m => m.blockages || 0));
    const stdDev = Math.sqrt(manholes.reduce((sum, m) => sum + Math.pow((m.blockages || 0) - avgBlockages, 2), 0) / manholes.length);
    
    // 2. Identify hotspots (assets with blockages > mean + 1 std dev)
    const threshold = parseFloat(avgBlockages) + stdDev;
    const hotspots = manholes.filter(m => (m.blockages || 0) > threshold).sort((a, b) => (b.blockages || 0) - (a.blockages || 0));
    
    // 3. Kernel Density Estimation
    const kdeResults = calculateKernelDensity(manholes, 0.5);
    const topDensityAreas = kdeResults.slice(0, 3);
    
    // 4. Getis-Ord Gi* analysis
    const giResults = calculateGetisOrdGi(manholes, 1.0);
    const significantHotspots = giResults.filter(r => r.isHotspot);
    
    // 5. Nearest Neighbor Analysis
    const clustering = calculateNearestNeighbor(manholes);
    
    // 6. Moran's I
    const moran = calculateMoransI(manholes, 1.0);
    
    return {
        hotspots: hotspots,
        stats: {
            totalBlockages,
            avgBlockages,
            maxBlockages,
            stdDev: stdDev.toFixed(2),
            threshold: threshold.toFixed(2),
            hotspotCount: hotspots.length,
            significantClusters: significantHotspots.length
        },
        clustering: clustering,
        kde: topDensityAreas,
        giResults: significantHotspots.slice(0, 5),
        moran: moran
    };
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
                <div class="stat-row hotspot-item" data-lat="${m.lat}" data-lng="${m.lng}">
                    <span>🔥 ${m.name || m.manhole_id} - ${m.suburb || m.suburb_nam || 'N/A'}</span>
                    <span class="hotspot-value">${m.blockages || m.bloc_stat || 0} blockages</span>
                </div>
            `).join('');
        }
    }
    
    attachHotspotClickEvents();
}

function updateSpatialAnalysis(manholes) {
    const analysis = detectHotspots(manholes);
    const container = document.getElementById('spatialAnalysisStats');
    
    if (container) {
        if (manholes.length === 0) {
            container.innerHTML = '<div class="stat-row">No data available for spatial analysis</div>';
            return;
        }
        
        container.innerHTML = `
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
                <div class="stat-row interpretation">${analysis.clustering?.interpretation || ''}</div>
            </div>
            
            <div class="analysis-section">
                <h5>🔄 Spatial Autocorrelation (Moran\'s I)</h5>
                <div class="stat-row"><span>Moran\'s I:</span><span>${analysis.moran?.moransI || 'N/A'}</span></div>
                <div class="stat-row interpretation">${analysis.moran?.interpretation || ''}</div>
            </div>
            
            <div class="analysis-section">
                <h5>🎯 Getis-Ord Gi* Clusters</h5>
                <div class="stat-row"><span>Significant Clusters:</span><span>${analysis.stats.significantClusters}</span></div>
                ${analysis.giResults.length > 0 ? `
                    <div class="cluster-list">
                        ${analysis.giResults.map(r => `
                            <div class="cluster-item" data-lat="${r.lat}" data-lng="${r.lng}">
                                <span>📍 ${r.name || r.manhole_id}</span>
                                <span class="confidence-${r.significance.replace('%', '')}">${r.significance} confidence</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="stat-row">No significant clusters detected</div>'}
            </div>
            
            <div class="analysis-section">
                <h5>🗺️ High Density Areas (KDE)</h5>
                ${analysis.kde.length > 0 ? analysis.kde.map(area => `
                    <div class="density-item">
                        <span>📍 Density: ${area.normalizedDensity.toFixed(1)}%</span>
                        <span class="density-bar" style="width: ${area.normalizedDensity}%"></span>
                    </div>
                `).join('') : '<div class="stat-row">No density areas detected</div>'}
            </div>
        `;
    }
    
    // Add click events to cluster items
    document.querySelectorAll('.cluster-item').forEach(item => {
        item.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                const event = new CustomEvent('zoomToLocation', { detail: { lat, lng, zoom: 16 } });
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

function updateStatistics(manholes) {
    const analysis = detectHotspots(manholes);
    const statsContainer = document.getElementById('hotspotStats');
    
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-row">
                <span>📊 Total Blockages:</span>
                <span>${analysis.stats.totalBlockages}</span>
            </div>
            <div class="stat-row">
                <span>📈 Average per Asset:</span>
                <span>${analysis.stats.avgBlockages}</span>
            </div>
            <div class="stat-row">
                <span>⚠️ Worst Blockage:</span>
                <span>${analysis.stats.maxBlockages}</span>
            </div>
            <div class="stat-row">
                <span>🔥 Hotspots Detected:</span>
                <span class="hotspot-count">${analysis.stats.hotspotCount}</span>
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

// ============================================
// UPDATE FUNCTION
// ============================================

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
