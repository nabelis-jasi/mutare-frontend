
// Available layers configuration
let availableLayers = [
    { id: 'manholes', name: 'waste_water_manhole', type: 'point', visible: true, color: '#28a745' },
    { id: 'pipelines', name: 'waste_water_pipeline', type: 'line', visible: true, color: '#2b7bff' },
    { id: 'suburbs', name: 'suburbs_boundary', type: 'polygon', visible: false, color: '#ffc107' },
    { id: 'roads', name: 'roads_access', type: 'line', visible: false, color: '#aaaaaa' }
];

// Initialize QGIS menu bar
function initQGISMenu() {
    const menuConfig = [
        { name: 'Project', items: ['New Project', 'Open Project', 'Save Project', 'Save As', 'Export Map', 'Print Layout', 'Exit'] },
        { name: 'Edit', items: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Delete Selected', 'Select All'] },
        { name: 'View', items: ['Zoom In', 'Zoom Out', 'Pan', 'Full Screen', 'Refresh', 'Show/Hide Panels'] },
        { name: 'Layer', items: ['Add Layer', 'Remove Layer', 'Duplicate Layer', 'Layer Properties', 'Set CRS', 'Export Layer'] },
        { name: 'Settings', items: ['Options', 'Project Properties', 'Custom CRS', 'Snapping Options', 'Authentication'] },
        { name: 'Plugins', items: ['Manage Plugins', 'Python Console', 'Plugin Manager', 'Install from ZIP'] },
        { name: 'Vector', items: ['Geometry Tools', 'Analysis Tools', 'Research Tools', 'Geoprocessing', 'Data Management'] },
        { name: 'Raster', items: ['Analysis', 'Extraction', 'Conversion', 'Georeferencer', 'Align Raster'] },
        { name: 'Databases', items: ['DB Manager', 'Import Layer', 'Export Layer', 'Run SQL Query', 'PostGIS Connection'] }
    ];
    
    const menuBar = document.getElementById('qgis-menu-bar');
    if (!menuBar) return;
    
    menuBar.innerHTML = '';
    
    for (let i = 0; i < menuConfig.length; i++) {
        const menu = menuConfig[i];
        const menuDiv = document.createElement('div');
        menuDiv.className = 'menu-item';
        menuDiv.textContent = menu.name;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        
        for (let j = 0; j < menu.items.length; j++) {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = menu.items[j];
            item.addEventListener('click', (function(menuName, itemName) {
                return function() { handleMenuClick(menuName, itemName); };
            })(menu.name, menu.items[j]));
            dropdown.appendChild(item);
        }
        
        menuDiv.appendChild(dropdown);
        menuBar.appendChild(menuDiv);
    }
}

// Handle menu clicks
function handleMenuClick(menu, item) {
    console.log('Menu clicked:', menu, '->', item);
    
    switch(item) {
        case 'New Project':
            if(confirm('Create new project? Unsaved changes will be lost.')) {
                resetProject();
            }
            break;
        case 'Save Project':
            saveProject();
            break;
        case 'Open Project':
            openProject();
            break;
        case 'Export Map':
            exportMapAsImage();
            break;
        case 'Print Layout':
            window.print();
            break;
        case 'Full Screen':
            toggleFullScreen();
            break;
        case 'Add Layer':
            openAdd
