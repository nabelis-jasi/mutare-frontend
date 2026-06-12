// components/reportprocessor.js - Daily Report Processor Component
// Updated with cadastre integration for stand number and street address geocoding

import MapView from './mapview.js';

const API_BASE_URL = 'http://192.168.0.195:5000/api';

// ============================================
// CADASTRE GEOCODING MODULE
// ============================================

// Known suburbs and areas in Mutare
const KNOWN_SUBURBS = [
    'sakubva', 'bernwin', 'devonshire', 'cbd', 'dangamvura', 'chikanga', 
    'hobhouse', 'yeovil', 'utali', 'fernvale', 'westlea', 'palmerstone', 
    'morningside', 'raheen', 'fernhill', 'kentucky', 'nyakamete', 'zimta', 
    'dora', 'bordervale', 'florida', 'natview', 'st joseph', 'gimboki', 
    'link road', 'garikayi', 'triang', 'chipanda', 'weirmouth', 'avenues',
    'greenside', 'darlington', 'hospita', 'utopia', 'fairbridge', 'muneni',
    'chikanga 1', 'chikanga 2', 'sakubva 1', 'sakubva 2', 'old zororo',
    'old chisamba', 'area 3', 'area 13', 'zimpark', 'millar', 'harold place',
    'ritchard crescent', 'dawson street', 'mudzviti', 'chipunza', 'mazhambe'
];

// Extract stand number from address
function extractStandNumber(address) {
    const match = address.match(/^(\d+)/);
    return match ? match[1] : null;
}

// Extract street name from address
function extractStreetName(address) {
    // Patterns like "7 Miller Morningside" -> "Miller"
    const patterns = [
        /^\d+\s+([A-Za-z]+)/i,
        /^\d+\s+([A-Za-z]+\s+[A-Za-z]+)/i,
        /([A-Za-z]+)\s+(?:street|road|avenue|crescent|drive|lane)/i
    ];
    for (const pattern of patterns) {
        const match = address.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Extract suburb from address
function extractSuburb(address) {
    const addressLower = address.toLowerCase();
    for (const suburb of KNOWN_SUBURBS) {
        if (addressLower.includes(suburb.toLowerCase())) {
            return suburb.toLowerCase();
        }
    }
    return null;
}

// Geocode using cadastre API (stand number lookup)
async function geocodeWithCadastre(address) {
    const standNumber = extractStandNumber(address);
    
    if (standNumber) {
        try {
            const response = await fetch(`${API_BASE_URL}/cadastre/stand/${standNumber}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.latitude && data.longitude) {
                    return {
                        success: true,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        buffer_radius: 30,  // Exact stand match = 30m buffer
                        confidence: 'high',
                        matched_by: 'stand_number',
                        stand_number: standNumber,
                        suburb_name: data.suburb_name
                    };
                }
            }
        } catch (error) {
            console.log(`Cadastre lookup failed for stand ${standNumber}:`, error);
        }
    }
    return { success: false };
}

// Geocode using suburb coordinates (fallback)
function geocodeWithSuburb(address) {
    const suburb = extractSuburb(address);
    if (suburb) {
        // Coordinates for known suburbs
        const suburbCoords = {
            'sakubva': { lat: -18.9750, lng: 32.6720, radius: 100 },
            'bernwin': { lat: -18.9700, lng: 32.6650, radius: 100 },
            'devonshire': { lat: -18.9680, lng: 32.6680, radius: 80 },
            'cbd': { lat: -18.9735, lng: 32.6705, radius: 80 },
            'dangamvura': { lat: -18.9780, lng: 32.6750, radius: 150 },
            'chikanga': { lat: -18.9650, lng: 32.6600, radius: 150 },
            'hobhouse': { lat: -18.9600, lng: 32.6550, radius: 120 },
            'yeovil': { lat: -18.9550, lng: 32.6500, radius: 120 },
            'utali': { lat: -18.9650, lng: 32.6600, radius: 200 },
            'fernvale': { lat: -18.9800, lng: 32.6780, radius: 100 },
            'westlea': { lat: -18.9620, lng: 32.6580, radius: 100 },
            'palmerstone': { lat: -18.9580, lng: 32.6520, radius: 100 },
            'morningside': { lat: -18.9660, lng: 32.6620, radius: 100 }
        };
        
        if (suburbCoords[suburb]) {
            const coords = suburbCoords[suburb];
            return {
                success: true,
                latitude: coords.lat,
                longitude: coords.lng,
                buffer_radius: coords.radius,
                confidence: 'medium',
                matched_by: 'suburb',
                suburb_name: suburb
            };
        }
    }
    return { success: false };
}

// Main geocoding function - tries cadastre first, then suburb
async function geocodeAddress(address) {
    // First try cadastre (stand number lookup)
    const cadastreResult = await geocodeWithCadastre(address);
    if (cadastreResult.success) {
        return cadastreResult;
    }
    
    // Then try suburb geocoding
    const suburbResult = geocodeWithSuburb(address);
    if (suburbResult.success) {
        return suburbResult;
    }
    
    // Fallback to CBD
    return {
        success: true,
        latitude: -18.9735,
        longitude: 32.6705,
        buffer_radius: 200,
        confidence: 'low',
        matched_by: 'fallback',
        suburb_name: 'CBD (approximate)'
    };
}

// ============================================
// VEHICLE DETECTION MODULE
// ============================================

const VEHICLE_BRANDS = [
    'SUZUKI', 'NISSAN', 'NAVARA', 'JMC', 'IVECO', 'TOYOTA', 'HONDA', 'FORD',
    'BMW', 'MERCEDES', 'MERCEDES BENZ', 'AUDI', 'VOLKSWAGEN', 'VW', 'HYUNDAI',
    'KIA', 'MAZDA', 'MITSUBISHI', 'ISUZU', 'MAHINDRA', 'TATA', 'LEXUS', 'JEEP',
    'CHEVROLET', 'DODGE', 'RAM', 'GMC', 'CADILLAC', 'VOLVO', 'PEUGEOT', 'RENAULT',
    'CITROEN', 'FIAT', 'ALFA ROMEO', 'LAND ROVER', 'JAGUAR', 'PORSCHE', 'TESLA',
    'BYD', 'HINO', 'SCANIA', 'MAN', 'DAF', 'BEDFORD', 'LEYLAND',
    'OPEL', 'VAUXHALL', 'SEAT', 'SKODA', 'SUBARU', 'DAIHATSU',
    'UD TRUCKS', 'FUSO', 'RENAULT TRUCKS', 'VOLVO TRUCKS', 'MACK', 'KENWORTH', 
    'PETERBILT', 'FREIGHTLINER'
];

const LICENSE_PLATE_PATTERNS = [
    /[A-Z]{3}\s?\d{4}/,
    /[A-Z]{2}\s?\d{4}/,
    /[A-Z]{3}\d{4}/,
    /[A-Z]{2}\d{4}/,
    /\d{4}\s?[A-Z]{2}/,
    /\d{3}\s?[A-Z]{3}/,
    /[A-Z]\d{3}[A-Z]{2}/,
    /\d{3}[A-Z]{3}/
];

function extractVehicleFromLine(line) {
    if (!line || line.trim().length < 5) return null;
    
    let brand = null;
    let plate = null;
    
    const upperLine = line.toUpperCase();
    for (const brandName of VEHICLE_BRANDS) {
        if (upperLine.includes(brandName)) {
            brand = brandName.charAt(0) + brandName.slice(1).toLowerCase();
            break;
        }
    }
    
    for (const pattern of LICENSE_PLATE_PATTERNS) {
        const plateMatch = line.match(pattern);
        if (plateMatch) {
            plate = plateMatch[0];
            break;
        }
    }
    
    if (brand || plate) {
        return {
            brand: brand || 'Unknown',
            plate: plate || 'Unknown',
            full_text: line.trim()
        };
    }
    
    return null;
}

function detectVehicles(text) {
    const operationalVehicles = [];
    const workshopVehicles = [];
    
    const opPattern = /Transport\s*\((\d+)\)\s*functional\s*vehicles?\.?([\s\S]*?)(?=\(|Vehicles|Workshop|Mechanical|$)/i;
    const opMatch = text.match(opPattern);
    
    if (opMatch) {
        const opText = opMatch[2];
        const lines = opText.split('\n');
        for (const line of lines) {
            const vehicle = extractVehicleFromLine(line);
            if (vehicle) operationalVehicles.push(vehicle);
        }
    }
    
    const wsPatterns = [
        /Vehicles under Mechanical work shops?\.?([\s\S]*?)(?=$|\n\n|Transport)/i,
        /Workshop\s*\((\d+)\)\s*vehicles?\.?([\s\S]*?)(?=$|\n\n|Transport)/i,
        /Mechanical\s*work\s*shops?\.?([\s\S]*?)(?=$|\n\n|Transport)/i
    ];
    
    for (const pattern of wsPatterns) {
        const wsMatch = text.match(pattern);
        if (wsMatch) {
            const wsText = wsMatch[1] || wsMatch[2] || '';
            const lines = wsText.split('\n');
            for (const line of lines) {
                const vehicle = extractVehicleFromLine(line);
                if (vehicle) workshopVehicles.push(vehicle);
            }
            break;
        }
    }
    
    return { operationalVehicles, workshopVehicles };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default {
    render() {
        return `
            <div class="report-processor-section">
                <div class="section">
                    <h3>📋 DAILY REPORT PROCESSOR</h3>
                    <p style="font-size: 0.7em; margin-bottom: 10px; opacity: 0.7;">
                        Paste the daily sewer report. Stand numbers are looked up in cadastre for precise geocoding.
                    </p>
                    
                    <textarea id="reportTextInput" class="report-textarea" 
                        placeholder="SEWER SECTION DAILY REPORT ON 19/11/2025.
Complaints received=33.
Complaints attended to 24 current + 4 from the previous days.
-970 Dangamvura
-5689 Bernwin
-Opp T 430
-10034 Devonshire

Transport (4) functional vehicles.
-Suzuki AAE 8626.
-Nissan AFF 6444.
-Navara AGM 0273.
-JMC AGM 0199.

(3) Vehicles under Mechanical work shops.
-Suzuki AAE 8627.
-Iveco 209 TCE 41.
-Iveco 209 TCE 42."></textarea>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button id="processReportBtn" class="process-report-btn" style="flex: 2;">
                            🔍 PROCESS REPORT
                        </button>
                        <button id="resetStatusBtn" class="reset-status-btn" style="flex: 1; background: #dc3545; border-color: #dc3545;">
                            🔄 RESET TO NORMAL
                        </button>
                    </div>
                    
                    <div id="reportResultPanel" class="report-result" style="display: none;">
                        <div id="reportStats"></div>
                        <div id="vehicleStats"></div>
                        <div id="reportPreview"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    init() {
        const processBtn = document.getElementById('processReportBtn');
        if (processBtn) {
            processBtn.addEventListener('click', async () => {
                await this.processReport();
            });
        }
        
        const resetBtn = document.getElementById('resetStatusBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Reset all manholes and pipelines to normal status?')) {
                    await this.resetAssetStatus();
                    alert('Assets reset to normal status!');
                }
            });
        }
        
        document.addEventListener('mapReady', () => {
            console.log('Map ready, report processor initialized');
        });
    },
    
    async resetAssetStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/reset_asset_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                document.dispatchEvent(new CustomEvent('assetStatusChanged'));
                document.dispatchEvent(new CustomEvent('dataRefreshed'));
                return result;
            }
        } catch (error) {
            console.error('Error resetting asset status:', error);
            return null;
        }
    },
    
    async updateAssetStatus(complaints) {
        try {
            const response = await fetch(`${API_BASE_URL}/update_asset_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complaints: complaints })
            });
            const result = await response.json();
            if (result.success) {
                console.log(result.message);
                document.dispatchEvent(new CustomEvent('assetStatusChanged'));
                document.dispatchEvent(new CustomEvent('dataRefreshed'));
            }
            return result;
        } catch (error) {
            console.error('Error updating asset status:', error);
            return null;
        }
    },
    
    async processReport() {
        const textarea = document.getElementById('reportTextInput');
        const reportText = textarea?.value;
        
        if (!reportText || !reportText.trim()) {
            alert('Please paste a report first');
            return;
        }
        
        const resultPanel = document.getElementById('reportResultPanel');
        const statsDiv = document.getElementById('reportStats');
        const vehicleDiv = document.getElementById('vehicleStats');
        const previewDiv = document.getElementById('reportPreview');
        
        resultPanel.style.display = 'block';
        statsDiv.innerHTML = '<div class="stat-row"><span>⏳ Processing report...</span></div>';
        if (vehicleDiv) vehicleDiv.innerHTML = '';
        previewDiv.innerHTML = '';
        
        try {
            // Extract complaints from text
            const lines = reportText.split('\n');
            const rawAddresses = [];
            let totalComplaints = 0;
            let attendedTo = 0;
            
            for (const line of lines) {
                const trimmed = line.trim();
                // Check for bullet points
                if (trimmed.startsWith('-') || (trimmed && trimmed[0].match(/\d/) && trimmed.includes('.'))) {
                    let clean = trimmed.replace(/^[-•\d\.\s]+/, '').trim();
                    
                    // Skip vehicle lines
                    let isVehicle = false;
                    for (const brand of VEHICLE_BRANDS) {
                        if (clean.toUpperCase().includes(brand)) {
                            isVehicle = true;
                            break;
                        }
                    }
                    
                    if (!isVehicle && clean.length > 3) {
                        rawAddresses.push(clean);
                    }
                }
                
                // Extract complaint counts
                const complaintsMatch = line.match(/Complaints received[=:\s]*(\d+)/i);
                if (complaintsMatch) totalComplaints = parseInt(complaintsMatch[1]);
                
                const attendedMatch = line.match(/attended to[=:\s]*(\d+)/i);
                if (attendedMatch) attendedTo = parseInt(attendedMatch[1]);
            }
            
            // Geocode each address using cadastre
            const complaints = [];
            for (const addr of rawAddresses) {
                const geo = await geocodeAddress(addr);
                const complaint = {
                    original_text: addr,
                    address: addr,
                    geocoded: geo.success,
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                    fuzzy_match: geo.confidence !== 'high',
                    buffer_radius: geo.buffer_radius,
                    confidence: geo.confidence,
                    matched_by: geo.matched_by,
                    stand_number: geo.stand_number,
                    suburb_name: geo.suburb_name
                };
                complaints.push(complaint);
            }
            
            // Detect vehicles
            const detectedVehicles = detectVehicles(reportText);
            
            // Display stats
            const geocodedCount = complaints.filter(c => c.geocoded).length;
            const highConfidence = complaints.filter(c => c.confidence === 'high').length;
            const mediumConfidence = complaints.filter(c => c.confidence === 'medium').length;
            
            statsDiv.innerHTML = `
                <div class="stat-row success"><span>✅ Status:</span><span>Success</span></div>
                <div class="stat-row"><span>📊 Total Complaints:</span><span>${totalComplaints || complaints.length}</span></div>
                <div class="stat-row"><span>📍 Geocoded:</span><span>${geocodedCount}/${complaints.length}</span></div>
                <div class="stat-row"><span>🎯 High Confidence (Stand #):</span><span>${highConfidence}</span></div>
                <div class="stat-row"><span>📍 Medium Confidence (Suburb):</span><span>${mediumConfidence}</span></div>
            `;
            
            // Display vehicle stats
            if (vehicleDiv) {
                if (detectedVehicles.operationalVehicles.length > 0) {
                    vehicleDiv.innerHTML += `
                        <div class="stat-row" style="color: #28a745;">
                            <span>🚗 Operational Vehicles:</span>
                            <span>${detectedVehicles.operationalVehicles.map(v => `${v.brand} ${v.plate}`).join(', ')}</span>
                        </div>
                    `;
                }
                if (detectedVehicles.workshopVehicles.length > 0) {
                    vehicleDiv.innerHTML += `
                        <div class="stat-row" style="color: #ffc107;">
                            <span>🔧 Workshop Vehicles:</span>
                            <span>${detectedVehicles.workshopVehicles.map(v => `${v.brand} ${v.plate}`).join(', ')}</span>
                        </div>
                    `;
                }
            }
            
            // Display preview of geocoding results
            if (complaints.length > 0) {
                let previewHtml = '<h4>📌 Geocoding Results:</h4><ul style="max-height: 150px; overflow-y: auto; font-size: 0.65rem;">';
                for (const c of complaints) {
                    const icon = c.confidence === 'high' ? '✅' : (c.confidence === 'medium' ? '📍' : '⚠️');
                    previewHtml += `<li>${icon} <strong>${c.original_text.substring(0, 40)}</strong> → `;
                    if (c.geocoded) {
                        previewHtml += `${c.stand_number || c.suburb_name || 'Area'} (${c.buffer_radius}m, ${c.confidence})`;
                    } else {
                        previewHtml += `<span style="color: #ffc107;">Not found</span>`;
                    }
                    previewHtml += `</li>`;
                }
                previewHtml += '</ul>';
                previewDiv.innerHTML = previewHtml;
                previewDiv.style.display = 'block';
            }
            
            // Update asset status based on complaint buffers
            if (complaints.length > 0) {
                await this.updateAssetStatus(complaints);
            }
            
            // Show complaints on map with buffers
            if (complaints.length > 0) {
                this.showComplaintsWithBuffers(complaints, new Date().toISOString().slice(0, 10), 
                    detectedVehicles.operationalVehicles, detectedVehicles.workshopVehicles);
            }
            
        } catch (error) {
            statsDiv.innerHTML = `<div class="stat-row error"><span>❌ Error:</span><span>${error.message}</span></div>`;
            console.error('Report processing error:', error);
        }
    },
    
    showComplaintsWithBuffers(complaints, reportDate, operationalVehicles = [], workshopVehicles = []) {
        const mapEvent = new CustomEvent('showComplaintBuffers', {
            detail: {
                complaints: complaints,
                reportDate: reportDate
            }
        });
        document.dispatchEvent(mapEvent);
        
        const reportEvent = new CustomEvent('reportProcessed', {
            detail: {
                reportDate: reportDate,
                complaints: complaints,
                vehicles: {
                    operational: operationalVehicles,
                    workshop: workshopVehicles
                }
            }
        });
        document.dispatchEvent(reportEvent);
        
        console.log(`Processed ${complaints.length} complaints with buffer visualization`);
        complaints.forEach(c => {
            console.log(`  📍 "${c.address}" → ${c.matched_by || 'unknown'} (${c.confidence}, ${c.buffer_radius}m)`);
        });
    }
};