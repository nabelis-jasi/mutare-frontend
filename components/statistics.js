// components/statistics.js - Statistics Component

let pieChartInstance = null;
let barChartInstance = null;
let doughnutChartInstance = null;

function render() {
    return `
        <div style="padding: 12px;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="color: #69f0ae; font-family: monospace; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px;">📊 NETWORK SUMMARY</div>
                    <div style="height: 2px; width: 40px; background: #2e7d32; margin-top: 4px;"></div>
                </div>
                <div id="pieChartIcon" style="cursor: pointer; background: #1a3a2a; padding: 6px 10px; border-radius: 20px; font-size: 11px; transition: all 0.2s;">
                    📈 Stats
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: #0d2818; border-radius: 8px; padding: 12px 8px; text-align: center; border: 1px solid #9b59b6;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #9b59b6; font-family: monospace;" id="totalManholes">0</div>
                    <div style="font-size: 9px; color: #c9a0ff; font-weight: 600; margin-top: 4px;">MANHOLES</div>
                </div>
                
                <div style="background: #0d2818; border-radius: 8px; padding: 12px 8px; text-align: center; border: 1px solid #32cd32;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #32cd32; font-family: monospace;" id="totalPipelines">0</div>
                    <div style="font-size: 9px; color: #6bff6b; font-weight: 600; margin-top: 4px;">PIPELINES</div>
                </div>
                
                <div style="background: #0d2818; border-radius: 8px; padding: 12px 8px; text-align: center; border: 1px solid #dc3545;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #dc3545; font-family: monospace;" id="criticalAssets">0</div>
                    <div style="font-size: 9px; color: #ff6b6b; font-weight: 600; margin-top: 4px;">CRITICAL</div>
                </div>
                
                <div style="background: #0d2818; border-radius: 8px; padding: 12px 8px; text-align: center; border: 1px solid #ffc107;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: #ffc107; font-family: monospace;" id="warningAssets">0</div>
                    <div style="font-size: 9px; color: #ffd93d; font-weight: 600; margin-top: 4px;">WARNING</div>
                </div>
            </div>
        </div>
    `;
}

// Get real data - Try multiple sources
function getRealMapData() {
    let manholes = 0;
    let pipelines = 0;
    let criticalAssets = 0;
    let warningAssets = 0;
    
    // Source 1: Check global mapLayers object
    if (window.mapLayers) {
        if (window.mapLayers.manholes && typeof window.mapLayers.manholes.getLayers === 'function') {
            manholes = window.mapLayers.manholes.getLayers().length;
        }
        if (window.mapLayers.pipelines && typeof window.mapLayers.pipelines.getLayers === 'function') {
            pipelines = window.mapLayers.pipelines.getLayers().length;
        }
        if (window.mapLayers.critical && typeof window.mapLayers.critical.getLayers === 'function') {
            criticalAssets = window.mapLayers.critical.getLayers().length;
        }
        if (window.mapLayers.warning && typeof window.mapLayers.warning.getLayers === 'function') {
            warningAssets = window.mapLayers.warning.getLayers().length;
        }
    }
    
    // Source 2: Check global networkStats object
    if (window.networkStats) {
        manholes = window.networkStats.manholes !== undefined ? window.networkStats.manholes : manholes;
        pipelines = window.networkStats.pipelines !== undefined ? window.networkStats.pipelines : pipelines;
        criticalAssets = window.networkStats.critical !== undefined ? window.networkStats.critical : criticalAssets;
        warningAssets = window.networkStats.warning !== undefined ? window.networkStats.warning : warningAssets;
    }
    
    // Source 3: Check for window.manholeData array
    if (window.manholeData && Array.isArray(window.manholeData)) {
        manholes = window.manholeData.length;
        // Count critical/warning from manhole data
        if (window.manholeData.length > 0 && window.manholeData[0].bloc_stat) {
            criticalAssets = window.manholeData.filter(m => m.bloc_stat === 'blocked' || m.bloc_stat === 'critical').length;
            warningAssets = window.manholeData.filter(m => m.bloc_stat === 'warning').length;
        }
    }
    
    // Source 4: Check for window.pipelineData array
    if (window.pipelineData && Array.isArray(window.pipelineData)) {
        pipelines = window.pipelineData.length;
    }
    
    // Source 5: Check DOM elements from map (Leaflet layer counts)
    if (manholes === 0 && window.map && window.map.eachLayer) {
        let manholeCount = 0;
        let pipelineCount = 0;
        window.map.eachLayer(function(layer) {
            if (layer.options && layer.options.pane === 'manholePane') manholeCount++;
            if (layer.options && layer.options.pane === 'pipelinePane') pipelineCount++;
            if (layer.feature && layer.feature.properties && layer.feature.properties.type === 'manhole') manholeCount++;
            if (layer.feature && layer.feature.properties && layer.feature.properties.type === 'pipeline') pipelineCount++;
        });
        if (manholeCount > 0) manholes = manholeCount;
        if (pipelineCount > 0) pipelines = pipelineCount;
    }
    
    // Source 6: Check for PostGIS/API data from your database
    if (window.dbStats) {
        manholes = window.dbStats.manholes || manholes;
        pipelines = window.dbStats.pipelines || pipelines;
        criticalAssets = window.dbStats.critical || criticalAssets;
        warningAssets = window.dbStats.warning || warningAssets;
    }
    
    // Log what we found for debugging
    console.log('📊 Statistics data source:', { manholes, pipelines, criticalAssets, warningAssets });
    
    return { manholes, pipelines, criticalAssets, warningAssets };
}

// Update summary cards
function updateSummaryCards(data) {
    const manholesEl = document.getElementById('totalManholes');
    const pipelinesEl = document.getElementById('totalPipelines');
    const criticalEl = document.getElementById('criticalAssets');
    const warningEl = document.getElementById('warningAssets');
    
    if (manholesEl) manholesEl.innerText = data.manholes;
    if (pipelinesEl) pipelinesEl.innerText = data.pipelines;
    if (criticalEl) criticalEl.innerText = data.criticalAssets;
    if (warningEl) warningEl.innerText = data.warningAssets;
}

function destroyCharts() {
    if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
    if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
    if (doughnutChartInstance) { doughnutChartInstance.destroy(); doughnutChartInstance = null; }
}

function createPieChart(data) {
    const canvas = document.getElementById('pieChartCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    
    const total = data.manholes + data.pipelines + data.criticalAssets + data.warningAssets;
    
    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Manholes', 'Pipelines', 'Critical', 'Warning'],
            datasets: [{
                data: [data.manholes, data.pipelines, data.criticalAssets, data.warningAssets],
                backgroundColor: ['#9b59b6', '#32cd32', '#dc3545', '#ffc107'],
                borderColor: '#0d2818',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff', font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createBarChart(data) {
    const canvas = document.getElementById('barChartCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Critical Assets', 'Warning Assets'],
            datasets: [{
                label: 'Count',
                data: [data.criticalAssets, data.warningAssets],
                backgroundColor: ['#dc3545', '#ffc107'],
                borderColor: '#0d2818',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top', labels: { color: '#fff', font: { size: 10 } } } },
            scales: { y: { beginAtZero: true, ticks: { color: '#fff', stepSize: 1 } }, x: { ticks: { color: '#fff' } } }
        }
    });
}

function createDoughnutChart(data) {
    const canvas = document.getElementById('doughnutCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (doughnutChartInstance) doughnutChartInstance.destroy();
    
    const total = data.manholes + data.pipelines;
    
    doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Manholes', 'Pipelines'],
            datasets: [{
                data: [data.manholes, data.pipelines],
                backgroundColor: ['#9b59b6', '#32cd32'],
                borderColor: '#0d2818',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff', font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}% of network)`;
                        }
                    }
                }
            }
        }
    });
}

function updateModal(data) {
    const modalManholes = document.getElementById('modalManholes');
    const modalPipelines = document.getElementById('modalPipelines');
    const modalCritical = document.getElementById('modalCritical');
    const modalWarning = document.getElementById('modalWarning');
    const modalTotal = document.getElementById('modalTotal');
    
    if (modalManholes) modalManholes.innerText = data.manholes;
    if (modalPipelines) modalPipelines.innerText = data.pipelines;
    if (modalCritical) modalCritical.innerText = data.criticalAssets;
    if (modalWarning) modalWarning.innerText = data.warningAssets;
    if (modalTotal) modalTotal.innerText = data.manholes + data.pipelines;
    
    setTimeout(() => {
        createPieChart(data);
        createBarChart(data);
        createDoughnutChart(data);
    }, 100);
}

function createModal() {
    if (document.getElementById('statsModal')) return;
    
    const modalHTML = `
        <div id="statsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: #0d2818; border-radius: 16px; width: 90%; max-width: 850px; max-height: 85vh; overflow-y: auto; border: 1px solid #2e7d32;">
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #2e7d32; padding-bottom: 15px;">
                        <h3 style="color: #69f0ae; margin: 0; font-size: 18px;">📊 Network Statistics Dashboard</h3>
                        <button id="closeModalBtn" style="background: #dc3545; border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold;">×</button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="background: #1a3a2a; border-radius: 12px; padding: 15px;">
                            <h4 style="color: #fff; margin: 0 0 15px 0; font-size: 14px;">📈 Asset Distribution</h4>
                            <canvas id="pieChartCanvas" width="200" height="200" style="width: 100%; height: auto; max-width: 220px; margin: 0 auto; display: block;"></canvas>
                        </div>
                        
                        <div style="background: #1a3a2a; border-radius: 12px; padding: 15px;">
                            <h4 style="color: #fff; margin: 0 0 15px 0; font-size: 14px;">⚠️ Critical vs Warning</h4>
                            <canvas id="barChartCanvas" width="200" height="200" style="width: 100%; height: auto; max-width: 280px; margin: 0 auto; display: block;"></canvas>
                        </div>
                        
                        <div style="background: #1a3a2a; border-radius: 12px; padding: 15px;">
                            <h4 style="color: #fff; margin: 0 0 15px 0; font-size: 14px;">🕳️ Network Composition</h4>
                            <canvas id="doughnutCanvas" width="200" height="200" style="width: 100%; height: auto; max-width: 220px; margin: 0 auto; display: block;"></canvas>
                        </div>
                        
                        <div style="background: #1a3a2a; border-radius: 12px; padding: 15px;">
                            <h4 style="color: #fff; margin: 0 0 15px 0; font-size: 14px;">📋 Summary</h4>
                            <div style="font-size: 13px;">
                                <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                    <span><span style="color:#9b59b6;">●</span> Manholes:</span>
                                    <span id="modalManholes" style="font-weight: bold; color:#9b59b6;">0</span>
                                </div>
                                <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                    <span><span style="color:#32cd32;">●</span> Pipelines:</span>
                                    <span id="modalPipelines" style="font-weight: bold; color:#32cd32;">0</span>
                                </div>
                                <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                    <span><span style="color:#dc3545;">●</span> Critical:</span>
                                    <span id="modalCritical" style="font-weight: bold; color:#dc3545;">0</span>
                                </div>
                                <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                                    <span><span style="color:#ffc107;">●</span> Warning:</span>
                                    <span id="modalWarning" style="font-weight: bold; color:#ffc107;">0</span>
                                </div>
                                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #2e7d32; display: flex; justify-content: space-between;">
                                    <span><span style="color:#17a2b8;">●</span> Total Network:</span>
                                    <span id="modalTotal" style="font-weight: bold; color:#69f0ae;">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; background: #0d1f12; border-radius: 8px; padding: 12px;">
                        <h4 style="color: #69f0ae; margin: 0 0 10px 0; font-size: 11px;">🎨 LEGEND</h4>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 11px;">
                            <div><span style="display: inline-block; width: 14px; height: 14px; background: #9b59b6; border-radius: 3px; margin-right: 6px;"></span> Manholes</div>
                            <div><span style="display: inline-block; width: 14px; height: 14px; background: #32cd32; border-radius: 3px; margin-right: 6px;"></span> Pipelines</div>
                            <div><span style="display: inline-block; width: 14px; height: 14px; background: #dc3545; border-radius: 3px; margin-right: 6px;"></span> Critical Status</div>
                            <div><span style="display: inline-block; width: 14px; height: 14px; background: #ffc107; border-radius: 3px; margin-right: 6px;"></span> Warning Status</div>
                        </div>
                        <div style="margin-top: 8px; font-size: 10px; color: #6bff6b; text-align: center;">
                            Data source: Current map layers | Last updated: <span id="statsTimestamp">Just now</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showModal() {
    if (!document.getElementById('statsModal')) {
        createModal();
        setupModalEvents();
    }
    
    const modal = document.getElementById('statsModal');
    if (modal) {
        const freshData = getRealMapData();
        updateSummaryCards(freshData);
        updateModal(freshData);
        modal.style.display = 'flex';
        
        const timestamp = document.getElementById('statsTimestamp');
        if (timestamp) timestamp.innerText = new Date().toLocaleTimeString();
    }
}

function hideModal() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.style.display = 'none';
}

function setupModalEvents() {
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    
    const modal = document.getElementById('statsModal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
    
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });
}

async function init() {
    console.log('📊 Statistics component initialized');
    createModal();
    setupModalEvents();
    
    const initialData = getRealMapData();
    updateSummaryCards(initialData);
    
    const icon = document.getElementById('pieChartIcon');
    if (icon) icon.addEventListener('click', showModal);
}

async function update() {
    const freshData = getRealMapData();
    updateSummaryCards(freshData);
    console.log('📊 Statistics updated:', freshData);
}

export default { render, init, update };