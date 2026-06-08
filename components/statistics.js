// components/statistics.js - Statistics Component with Charts & Summary
// Fetches live data from Python Flask backend API
// Tabs: Asset Health (Bar/Pie Chart) and Quick Summary

let assetStatusChart = null;
let currentChartType = 'bar'; // 'bar' or 'pie'
let currentData = {
    manholesCount: 0,
    pipelinesCount: 0,
    complaintsCount: 0,
    criticalCount: 0,
    warningCount: 0,
    goodCount: 0,
    totalBlockages: 0,
    avgBlockages: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0,
    completedJobs: 0,
    inProgressJobs: 0,
    manholesCritical: 0,
    manholesWarning: 0,
    manholesGood: 0,
    pipelinesCritical: 0,
    pipelinesWarning: 0,
    pipelinesGood: 0
};

let currentView = 'menu';

const API_BASE_URL = 'http://localhost:5000/api';

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/summary`);
        if (!response.ok) throw new Error('Stats fetch failed');
        const data = await response.json();
        console.log('Stats data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
}

async function fetchAssetStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/asset_status`);
        if (!response.ok) throw new Error('Asset status fetch failed');
        const data = await response.json();
        console.log('Asset status received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching asset status:', error);
        return {
            manholes: { critical: 0, warning: 0, good: 0 },
            pipelines: { critical: 0, warning: 0, good: 0 }
        };
    }
}

// ============================================
// CHART FUNCTIONS
// ============================================

function initBarChart() {
    const assetCtx = document.getElementById('assetStatusChart')?.getContext('2d');
    if (assetCtx) {
        if (assetStatusChart) assetStatusChart.destroy();
        assetStatusChart = new Chart(assetCtx, {
            type: 'bar',
            data: {
                labels: ['Manholes', 'Pipelines'],
                datasets: [
                    {
                        label: '🔴 Critical',
                        data: [currentData.manholesCritical, currentData.pipelinesCritical],
                        backgroundColor: '#dc3545',
                        borderRadius: 4
                    },
                    {
                        label: '🟡 Warning',
                        data: [currentData.manholesWarning, currentData.pipelinesWarning],
                        backgroundColor: '#ffc107',
                        borderRadius: 4
                    },
                    {
                        label: 'Normal',
                        data: [currentData.manholesGood, currentData.pipelinesGood],
                        backgroundColor: ['#9b59b6', '#32cd32'],
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#a5d6a7', font: { size: 9 } }
                    },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                },
                scales: {
                    x: { 
                        ticks: { color: '#a5d6a7', font: { weight: 'bold' } },
                        grid: { color: '#2a4a2a' }
                    },
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: '#a5d6a7' },
                        grid: { color: '#2a4a2a' },
                        title: { display: true, text: 'Number of Assets', color: '#7cb342' },
                        stacked: true
                    }
                }
            }
        });
    }
}

function initPieChart() {
    const assetCtx = document.getElementById('assetStatusChart')?.getContext('2d');
    if (assetCtx) {
        if (assetStatusChart) assetStatusChart.destroy();
        assetStatusChart = new Chart(assetCtx, {
            type: 'pie',
            data: {
                labels: [
                    'Manholes Critical', 'Manholes Warning', 'Manholes Normal',
                    'Pipelines Critical', 'Pipelines Warning', 'Pipelines Normal'
                ],
                datasets: [{
                    data: [
                        currentData.manholesCritical,
                        currentData.manholesWarning,
                        currentData.manholesGood,
                        currentData.pipelinesCritical,
                        currentData.pipelinesWarning,
                        currentData.pipelinesGood
                    ],
                    backgroundColor: ['#dc3545', '#ffc107', '#9b59b6', '#dc3545', '#ffc107', '#32cd32'],
                    borderColor: '#0a1f0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#a5d6a7', font: { size: 9 } }
                    },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                }
            }
        });
    }
}

function switchChartType() {
    if (currentChartType === 'bar') {
        currentChartType = 'pie';
        initPieChart();
        const btn = document.getElementById('chartTypeBtn');
        if (btn) btn.innerHTML = '📊 Switch to Bar Chart';
    } else {
        currentChartType = 'bar';
        initBarChart();
        const btn = document.getElementById('chartTypeBtn');
        if (btn) btn.innerHTML = '🥧 Switch to Pie Chart';
    }
}

// ============================================
// UPDATE FUNCTIONS
// ============================================

async function updateFromAPI() {
    const stats = await fetchStats();
    if (stats) {
        // Manholes
        currentData.manholesCount = stats.manholes?.total || 0;
        currentData.manholesCritical = stats.manholes?.critical || 0;
        currentData.manholesWarning = stats.manholes?.warning || 0;
        currentData.manholesGood = stats.manholes?.good || 0;
        
        // Pipelines
        currentData.pipelinesCount = stats.pipelines?.total || 0;
        currentData.pipelinesCritical = stats.pipelines?.critical || 0;
        currentData.pipelinesWarning = stats.pipelines?.warning || 0;
        currentData.pipelinesGood = stats.pipelines?.good || 0;
        
        // Complaints
        currentData.complaintsCount = stats.complaints?.total || 0;
        currentData.resolvedComplaints = stats.complaints?.resolved || 0;
        currentData.pendingComplaints = stats.complaints?.pending || 0;
        
        // Jobs
        currentData.completedJobs = stats.jobs?.completed || 0;
        currentData.inProgressJobs = stats.jobs?.in_progress || 0;
        
        // Blockages
        currentData.totalBlockages = stats.total_blockages || 0;
        currentData.avgBlockages = stats.avg_blockages || 0;
        
        // Totals
        currentData.criticalCount = currentData.manholesCritical + currentData.pipelinesCritical;
        currentData.warningCount = currentData.manholesWarning + currentData.pipelinesWarning;
        currentData.goodCount = currentData.manholesGood + currentData.pipelinesGood;
        
        updateQuickSummaryDOM();
        updateRiskBar();
        
        // Update asset chart if visible
        if (currentChartType === 'bar') {
            initBarChart();
        } else {
            initPieChart();
        }
        updateAssetDetailsDOM();
        
        console.log('Statistics updated from API:', currentData);
    }
}

function updateAssetDetailsDOM() {
    const manholesCriticalEl = document.getElementById('manholesCritical');
    const manholesWarningEl = document.getElementById('manholesWarning');
    const manholesGoodEl = document.getElementById('manholesGood');
    const pipelinesCriticalEl = document.getElementById('pipelinesCritical');
    const pipelinesWarningEl = document.getElementById('pipelinesWarning');
    const pipelinesGoodEl = document.getElementById('pipelinesGood');
    
    if (manholesCriticalEl) manholesCriticalEl.innerText = currentData.manholesCritical;
    if (manholesWarningEl) manholesWarningEl.innerText = currentData.manholesWarning;
    if (manholesGoodEl) manholesGoodEl.innerText = currentData.manholesGood;
    if (pipelinesCriticalEl) pipelinesCriticalEl.innerText = currentData.pipelinesCritical;
    if (pipelinesWarningEl) pipelinesWarningEl.innerText = currentData.pipelinesWarning;
    if (pipelinesGoodEl) pipelinesGoodEl.innerText = currentData.pipelinesGood;
    
    const criticalAssetsDetail = document.getElementById('criticalAssetsDetail');
    const warningAssetsDetail = document.getElementById('warningAssetsDetail');
    const goodAssetsDetail = document.getElementById('goodAssetsDetail');
    if (criticalAssetsDetail) criticalAssetsDetail.innerText = currentData.criticalCount;
    if (warningAssetsDetail) warningAssetsDetail.innerText = currentData.warningCount;
    if (goodAssetsDetail) goodAssetsDetail.innerText = currentData.goodCount;
}

function updateQuickSummaryDOM() {
    // Manholes - Purple (#9b59b6)
    const totalManholesEl = document.getElementById('totalManholes');
    if (totalManholesEl) {
        totalManholesEl.innerText = currentData.manholesCount.toLocaleString();
        totalManholesEl.style.color = '#9b59b6';
    }
    
    // Pipelines - Lime Green (#32cd32)
    const totalPipelinesEl = document.getElementById('totalPipelines');
    if (totalPipelinesEl) {
        totalPipelinesEl.innerText = currentData.pipelinesCount.toLocaleString();
        totalPipelinesEl.style.color = '#32cd32';
    }
    
    // Complaints - Yellow (#ffc107)
    const totalComplaintsEl = document.getElementById('totalComplaints');
    if (totalComplaintsEl) {
        totalComplaintsEl.innerText = currentData.complaintsCount.toLocaleString();
        totalComplaintsEl.style.color = '#ffc107';
    }
    
    // Blockages - Red (#dc3545)
    const totalBlockagesEl = document.getElementById('totalBlockages');
    if (totalBlockagesEl) {
        totalBlockagesEl.innerText = currentData.totalBlockages.toLocaleString();
        totalBlockagesEl.style.color = '#dc3545';
    }
    
    // Avg Blockages - Yellow (#ffc107)
    const avgBlockagesEl = document.getElementById('avgBlockages');
    if (avgBlockagesEl) {
        avgBlockagesEl.innerText = currentData.avgBlockages.toFixed(1);
        avgBlockagesEl.style.color = '#ffc107';
    }
    
    // Completed Jobs - Green (#28a745)
    const completedJobsEl = document.getElementById('completedJobs');
    if (completedJobsEl) {
        completedJobsEl.innerText = currentData.completedJobs.toLocaleString();
        completedJobsEl.style.color = '#28a745';
    }
    
    // In Progress Jobs - Yellow (#ffc107)
    const inProgressJobsEl = document.getElementById('inProgressJobs');
    if (inProgressJobsEl) {
        inProgressJobsEl.innerText = currentData.inProgressJobs.toLocaleString();
        inProgressJobsEl.style.color = '#ffc107';
    }
    
    // Critical Assets - Red (#dc3545)
    const criticalAssetsEl = document.getElementById('criticalAssets');
    if (criticalAssetsEl) {
        criticalAssetsEl.innerText = currentData.criticalCount.toLocaleString();
        criticalAssetsEl.style.color = '#dc3545';
    }
    
    console.log('Quick Summary Updated:', {
        manholes: currentData.manholesCount,
        pipelines: currentData.pipelinesCount,
        complaints: currentData.complaintsCount,
        totalBlockages: currentData.totalBlockages,
        avgBlockages: currentData.avgBlockages,
        completedJobs: currentData.completedJobs,
        inProgressJobs: currentData.inProgressJobs,
        criticalAssets: currentData.criticalCount
    });
}

function updateRiskBar() {
    const riskBar = document.getElementById('riskDistributionBar');
    if (!riskBar) return;
    
    const total = currentData.manholesCount + currentData.pipelinesCount;
    const criticalPercent = total > 0 ? (currentData.criticalCount / total) * 100 : 0;
    const warningPercent = total > 0 ? (currentData.warningCount / total) * 100 : 0;
    const goodPercent = total > 0 ? (currentData.goodCount / total) * 100 : 0;
    
    riskBar.innerHTML = `
        <div style="display: flex; height: 20px; border-radius: 10px; overflow: hidden; margin-top: 8px;">
            <div style="width: ${criticalPercent}%; background: #dc3545; transition: width 0.3s;" title="🔴 Critical: ${currentData.criticalCount}"></div>
            <div style="width: ${warningPercent}%; background: #ffc107; transition: width 0.3s;" title="🟡 Warning: ${currentData.warningCount}"></div>
            <div style="width: ${goodPercent}%; background: linear-gradient(90deg, #9b59b6 0%, #9b59b6 50%, #32cd32 50%, #32cd32 100%); transition: width 0.3s;" title="Normal: ${currentData.goodCount}"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.6rem;">
            <span>🔴 Critical: ${currentData.criticalCount}</span>
            <span>🟡 Warning: ${currentData.warningCount}</span>
            <span>🟣🟢 Good: ${currentData.goodCount}</span>
        </div>
    `;
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function showMenu() {
    currentView = 'menu';
    const menuDiv = document.getElementById('menuView');
    const contentDiv = document.getElementById('contentView');
    const backButton = document.getElementById('backButton');
    
    if (menuDiv) menuDiv.style.display = 'block';
    if (contentDiv) contentDiv.style.display = 'none';
    if (backButton) backButton.style.display = 'none';
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

async function updateStatistics() {
    await updateFromAPI();
    console.log('Statistics updated:', currentData);
}

function getCurrentStatistics() {
    return currentData;
}

// ============================================
// RENDER HTML - ONLY Asset Health & Quick Summary
// ============================================

function render() {
    return `
        <div class="statistics-container">
            <!-- Back Button -->
            <div id="backButton" style="display: none; margin-bottom: 16px;">
                <button onclick="window.showMenu && window.showMenu()" style="
                    background: #1a472a;
                    color: #69f0ae;
                    border: 1px solid #2e7d32;
                    border-radius: 6px;
                    padding: 6px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    ← BACK TO MENU
                </button>
            </div>
            
            <!-- Current View Title -->
            <div id="currentViewTitle" style="
                text-align: center;
                color: #69f0ae;
                font-size: 1.2rem;
                font-weight: bold;
                margin-bottom: 20px;
            "></div>
            
            <!-- MENU VIEW -->
            <div id="menuView">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #69f0ae; margin-bottom: 5px; font-size: 1.4rem;">📊 NETWORK INSIGHTS</h2>
                    <p style="color: #7cb342; font-size: 11px;">Select a category to view insights</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
                    <!-- Asset Health Insights -->
                    <div onclick="window.showView && window.showView('asset', '🏭 ASSET HEALTH INSIGHTS')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">🏭</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Asset Health</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">Bar & Pie Charts</p>
                    </div>
                    
                    <!-- Quick Insights -->
                    <div onclick="window.showView && window.showView('summary', '📈 QUICK INSIGHTS')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">📈</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Quick</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">Summary stats</p>
                    </div>
                </div>
            </div>
            
            <!-- CONTENT VIEW (hidden by default) -->
            <div id="contentView" style="display: none;">
                <!-- ASSET VIEW -->
                <div id="assetView" style="display: none;">
                    <div class="chart-container">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                            <p style="font-size: 0.6rem; color: #7cb342; margin: 0;">
                                🟣 Manholes Normal = Purple | 🟢 Pipelines Normal = Lime Green
                            </p>
                            <button id="chartTypeBtn" onclick="window.switchChartType && window.switchChartType()" style="
                                background: #1a472a;
                                color: #69f0ae;
                                border: 1px solid #2e7d32;
                                border-radius: 6px;
                                padding: 4px 10px;
                                cursor: pointer;
                                font-size: 10px;
                            ">
                                🥧 Switch to Pie Chart
                            </button>
                        </div>
                        <canvas id="assetStatusChart" style="max-height: 320px;"></canvas>
                        
                        <div class="asset-status-details" style="display: flex; gap: 20px; justify-content: center; margin-top: 15px; flex-wrap: wrap;">
                            <div style="text-align: center; background: #0d2818; padding: 10px 20px; border-radius: 8px; border-left: 3px solid #9b59b6;">
                                <strong style="color: #9b59b6;">🟣 MANHOLES</strong><br>
                                <span style="color: #dc3545;">🔴 Critical: <span id="manholesCritical" style="color: #dc3545; font-weight: bold;">0</span></span><br>
                                <span style="color: #ffc107;">🟡 Warning: <span id="manholesWarning" style="color: #ffc107; font-weight: bold;">0</span></span><br>
                                <span style="color: #9b59b6;">🟣 Normal: <span id="manholesGood" style="color: #9b59b6; font-weight: bold;">0</span></span>
                            </div>
                            <div style="text-align: center; background: #0d2818; padding: 10px 20px; border-radius: 8px; border-left: 3px solid #32cd32;">
                                <strong style="color: #32cd32;">🟢 PIPELINES</strong><br>
                                <span style="color: #dc3545;">🔴 Critical: <span id="pipelinesCritical" style="color: #dc3545; font-weight: bold;">0</span></span><br>
                                <span style="color: #ffc107;">🟡 Warning: <span id="pipelinesWarning" style="color: #ffc107; font-weight: bold;">0</span></span><br>
                                <span style="color: #32cd32;">🟢 Normal: <span id="pipelinesGood" style="color: #32cd32; font-weight: bold;">0</span></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- SUMMARY VIEW -->
                <div id="summaryView" style="display: none;">
                    <div class="chart-container">
                        <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalManholes" style="font-size: 1.3rem; font-weight: bold; color: #9b59b6;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Manholes</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalPipelines" style="font-size: 1.3rem; font-weight: bold; color: #32cd32;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Pipelines</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalComplaints" style="font-size: 1.3rem; font-weight: bold; color: #ffc107;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Complaints</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalBlockages" style="font-size: 1.3rem; font-weight: bold; color: #dc3545;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Blockages</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="avgBlockages" style="font-size: 1.3rem; font-weight: bold; color: #ffc107;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Avg/Asset</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="completedJobs" style="font-size: 1.3rem; font-weight: bold; color: #28a745;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Completed</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="inProgressJobs" style="font-size: 1.3rem; font-weight: bold; color: #ffc107;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">In Progress</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="criticalAssets" style="font-size: 1.3rem; font-weight: bold; color: #dc3545;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Critical</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 16px;">
                            <div style="font-size: 0.7rem; margin-bottom: 4px; font-weight: bold; color: #7cb342;">⚠️ ASSET RISK DISTRIBUTION</div>
                            <div id="riskDistributionBar"></div>
                            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.6rem;">
                                <span>🔴 Critical: <span id="criticalAssetsDetail">0</span></span>
                                <span>🟡 Warning: <span id="warningAssetsDetail">0</span></span>
                                <span>🟣🟢 Good: <span id="goodAssetsDetail">0</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    await updateFromAPI();
    
    // Expose functions to global scope
    window.showMenu = showMenu;
    window.switchChartType = switchChartType;
    window.showView = (viewName, viewTitle) => {
        // Hide all views
        const views = ['assetView', 'summaryView'];
        views.forEach(view => {
            const el = document.getElementById(view);
            if (el) el.style.display = 'none';
        });
        
        // Show selected view
        const selectedView = document.getElementById(`${viewName}View`);
        if (selectedView) selectedView.style.display = 'block';
        
        // Update UI
        const menuDiv = document.getElementById('menuView');
        const contentDiv = document.getElementById('contentView');
        const backButton = document.getElementById('backButton');
        const viewTitleEl = document.getElementById('currentViewTitle');
        
        if (menuDiv) menuDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'block';
        if (backButton) backButton.style.display = 'flex';
        if (viewTitleEl) viewTitleEl.innerHTML = viewTitle;
        
        // Refresh asset chart if needed
        if (viewName === 'asset') {
            if (currentChartType === 'bar') {
                initBarChart();
            } else {
                initPieChart();
            }
        }
    };
    
    // Event Listeners for Real-Time Updates
    document.addEventListener('reportProcessed', () => {
        updateFromAPI();
    });
    
    document.addEventListener('layerToggled', () => {
        updateFromAPI();
    });
    
    document.addEventListener('dataRefreshed', () => {
        updateFromAPI();
    });
    
    document.addEventListener('assetStatusChanged', () => {
        updateFromAPI();
    });
    
    document.addEventListener('mapDataRefreshed', (e) => {
        console.log('Map data refreshed event received:', e.detail);
        updateFromAPI();
    });
    
    // Refresh every 30 seconds
    setInterval(() => {
        updateFromAPI();
    }, 30000);
    
    console.log('Statistics component initialized - Asset Health & Quick Summary only');
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