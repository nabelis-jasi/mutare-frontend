// components/hotspots.js - Advanced Spatial Analysis Component
// Now works with dynamic blockage inference from Flask backend data
// HOTSPOTS: Critical assets appear in RED with click-to-analyze functionality
// ============================================================

let currentAnalysis = null;
let selectedHotspot = null;
let drillDownLevel = 0;
let breadcrumbPath = [];
let currentManholesData = [];

// ---------- HELPER: Get numeric blockage count from various field names ----------
function getBlockageCount(m) {
  // Direct numeric blockage field
  if (m.blockages !== undefined && typeof m.blockages === 'number') return m.blockages;
  if (m.blockage_count !== undefined && typeof m.blockage_count === 'number') return m.blockage_count;
  if (m.blockageScore !== undefined && typeof m.blockageScore === 'number') return m.blockageScore;
  
  // Infer from status text
  if (m.bloc_stat) {
    const status = String(m.bloc_stat).toLowerCase();
    if (status === 'blocked' || status === 'critical') return 3;
    if (status === 'partial' || status === 'warning') return 1;
    if (status === 'clear' || status === 'good') return 0;
  }
  if (m.status) {
    const status = String(m.status).toLowerCase();
    if (status === 'blocked' || status === 'critical') return 3;
    if (status === 'warning') return 1;
    if (status === 'good') return 0;
  }
  
  return 0;
}

// Helper to check if asset is critical
function isCriticalAsset(m) {
  const status = String(m.bloc_stat || m.status || '').toLowerCase();
  return status === 'blocked' || status === 'critical';
}

// Helper to get status class for styling
function getStatusClass(m) {
  if (isCriticalAsset(m)) return 'critical';
  const status = String(m.bloc_stat || m.status || '').toLowerCase();
  if (status === 'partial' || status === 'warning') return 'warning';
  return 'good';
}

// ---------- Spatial helpers ----------
function calculateCentroid(points) {
  if (!points.length) return { lat: 0, lng: 0 };
  const sumLat = points.reduce((sum, p) => sum + (p.lat || 0), 0);
  const sumLng = points.reduce((sum, p) => sum + (p.lng || 0), 0);
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

// ---------- KERNEL DENSITY ESTIMATION ----------
function calculateKernelDensity(points, bandwidth = 0.5) {
  if (!points.length) return [];
  const densityPoints = [];
  const gridSize = 20;
  const lats = points.map(p => p.lat || 0);
  const lngs = points.map(p => p.lng || 0);
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
        const distance = calculateDistance(lat, lng, point.lat || 0, point.lng || 0);
        density += gaussianKernel(distance, bandwidth) * getBlockageCount(point);
      }
      if (density > 0.01) densityPoints.push({ lat, lng, density });
    }
  }
  const maxDensity = Math.max(...densityPoints.map(d => d.density));
  densityPoints.forEach(d => d.normalizedDensity = (d.density / maxDensity) * 100);
  return densityPoints.sort((a, b) => b.density - a.density);
}

// ---------- GETIS-ORD GI* ----------
function calculateGetisOrdGi(points, distanceBand = 1.0) {
  if (!points.length) return [];
  const blockageValues = points.map(p => getBlockageCount(p));
  const totalBlockages = blockageValues.reduce((a,b) => a+b, 0);
  const meanBlockage = totalBlockages / points.length;
  let sumSquares = 0;
  for (let v of blockageValues) sumSquares += Math.pow(v - meanBlockage, 2);

  const results = [];
  for (let i = 0; i < points.length; i++) {
    let sumW = 0, sumWx = 0, sumW2 = 0;
    for (let j = 0; j < points.length; j++) {
      const dist = calculateDistance(points[i].lat || 0, points[i].lng || 0, points[j].lat || 0, points[j].lng || 0);
      const weight = dist <= distanceBand ? 1 : 0;
      if (weight) {
        sumW += weight;
        sumWx += weight * blockageValues[j];
        sumW2 += weight * weight;
      }
    }
    if (sumW > 0) {
      const numerator = sumWx - (sumW * meanBlockage);
      const denominator = Math.sqrt((sumSquares / (points.length - 1)) * ((points.length * sumW2 - Math.pow(sumW,2)) / (points.length - 1)));
      const giStar = denominator !== 0 ? numerator / denominator : 0;
      results.push({
        ...points[i],
        blockageScore: blockageValues[i],
        giStar: giStar,
        isHotspot: giStar > 1.96,
        significance: giStar > 2.58 ? '99%' : giStar > 1.96 ? '95%' : giStar > 1.65 ? '90%' : 'Not significant'
      });
    } else {
      results.push({ ...points[i], blockageScore: blockageValues[i], giStar: 0, isHotspot: false, significance: 'No neighbors' });
    }
  }
  return results.sort((a,b) => b.giStar - a.giStar);
}

// ---------- NEAREST NEIGHBOR ANALYSIS ----------
function calculateNearestNeighbor(points) {
  if (points.length < 2) return null;
  let totalDistances = 0, pairCount = 0;
  for (let i = 0; i < points.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const dist = calculateDistance(points[i].lat || 0, points[i].lng || 0, points[j].lat || 0, points[j].lng || 0);
        if (dist < minDist) minDist = dist;
      }
    }
    if (minDist !== Infinity) { totalDistances += minDist; pairCount++; }
  }
  const meanObservedDist = totalDistances / pairCount;
  const lats = points.map(p => p.lat || 0);
  const lngs = points.map(p => p.lng || 0);
  const area = (Math.max(...lngs) - Math.min(...lngs)) * (Math.max(...lats) - Math.min(...lats));
  const expectedDist = 0.5 / Math.sqrt(points.length / area);
  const nnRatio = meanObservedDist / expectedDist;
  let pattern = nnRatio < 0.7 ? 'Clustered 🔴' : nnRatio > 1.3 ? 'Dispersed 🟢' : 'Random 🟡';
  return {
    meanDistance: meanObservedDist.toFixed(3),
    expectedDistance: expectedDist.toFixed(3),
    nnRatio: nnRatio.toFixed(3),
    pattern: pattern,
    interpretation: nnRatio < 0.7 ? 'Strong clustering detected' : nnRatio > 1.3 ? 'Dispersed pattern' : 'Random pattern – no significant clustering'
  };
}

// ---------- MORAN'S I ----------
function calculateMoransI(points, distanceBand = 1.0) {
  if (points.length < 2) return null;
  const values = points.map(p => getBlockageCount(p));
  const mean = values.reduce((a,b) => a+b,0) / values.length;
  let numerator = 0, denominator = 0, weightsSum = 0;
  for (let i = 0; i < points.length; i++) {
    denominator += Math.pow(values[i] - mean, 2);
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const dist = calculateDistance(points[i].lat || 0, points[i].lng || 0, points[j].lat || 0, points[j].lng || 0);
        const weight = dist <= distanceBand ? 1 : 0;
        if (weight > 0) {
          numerator += weight * (values[i] - mean) * (values[j] - mean);
          weightsSum += weight;
        }
      }
    }
  }
  const moransI = (points.length / weightsSum) * (numerator / denominator);
  let interpretation = '';
  if (moransI > 0.3) interpretation = 'Strong positive spatial autocorrelation – similar values cluster together 🔴';
  else if (moransI > 0.1) interpretation = 'Weak positive spatial autocorrelation 🟡';
  else if (moransI < -0.3) interpretation = 'Strong negative autocorrelation – checkerboard pattern 🟢';
  else interpretation = 'Random spatial distribution – no autocorrelation 📍';
  return { moransI: moransI.toFixed(3), interpretation };
}

// ---------- MAIN HOTSPOT DETECTION ----------
function detectHotspots(manholes) {
  if (!manholes || manholes.length === 0) {
    return { hotspots: [], stats: {}, clustering: null, kde: [], giResults: [], moran: null };
  }

  const blockageScores = manholes.map(m => getBlockageCount(m));
  const totalBlockages = blockageScores.reduce((a,b)=>a+b,0);
  const avgBlockages = totalBlockages / manholes.length;
  const stdDev = Math.sqrt(manholes.reduce((sum,m,i) => sum + Math.pow(blockageScores[i] - avgBlockages,2),0) / manholes.length);
  const threshold = avgBlockages + stdDev;
  
  // Prioritize critical assets first
  const hotspots = manholes.filter((m,i) => blockageScores[i] > threshold || isCriticalAsset(m))
    .sort((a,b) => {
      // Critical assets come first
      if (isCriticalAsset(a) && !isCriticalAsset(b)) return -1;
      if (!isCriticalAsset(a) && isCriticalAsset(b)) return 1;
      return getBlockageCount(b) - getBlockageCount(a);
    });

  return {
    hotspots: hotspots,
    stats: {
      totalBlockages: totalBlockages,
      avgBlockages: avgBlockages.toFixed(1),
      maxBlockages: Math.max(...blockageScores),
      stdDev: stdDev.toFixed(2),
      threshold: threshold.toFixed(2),
      hotspotCount: hotspots.length,
      criticalCount: manholes.filter(m => isCriticalAsset(m)).length
    },
    clustering: calculateNearestNeighbor(manholes),
    kde: calculateKernelDensity(manholes, 0.5).slice(0,5),
    giResults: calculateGetisOrdGi(manholes, 1.0).filter(r => r.isHotspot).slice(0,5),
    moran: calculateMoransI(manholes, 1.0)
  };
}

// ---------- ZOOM TO LOCATION ON MAP ----------
function zoomToLocation(lat, lng, zoom = 18) {
  if (!isNaN(lat) && !isNaN(lng)) {
    document.dispatchEvent(new CustomEvent('zoomToLocation', { 
      detail: { lat, lng, zoom } 
    }));
  }
}

// ---------- SHOW HOTSPOT ON MAP ----------
function showHotspotOnMap(hotspot) {
  if (hotspot && hotspot.lat && hotspot.lng) {
    zoomToLocation(hotspot.lat, hotspot.lng, 18);
    
    document.dispatchEvent(new CustomEvent('highlightAsset', {
      detail: { 
        assetId: hotspot.manhole_id || hotspot.id,
        lat: hotspot.lat,
        lng: hotspot.lng,
        isCritical: isCriticalAsset(hotspot)
      }
    }));
  }
}

// ---------- DRILL-DOWN FUNCTIONS - FIXED TO NOT DISAPPEAR ----------
function showHotspotDetails(hotspot, allManholes) {
  drillDownLevel = 1;
  selectedHotspot = hotspot;
  breadcrumbPath = ['Overview', `Hotspot: ${hotspot.manhole_id || hotspot.name || 'Asset'}`];
  const nearbyAssets = allManholes.filter(a => {
    const dist = calculateDistance(hotspot.lat || 0, hotspot.lng || 0, a.lat || 0, a.lng || 0);
    return dist <= 0.5 && a !== hotspot;
  });
  
  showHotspotOnMap(hotspot);
  
  // Update the panel with drill-down content
  updateSpatialAnalysisWithDrillDown(allManholes, 'hotspot', { hotspot, nearbyAssets });
}

function showAssetDetails(asset, allManholes) {
  drillDownLevel = 2;
  breadcrumbPath = ['Overview', `Hotspot: ${selectedHotspot?.manhole_id || selectedHotspot?.name || 'Unknown'}`, `Asset: ${asset.manhole_id || asset.name}`];
  const similarAssets = allManholes.filter(a => (a.suburb === asset.suburb || a.suburb_nam === asset.suburb_nam) && a !== asset);
  
  zoomToLocation(asset.lat, asset.lng, 19);
  
  updateSpatialAnalysisWithDrillDown(allManholes, 'asset', { asset, similarAssets });
}

function showDensityArea(area, allManholes) {
  drillDownLevel = 1;
  breadcrumbPath = ['Overview', `High Density Area (${area.normalizedDensity.toFixed(1)}%)`];
  const nearbyAssets = allManholes.filter(a => calculateDistance(area.lat, area.lng, a.lat || 0, a.lng || 0) <= 0.2);
  
  zoomToLocation(area.lat, area.lng, 15);
  
  updateSpatialAnalysisWithDrillDown(allManholes, 'density', { area, nearbyAssets });
}

function showClusterDetails(cluster, allManholes) {
  drillDownLevel = 1;
  breadcrumbPath = ['Overview', `Statistical Cluster (${cluster.significance} confidence)`];
  const nearbyAssets = allManholes.filter(a => calculateDistance(cluster.lat || 0, cluster.lng || 0, a.lat || 0, a.lng || 0) <= 0.3);
  
  zoomToLocation(cluster.lat, cluster.lng, 16);
  
  updateSpatialAnalysisWithDrillDown(allManholes, 'cluster', { cluster, nearbyAssets });
}

function goBackToOverview(allManholes) {
  drillDownLevel = 0;
  selectedHotspot = null;
  breadcrumbPath = ['Overview'];
  // Restore the original spatial analysis view
  updateSpatialAnalysis(allManholes);
}

// ---------- DRILL-DOWN UI RENDER ----------
function updateSpatialAnalysisWithDrillDown(manholes, viewType, viewData) {
  const container = document.getElementById('spatialAnalysisStats');
  if (!container) return;

  const breadcrumbHtml = `
    <div class="breadcrumb-nav" style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #2e7d32;">
      ${breadcrumbPath.map((crumb, idx) => `
        <span class="breadcrumb-item ${idx === breadcrumbPath.length-1 ? 'active' : ''}" style="${idx === breadcrumbPath.length-1 ? 'color:#69f0ae;' : 'color:#a5d6a7;'}">${crumb}</span>
        ${idx < breadcrumbPath.length-1 ? '<span class="breadcrumb-sep" style="color:#2e7d32;"> › </span>' : ''}
      `).join('')}
      ${drillDownLevel > 0 ? '<button class="back-btn" id="backToOverviewBtn" style="margin-left:10px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:2px 8px; cursor:pointer;">← Back</button>' : ''}
    </div>
  `;

  if (viewType === 'hotspot' && viewData.hotspot) {
    const h = viewData.hotspot;
    const isCritical = isCriticalAsset(h);
    container.innerHTML = `
      ${breadcrumbHtml}
      <div class="analysis-section hotspot-detail">
        <h5 style="color:#69f0ae; margin-bottom:8px;">🔥 HOTSPOT DETAILS</h5>
        <div class="detail-card" style="background:#0d2818; padding:10px; border-radius:6px; border-left: 3px solid ${isCritical ? '#dc3545' : '#ffc107'};">
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Asset ID:</span><strong style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${h.manhole_id || h.name || 'N/A'}</strong></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Location:</span><span style="color:#a5d6a7;">${h.suburb || h.suburb_nam || 'N/A'}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Blockage Score:</span><span class="hotspot-value" style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${getBlockageCount(h)}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Status:</span><span style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${h.bloc_stat || h.status || 'Unknown'}</span></div>
          <button class="zoom-btn" data-lat="${h.lat}" data-lng="${h.lng}" style="margin-top:8px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:4px 8px; cursor:pointer;">📍 Zoom to Location</button>
        </div>
      </div>
    `;
  } 
  else if (viewType === 'asset' && viewData.asset) {
    const a = viewData.asset;
    const isCritical = isCriticalAsset(a);
    container.innerHTML = `
      ${breadcrumbHtml}
      <div class="analysis-section asset-detail">
        <h5 style="color:#69f0ae; margin-bottom:8px;">📍 ASSET DETAILS</h5>
        <div class="detail-card" style="background:#0d2818; padding:10px; border-radius:6px; border-left: 3px solid ${isCritical ? '#dc3545' : '#ffc107'};">
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Asset ID:</span><strong style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${a.manhole_id || a.name || 'N/A'}</strong></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Suburb:</span><span style="color:#a5d6a7;">${a.suburb || a.suburb_nam || 'N/A'}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Status:</span><span style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${a.bloc_stat || a.status || 'Unknown'}</span></div>
          <button class="zoom-btn" data-lat="${a.lat}" data-lng="${a.lng}" style="margin-top:8px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:4px 8px; cursor:pointer;">📍 Zoom to Location</button>
        </div>
      </div>
    `;
  }
  else if (viewType === 'cluster' && viewData.cluster) {
    const c = viewData.cluster;
    container.innerHTML = `
      ${breadcrumbHtml}
      <div class="analysis-section cluster-detail">
        <h5 style="color:#69f0ae; margin-bottom:8px;">🎯 STATISTICAL CLUSTER</h5>
        <div class="detail-card" style="background:#0d2818; padding:10px; border-radius:6px;">
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Asset:</span><strong style="color:#69f0ae;">${c.manhole_id || c.name || 'Asset'}</strong></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Gi* Score:</span><span style="color:#ffd93d;">${c.giStar.toFixed(3)}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">Confidence:</span><span style="color:#69f0ae;">${c.significance}</span></div>
          <button class="zoom-btn" data-lat="${c.lat}" data-lng="${c.lng}" style="margin-top:8px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:4px 8px; cursor:pointer;">📍 Zoom to Cluster</button>
        </div>
      </div>
    `;
  }
  attachDrillDownEvents(manholes);
}

function updateSpatialAnalysis(manholes) {
  currentManholesData = manholes;
  const analysis = detectHotspots(manholes);
  const container = document.getElementById('spatialAnalysisStats');
  if (!container) return;
  if (!manholes.length) {
    container.innerHTML = '<div class="stat-row" style="color:#a5d6a7;">No data available for spatial analysis</div>';
    return;
  }
  
  const criticalCount = analysis.stats.criticalCount || 0;
  
  container.innerHTML = `
    <div class="analysis-section">
      <h5 style="color:#69f0ae; margin-bottom:8px;">📊 Blockage Statistics</h5>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">Total Blockage Score:</span><span style="color:#a5d6a7;">${analysis.stats.totalBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">Average per Asset:</span><span style="color:#a5d6a7;">${analysis.stats.avgBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">Maximum:</span><span style="color:#a5d6a7;">${analysis.stats.maxBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">🔥 Hotspots Found:</span><span class="hotspot-count" style="color:#ff6b6b;">${analysis.stats.hotspotCount}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">🔴 Critical Assets:</span><span class="critical-count" style="color:#ff6b6b;">${criticalCount}</span></div>
    </div>
    <div class="analysis-section" style="margin-top:12px;">
      <h5 style="color:#69f0ae; margin-bottom:8px;">📍 Nearest Neighbor Analysis</h5>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">NN Ratio:</span><span style="color:#a5d6a7;">${analysis.clustering?.nnRatio || 'N/A'}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">Pattern:</span><span class="pattern-${analysis.clustering?.nnRatio < 0.7 ? 'clustered' : analysis.clustering?.nnRatio > 1.3 ? 'dispersed' : 'random'}" style="color:${analysis.clustering?.nnRatio < 0.7 ? '#ff6b6b' : analysis.clustering?.nnRatio > 1.3 ? '#6bff6b' : '#ffd93d'};">${analysis.clustering?.pattern || 'N/A'}</span></div>
    </div>
    <div class="analysis-section" style="margin-top:12px;">
      <h5 style="color:#69f0ae; margin-bottom:8px;">🔄 Spatial Autocorrelation</h5>
      <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">Moran's I:</span><span style="color:#a5d6a7;">${analysis.moran?.moransI || 'N/A'}</span></div>
    </div>
    <div class="analysis-section" style="margin-top:12px;">
      <h5 style="color:#69f0ae; margin-bottom:8px;">🎯 Significant Clusters</h5>
      ${analysis.giResults.length ? `
        <div class="cluster-list">
          ${analysis.giResults.slice(0,5).map(r => `
            <div class="cluster-item" data-lat="${r.lat || 0}" data-lng="${r.lng || 0}" data-asset-id="${r.id}" style="display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid #1a3a1a; cursor:pointer;">
              <span style="color:#a5d6a7;">📍 ${r.manhole_id || r.name || 'Asset'}</span>
              <span style="color:#69f0ae;">${r.significance}</span>
              <button class="view-cluster-btn" style="background:#0d2818; border:1px solid #2e7d32; border-radius:3px; color:#69f0ae; padding:2px 6px; cursor:pointer;">View</button>
            </div>
          `).join('')}
        </div>
      ` : '<div class="stat-row" style="color:#a5d6a7;">No significant clusters detected</div>'}
    </div>
  `;
  attachDrillDownEvents(manholes);
}

function attachDrillDownEvents(manholes) {
  const backBtn = document.getElementById('backToOverviewBtn');
  if (backBtn) backBtn.onclick = () => goBackToOverview(manholes);

  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.onclick = function() {
      const lat = parseFloat(this.dataset.lat);
      const lng = parseFloat(this.dataset.lng);
      zoomToLocation(lat, lng, 18);
    };
  });

  document.querySelectorAll('.view-cluster-btn').forEach(btn => {
    btn.onclick = function() {
      const parent = this.closest('.cluster-item');
      if (parent) {
        const lat = parseFloat(parent.dataset.lat);
        const lng = parseFloat(parent.dataset.lng);
        const assetId = parent.dataset.assetId;
        const cluster = manholes.find(a => a.id == assetId || a.manhole_id == assetId);
        if (cluster) showClusterDetails(cluster, manholes);
      }
    };
  });
}

function attachHotspotClickEvents() {
  document.querySelectorAll('.hotspot-item').forEach(item => {
    item.removeEventListener('click', item.clickHandler);
    const handler = function() {
      const lat = parseFloat(this.dataset.lat);
      const lng = parseFloat(this.dataset.lng);
      const assetId = this.dataset.assetId;
      const asset = currentManholesData.find(a => a.id == assetId || a.manhole_id == assetId);
      if (asset) {
        showHotspotDetails(asset, currentManholesData);
      } else if (!isNaN(lat) && !isNaN(lng)) {
        zoomToLocation(lat, lng, 18);
      }
    };
    item.clickHandler = handler;
    item.addEventListener('click', handler);
  });
}

function updateProblemAssets(manholes) {
  currentManholesData = manholes;
  const analysis = detectHotspots(manholes);
  const container = document.getElementById('problemAssetsList');
  if (container) {
    if (!analysis.hotspots.length) {
      container.innerHTML = '<div class="stat-row" style="color:#a5d6a7;">✅ No significant hotspots detected</div>';
    } else {
      container.innerHTML = analysis.hotspots.slice(0,5).map(m => {
        const isCritical = isCriticalAsset(m);
        return `
          <div class="stat-row hotspot-item ${isCritical ? 'critical-hotspot' : ''}" 
               data-lat="${m.lat || 0}" 
               data-lng="${m.lng || 0}" 
               data-asset-id="${m.id || m.manhole_id}"
               style="display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #1a3a1a; cursor:pointer; background:${isCritical ? 'rgba(220,53,69,0.1)' : 'transparent'};">
            <span style="color:${isCritical ? '#ff6b6b' : '#a5d6a7'};">${isCritical ? '🔴' : '🔥'} ${m.manhole_id || m.name || 'Asset'} - ${m.suburb || m.suburb_nam || 'N/A'}</span>
            <span class="hotspot-value" style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${getBlockageCount(m)} blockages</span>
            <button class="view-details-btn" data-asset-id="${m.id || m.manhole_id}" style="background:#1a472a; border:1px solid #2e7d32; border-radius:3px; color:#69f0ae; padding:2px 6px; cursor:pointer;">Analyze</button>
          </div>
        `;
      }).join('');
    }
  }
  
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const parent = this.closest('.hotspot-item');
      if (parent) {
        const assetId = parent.dataset.assetId;
        const asset = manholes.find(a => a.id == assetId || a.manhole_id == assetId);
        if (asset) {
          showHotspotDetails(asset, manholes);
        }
      }
    };
  });
  
  attachHotspotClickEvents();
  attachDrillDownEvents(manholes);
}

function updateStatistics(manholes) {
  const analysis = detectHotspots(manholes);
  const statsContainer = document.getElementById('hotspotStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">📊 Total Blockage Score:</span><span style="color:#a5d6a7;">${analysis.stats.totalBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">📈 Average per Asset:</span><span style="color:#a5d6a7;">${analysis.stats.avgBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">⚠️ Worst Blockage:</span><span style="color:#a5d6a7;">${analysis.stats.maxBlockages}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">🔥 Hotspots Detected:</span><span class="hotspot-count" style="color:#ff6b6b;">${analysis.stats.hotspotCount}</span></div>
    `;
  }
}

// ---------- RENDER & EXPORTS ----------
function render() {
  return `
    <div class="hotspots-container">
      <div class="chart-container">
        <h4 style="color:#69f0ae; margin-bottom:8px;">🔥 CRITICAL & PROBLEM ASSETS (Top 5)</h4>
        <div id="problemAssetsList" class="hotspot-list" style="max-height: 200px; overflow-y: auto;"><div class="stat-row" style="color:#a5d6a7;">📋 Loading assets...</div></div>
        <p style="font-size: 10px; color: #ff6b6b; margin-top: 8px;">🔴 Red = Critical / Blocked | 🔥 Click any asset to analyze hotspot on map</p>
      </div>
      <div class="chart-container">
        <h4 style="color:#69f0ae; margin-bottom:8px;">📊 SPATIAL ANALYSIS REPORT</h4>
        <div id="spatialAnalysisStats" style="max-height: 350px; overflow-y: auto;"><div class="stat-row" style="color:#a5d6a7;">Loading spatial analysis...</div></div>
      </div>
      <div class="chart-container">
        <h4 style="color:#69f0ae; margin-bottom:8px;">📈 SUMMARY STATISTICS</h4>
        <div id="hotspotStats"><div class="stat-row" style="color:#a5d6a7;">Loading statistics...</div></div>
      </div>
    </div>
  `;
}

function init() {
  updateProblemAssets([]);
  updateSpatialAnalysis([]);
  updateStatistics([]);
}

function update(manholes) {
  if (manholes && manholes.length) {
    updateProblemAssets(manholes);
    updateSpatialAnalysis(manholes);
    updateStatistics(manholes);
  } else {
    updateProblemAssets([]);
    updateSpatialAnalysis([]);
    updateStatistics([]);
  }
}

export default {
  render,
  init,
  update
};