// components/hotspots.js - Advanced Spatial Cluster Analysis for Sewer Networks
// Detects statistically significant clusters of blocked/critical manholes
// ============================================================

let currentManholesData = [];
let selectedHotspot = null;
let drillDownLevel = 0;
let breadcrumbPath = [];

// ---------- HELPER: Get numeric blockage count from various field names ----------
function getBlockageCount(m) {
  if (!m) return 0;
  
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
  if (!m) return false;
  const status = String(m.bloc_stat || m.status || '').toLowerCase();
  return status === 'blocked' || status === 'critical';
}

// ---------- Spatial helpers ----------
function calculateDistance(lat1, lng1, lat2, lng2) {
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 999;
  
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ---------- SPATIAL CLUSTER DETECTION (Statistical Hotspot Analysis) ----------
function calculateClusterScores(points, distanceBand = 1.0) {
  if (!points || points.length === 0) return [];
  
  // Filter out points without valid lat/lng
  const validPoints = points.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
  if (validPoints.length === 0) return [];
  
  const blockageValues = validPoints.map(p => getBlockageCount(p));
  const totalBlockages = blockageValues.reduce((a,b) => a+b, 0);
  const meanBlockage = totalBlockages / validPoints.length;
  
  let sumSquares = 0;
  for (let v of blockageValues) {
    sumSquares += Math.pow(v - meanBlockage, 2);
  }
  
  // Avoid division by zero
  if (sumSquares === 0) {
    return validPoints.map(p => ({
      ...p,
      blockageScore: getBlockageCount(p),
      clusterScore: 0,
      isCluster: false,
      confidence: 'No variation'
    }));
  }

  const results = [];
  for (let i = 0; i < validPoints.length; i++) {
    let sumW = 0, sumWx = 0, sumW2 = 0;
    
    for (let j = 0; j < validPoints.length; j++) {
      const dist = calculateDistance(
        validPoints[i].lat, validPoints[i].lng,
        validPoints[j].lat, validPoints[j].lng
      );
      const weight = dist <= distanceBand ? 1 : 0;
      
      if (weight > 0) {
        sumW += weight;
        sumWx += weight * blockageValues[j];
        sumW2 += weight * weight;
      }
    }
    
    if (sumW > 0) {
      const numerator = sumWx - (sumW * meanBlockage);
      const denominator = Math.sqrt((sumSquares / (validPoints.length - 1)) * 
                         ((validPoints.length * sumW2 - Math.pow(sumW, 2)) / (validPoints.length - 1)));
      const clusterScore = (denominator !== 0 && denominator !== undefined) ? numerator / denominator : 0;
      
      results.push({
        ...validPoints[i],
        blockageScore: blockageValues[i],
        clusterScore: clusterScore,
        isCluster: clusterScore > 1.96,
        confidence: clusterScore > 2.58 ? '99%' : (clusterScore > 1.96 ? '95%' : (clusterScore > 1.65 ? '90%' : 'Not significant'))
      });
    } else {
      results.push({
        ...validPoints[i],
        blockageScore: blockageValues[i],
        clusterScore: 0,
        isCluster: false,
        confidence: 'No neighbors'
      });
    }
  }
  
  return results.sort((a,b) => b.clusterScore - a.clusterScore);
}

// ---------- MAIN CLUSTER DETECTION ----------
function detectClusters(manholes) {
  if (!manholes || manholes.length === 0) {
    return { clusters: [], allResults: [] };
  }

  const allResults = calculateClusterScores(manholes, 1.0);
  const clusters = allResults.filter(r => r && r.isCluster === true);
  
  return {
    clusters: clusters,
    allResults: allResults
  };
}

// ---------- ZOOM TO LOCATION ----------
function zoomToLocation(lat, lng, zoom = 18) {
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    document.dispatchEvent(new CustomEvent('zoomToLocation', { 
      detail: { lat: parseFloat(lat), lng: parseFloat(lng), zoom: zoom } 
    }));
  }
}

// ---------- SHOW CLUSTER ON MAP ----------
function showClusterOnMap(cluster) {
  if (cluster && cluster.lat && cluster.lng && !isNaN(cluster.lat) && !isNaN(cluster.lng)) {
    zoomToLocation(cluster.lat, cluster.lng, 18);
    
    document.dispatchEvent(new CustomEvent('highlightAsset', {
      detail: { 
        assetId: cluster.manhole_id || cluster.id,
        lat: cluster.lat,
        lng: cluster.lng,
        isCritical: isCriticalAsset(cluster)
      }
    }));
  }
}

// ---------- DRILL-DOWN FUNCTIONS ----------
function showClusterDetails(cluster, allManholes) {
  if (!cluster) return;
  
  drillDownLevel = 1;
  selectedHotspot = cluster;
  breadcrumbPath = ['Overview', `Cluster: ${cluster.manhole_id || cluster.name || 'Asset'}`];
  
  showClusterOnMap(cluster);
  updateAnalysisWithDrillDown(allManholes, 'cluster', { cluster });
}

function showAssetDetails(asset, allManholes) {
  if (!asset) return;
  
  drillDownLevel = 2;
  breadcrumbPath = ['Overview', `Cluster: ${selectedHotspot?.manhole_id || selectedHotspot?.name || 'Unknown'}`, `Asset: ${asset.manhole_id || asset.name}`];
  
  zoomToLocation(asset.lat, asset.lng, 19);
  
  updateAnalysisWithDrillDown(allManholes, 'asset', { asset });
}

function goBackToOverview(allManholes) {
  drillDownLevel = 0;
  selectedHotspot = null;
  breadcrumbPath = ['Overview'];
  updateClusterAnalysis(allManholes);
}

// ---------- DRILL-DOWN UI RENDER ----------
function updateAnalysisWithDrillDown(manholes, viewType, viewData) {
  const container = document.getElementById('spatialAnalysisStats');
  if (!container) return;

  const breadcrumbHtml = `
    <div class="breadcrumb-nav" style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #2e7d32;">
      ${breadcrumbPath.map((crumb, idx) => `
        <span class="breadcrumb-item ${idx === breadcrumbPath.length-1 ? 'active' : ''}" style="${idx === breadcrumbPath.length-1 ? 'color:#69f0ae;' : 'color:#a5d6a7;'}">${escapeHtml(crumb)}</span>
        ${idx < breadcrumbPath.length-1 ? '<span class="breadcrumb-sep" style="color:#2e7d32;"> › </span>' : ''}
      `).join('')}
      ${drillDownLevel > 0 ? '<button class="back-btn" id="backToOverviewBtn" style="margin-left:10px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:2px 8px; cursor:pointer;">← Back</button>' : ''}
    </div>
  `;

  if (viewType === 'cluster' && viewData.cluster) {
    const c = viewData.cluster;
    const isCritical = isCriticalAsset(c);
    const clusterScoreVal = (c.clusterScore !== undefined) ? c.clusterScore.toFixed(3) : 'N/A';
    
    container.innerHTML = `
      ${breadcrumbHtml}
      <div class="analysis-section cluster-detail">
        <h5 style="color:#69f0ae; margin-bottom:8px;">🔥 CLUSTER DETAILS</h5>
        <div class="detail-card" style="background:#0d2818; padding:10px; border-radius:6px; border-left: 3px solid ${isCritical ? '#dc3545' : '#ffc107'};">
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Asset ID:</span><strong style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${escapeHtml(c.manhole_id || c.name || 'N/A')}</strong></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Location:</span><span style="color:#a5d6a7;">${escapeHtml(c.suburb || c.suburb_nam || 'N/A')}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Blockage Score:</span><span class="cluster-value" style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${getBlockageCount(c)}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Cluster Intensity:</span><span style="color:#69f0ae;">${clusterScoreVal}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Confidence Level:</span><span style="color:#69f0ae;">${escapeHtml(c.confidence || 'N/A')}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">Status:</span><span style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${escapeHtml(c.bloc_stat || c.status || 'Unknown')}</span></div>
          <button class="zoom-btn" data-lat="${c.lat || 0}" data-lng="${c.lng || 0}" style="margin-top:8px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:4px 8px; cursor:pointer;">📍 Zoom to Location</button>
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
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Asset ID:</span><strong style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${escapeHtml(a.manhole_id || a.name || 'N/A')}</strong></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Suburb:</span><span style="color:#a5d6a7;">${escapeHtml(a.suburb || a.suburb_nam || 'N/A')}</span></div>
          <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="color:#7cb342;">Status:</span><span style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">${escapeHtml(a.bloc_stat || a.status || 'Unknown')}</span></div>
          <button class="zoom-btn" data-lat="${a.lat || 0}" data-lng="${a.lng || 0}" style="margin-top:8px; background:#1a472a; border:1px solid #2e7d32; border-radius:4px; color:#69f0ae; padding:4px 8px; cursor:pointer;">📍 Zoom to Location</button>
        </div>
      </div>
    `;
  }
  
  attachDrillDownEvents(manholes);
}

// Simple escape function to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function updateClusterAnalysis(manholes) {
  currentManholesData = manholes || [];
  const analysis = detectClusters(currentManholesData);
  const container = document.getElementById('spatialAnalysisStats');
  
  if (!container) return;
  
  if (!currentManholesData.length) {
    container.innerHTML = '<div class="stat-row" style="color:#a5d6a7;">No data available for cluster analysis</div>';
    return;
  }
  
  const totalBlockage = currentManholesData.reduce((sum, m) => sum + getBlockageCount(m), 0);
  
  container.innerHTML = `
    <div class="analysis-section">
      <h5 style="color:#69f0ae; margin-bottom:8px;">🔥 SPATIAL CLUSTER ANALYSIS</h5>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">Total Assets Analyzed:</span><span style="color:#a5d6a7;">${currentManholesData.length}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#7cb342;">Critical Clusters Detected:</span><span class="cluster-count" style="color:#ff6b6b;">${analysis.clusters.length}</span></div>
      <div class="stat-row" style="display:flex; justify-content:space-between;"><span style="color:#7cb342;">Total Blockage Score:</span><span style="color:#a5d6a7;">${totalBlockage}</span></div>
    </div>
    <div class="analysis-section" style="margin-top:12px;">
      <h5 style="color:#69f0ae; margin-bottom:8px;">🎯 HIGH-CONFIDENCE CLUSTERS (95%+ confidence)</h5>
      ${analysis.clusters.length ? `
        <div class="cluster-list">
          ${analysis.clusters.slice(0,5).map(r => `
            <div class="cluster-item" data-lat="${r.lat || 0}" data-lng="${r.lng || 0}" data-asset-id="${r.id || ''}" style="display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid #1a3a1a; cursor:pointer;">
              <span style="color:#a5d6a7;">📍 ${escapeHtml(r.manhole_id || r.name || 'Asset')}</span>
              <span style="color:#69f0ae;">Score: ${(r.clusterScore || 0).toFixed(2)} (${escapeHtml(r.confidence || 'N/A')})</span>
              <button class="view-cluster-btn" style="background:#0d2818; border:1px solid #2e7d32; border-radius:3px; color:#69f0ae; padding:2px 6px; cursor:pointer;">View</button>
            </div>
          `).join('')}
        </div>
      ` : '<div class="stat-row" style="color:#a5d6a7;">No significant clusters detected</div>'}
    </div>
  `;
  
  attachDrillDownEvents(currentManholesData);
}

function attachDrillDownEvents(manholes) {
  const backBtn = document.getElementById('backToOverviewBtn');
  if (backBtn) {
    backBtn.onclick = function(e) {
      e.preventDefault();
      goBackToOverview(manholes);
    };
  }

  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const lat = parseFloat(this.dataset.lat);
      const lng = parseFloat(this.dataset.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        zoomToLocation(lat, lng, 18);
      }
    };
  });

  document.querySelectorAll('.view-cluster-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const parent = this.closest('.cluster-item');
      if (parent) {
        const lat = parseFloat(parent.dataset.lat);
        const lng = parseFloat(parent.dataset.lng);
        const assetId = parent.dataset.assetId;
        const cluster = manholes.find(a => a.id == assetId || a.manhole_id == assetId);
        if (cluster) {
          showClusterDetails(cluster, manholes);
        } else if (!isNaN(lat) && !isNaN(lng)) {
          showClusterDetails({ lat: lat, lng: lng, manhole_id: assetId, confidence: 'Unknown' }, manholes);
        }
      }
    };
  });
}

function updateProblemAssets(manholes) {
  currentManholesData = manholes || [];
  const analysis = detectClusters(currentManholesData);
  const container = document.getElementById('problemAssetsList');
  
  if (!container) return;
  
  if (!analysis.clusters.length) {
    container.innerHTML = '<div class="stat-row" style="color:#a5d6a7;">✅ No critical clusters detected</div>';
    return;
  }
  
  container.innerHTML = analysis.clusters.slice(0,5).map(m => {
    const isCritical = isCriticalAsset(m);
    const clusterScoreVal = (m.clusterScore !== undefined) ? m.clusterScore.toFixed(2) : '0.00';
    
    return `
      <div class="stat-row cluster-item ${isCritical ? 'critical-cluster' : ''}" 
           data-lat="${m.lat || 0}" 
           data-lng="${m.lng || 0}" 
           data-asset-id="${m.id || m.manhole_id || ''}"
           style="display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #1a3a1a; cursor:pointer; background:${isCritical ? 'rgba(220,53,69,0.1)' : 'transparent'};">
        <span style="color:${isCritical ? '#ff6b6b' : '#a5d6a7'};">${isCritical ? '🔴' : '🔥'} ${escapeHtml(m.manhole_id || m.name || 'Asset')} - ${escapeHtml(m.suburb || m.suburb_nam || 'N/A')}</span>
        <span class="cluster-value" style="color:${isCritical ? '#ff6b6b' : '#ffd93d'};">Gi* value: ${clusterScoreVal}</span>
        <button class="view-details-btn" data-asset-id="${m.id || m.manhole_id || ''}" style="background:#1a472a; border:1px solid #2e7d32; border-radius:3px; color:#69f0ae; padding:2px 6px; cursor:pointer;">Analyze</button>
      </div>
    `;
  }).join('');
  
  // Attach click handlers
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const parent = this.closest('.cluster-item');
      if (parent) {
        const assetId = parent.dataset.assetId;
        const asset = currentManholesData.find(a => a.id == assetId || a.manhole_id == assetId);
        if (asset) {
          showClusterDetails(asset, currentManholesData);
        }
      }
    };
  });
  
  document.querySelectorAll('.cluster-item').forEach(item => {
    item.onclick = function(e) {
      if (e.target.classList && e.target.classList.contains('view-details-btn')) return;
      
      const assetId = this.dataset.assetId;
      const asset = currentManholesData.find(a => a.id == assetId || a.manhole_id == assetId);
      if (asset) {
        showClusterDetails(asset, currentManholesData);
      } else {
        const lat = parseFloat(this.dataset.lat);
        const lng = parseFloat(this.dataset.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          zoomToLocation(lat, lng, 18);
        }
      }
    };
  });
}

// ---------- RENDER & EXPORTS ----------
function render() {
  return `
    <div class="hotspots-container">
      <div class="chart-container">
        <h4 style="color:#69f0ae; margin-bottom:8px;">🔥 CRITICAL CLUSTERS (Top 5)</h4>
        <div id="problemAssetsList" class="cluster-list" style="max-height: 200px; overflow-y: auto;"><div class="stat-row" style="color:#a5d6a7;">📋 Loading assets...</div></div>
        <p style="font-size: 10px; color: #ff6b6b; margin-top: 8px;">🔴 Red = Critical / Blocked | 🔥 Click any asset to analyze cluster on map</p>
      </div>
      <div class="chart-container">
        <h4 style="color:#69f0ae; margin-bottom:8px;">📊 SPATIAL CLUSTER REPORT</h4>
        <div id="spatialAnalysisStats" style="max-height: 350px; overflow-y: auto;"><div class="stat-row" style="color:#a5d6a7;">Loading cluster analysis...</div></div>
      </div>
    </div>
  `;
}

function init() {
  updateProblemAssets([]);
  updateClusterAnalysis([]);
}

function update(manholes) {
  if (manholes && manholes.length) {
    updateProblemAssets(manholes);
    updateClusterAnalysis(manholes);
  } else {
    updateProblemAssets([]);
    updateClusterAnalysis([]);
  }
}

export default {
  render,
  init,
  update
};