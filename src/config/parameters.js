// src/config/parameters.js
const PARAMETERS = {
    APP_NAME: 'Wastewater GIS',
    IS_LOCALHOST: process.env.NODE_ENV === 'production' ? 0 : 1,
    SERVER_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    PROJECT_HOME_PATH: '/',
    PROJECT_LOGO_QUERY_STRING: '',
    DATA_VIEWER_PATH: '/analytics',
    DATA_EDITOR_BASE_PATH: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    DATA_EDITOR_ADD_ENTRY_PATH: '/api/manholes',
    DATA_EDITOR_EDIT_ENTRY_PATH: '/api/manholes',
    API_PROJECT_ENDPOINT: '/api/forms',
    API_MEDIA_ENDPOINT: '/api/media',
    API_ENTRIES_ENDPOINT: '/api/submissions',
    API_ENTRIES_LOCATIONS_ENDPOINT: '/api/analytics/flag-hotspots',
    API_DOWNLOAD_ENDPOINT: '/api/analytics/maintenance-records',
    API_DOWNLOAD_MEDIA_ENDPOINT: '/api/media/download',
    API_UPLOAD_TEMPLATE_ENDPOINT: '/api/upload/template',
    API_UPLOAD_HEADERS_ENDPOINT: '/api/upload/headers',
    API_DOWNLOAD_SUBSET_ENDPOINT: '/api/analytics/export',
    API_UPLOAD_INTERNAL_ENDPOINT: '/api/upload/shapefile',
    API_BULK_UPLOAD_INTERNAL_ENDPOINT: '/api/upload/bulk',
    API_UPLOAD_EXTERNAL_ENDPOINT: '/api/upload',
    API_BULK_UPLOAD_EXTERNAL_ENDPOINT: '/api/bulk-upload',
    API_DELETION_ENDPOINT: '/api/manholes',
    IMAGES_PATH_LARAVEL: '/images/',
    IMAGES_PATH_STANDALONE: '/images/',
    MAP_MARKER_FILENAME: 'marker.png',

    PAGE_TABLE: 'table',
    PAGE_MAP: 'map',
    PAGE_HOME: 'home',

    DRAWER_MAP: 'DRAWER_MAP',
    DRAWER_DOWNLOAD: 'DRAWER_DOWNLOAD',
    DRAWER_ENTRY: 'DRAWER_ENTRY',
    DRAWER_UPLOAD: 'DRAWER_UPLOAD',

    USER: 'USER',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',

    TABLE_FIXED_HEADERS_TITLE_INDEX: 4,
    TABLE_FIXED_HEADERS_CHILDREN_INDEX: 3,
    TABLE_FIXED_HEADERS_TOTAL: 6,
    TABLE_FIXED_HEADERS_CREATED_AT_INDEX: 5,
    MAX_TITLE_LENGHT: 50,
    MAX_ENTRIES_FOR_UNCLUSTERING: 10000,
    TABLE_UPLOAD_PER_PAGE: 25,
    TABLE_UPLOAD_MAX_ROWS: 150,
    FORMAT_CSV: 'csv',
    FORMAT_JSON: 'json',

    // Map tile providers
    ESRI_TILES_PROVIDER_SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ESRI_TILES_PROVIDER_ATTRIBUTION: 'Tiles &copy; Esri',

    MAPBOX_TILES_PROVIDER_SATELLITE: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=' + process.env.REACT_APP_MAPBOX_API_TOKEN,
    MAPBOX_TILES_PROVIDER_OUTDOOR: 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=' + process.env.REACT_APP_MAPBOX_API_TOKEN,
    MAPBOX_TILES_ATTRIBUTION: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',

    STAMEN_HIGH_CONTRAST_TILES_PROVIDER: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',
    STAMEN_TILES_ATTRIBUTION: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>',

    CARTO_LIGHT_TILES_PROVIDER: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    CARTO_TILES_ATTRIBUTION: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',

    OSM_TILES_PROVIDER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    OSM_TILES_ATTRIBUTION: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',

    SVGNS: 'http://www.w3.org/2000/svg',
    FILTER_DISTRIBUTION: 'distribution',
    FILTER_DISTRIBUTION_DEFAULT_OPTION: 'Pick question',
    FILTER_TIMELINE: 'timeline',

    PHOTO_EXT: '.jpg',
    AUDIO_EXT: '.mp4',
    AUDIO_EXT_IOS: '.wav',
    VIDEO_EXT: '.mp4',

    ALLOWED_ORDERING_COLUMNS: ['title', 'created_at'],
    ALLOWED_ORDERING: ['ASC', 'DESC'],

    DEFAULT_ORDERING_COLUMN: 'created_at',
    DEFAULT_ORDERING: 'DESC',

    ORDER_BY: {
        NEWEST: 'Newest',
        OLDEST: 'Oldest',
        AZ: 'A - Z',
        ZA: 'Z - A'
    },

    AUTH_ERROR_CODES: [],
    PROJECT_OUTDATED_ERROR_CODES: [],
    ENTRY_ADD: 'ADD',
    ENTRY_EDIT: 'EDIT',
    ENTRY_UPLOAD: 'UPLOAD',
    UPLOAD_STOPPING_ERROR_CODES: [],

    ENTRY: 'entry',
    ENTRIES_TABLE: 'entries',

    BRANCH_ENTRY: 'branch-entry',
    BRANCH_ENTRIES_TABLE: 'branch_entries',

    JUMPS: {
        IS: 'IS',
        IS_NOT: 'IS_NOT',
        NO_ANSWER_GIVEN: 'NO_ANSWER_GIVEN',
        ALL: 'ALL',
        END_OF_FORM: 'END'
    },

    INPUT_TYPES: {
        EC5_TEXT_TYPE: 'text',
        EC5_PHONE_TYPE: 'phone',
        EC5_TEXTAREA_TYPE: 'textarea',
        EC5_INTEGER_TYPE: 'integer',
        EC5_DECIMAL_TYPE: 'decimal',
        EC5_DATE_TYPE: 'date',
        EC5_TIME_TYPE: 'time',
        EC5_RADIO_TYPE: 'radio',
        EC5_CHECKBOX_TYPE: 'checkbox',
        EC5_DROPDOWN_TYPE: 'dropdown',
        EC5_BARCODE_TYPE: 'barcode',
        EC5_LOCATION_TYPE: 'location',
        EC5_AUDIO_TYPE: 'audio',
        EC5_VIDEO_TYPE: 'video',
        EC5_PHOTO_TYPE: 'photo',
        EC5_BRANCH_TYPE: 'branch',
        EC5_GROUP_TYPE: 'group',
        EC5_README_TYPE: 'readme',
        EC5_SEARCH_SINGLE_TYPE: 'searchsingle',
        EC5_SEARCH_MULTIPLE_TYPE: 'searchmultiple',
        EC5_DATASET_SINGLE_TYPE: 'dataset single',
        EC5_DATASET_MULTIPLE_TYPE: 'dataset multiple'
    },

    BULK_UPLOADABLE_TYPES: [
        'text', 'phone', 'textarea', 'integer', 'decimal',
        'date', 'time', 'radio', 'checkbox', 'dropdown',
        'barcode', 'location', 'searchsingle', 'searchmultiple'
    ],

    BULK_MAX_FILE_SIZE_BYTES: 1000000,

    INPUT_ANSWER_MAX_LENGTHS: {
        text: 255,
        textarea: 1000,
        integer: 255,
        decimal: 255,
        date: 24,
        time: 24,
        radio: 13,
        dropdown: 13,
        barcode: 255,
        audio: 51,
        video: 51,
        photo: 51,
        branch: 0,
        group: 0
    },

    CEll_TYPES: {
        BRANCH: 'CellBranch',
        CHILDREN: 'CellChildren',
        MEDIA: 'CellMedia',
        TEXT: 'CellText'
    },

    MULTIPLE_ANSWERS_TYPES: ['radio', 'checkbox', 'dropdown', 'searchsingle', 'searchmultiple'],
    MULTIPLE_ANSWERS_TYPES_AS_ARRAY: ['checkbox', 'searchsingle', 'searchmultiple'],
    MEDIA_TYPES: ['audio', 'photo', 'video'],

    DATE_FORMAT_1: 'dd/MM/YYYY',
    DATE_FORMAT_2: 'MM/dd/YYYY',
    DATE_FORMAT_3: 'YYYY/MM/dd',
    DATE_FORMAT_4: 'MM/YYYY',
    DATE_FORMAT_5: 'dd/MM',

    TIME_FORMAT_1: 'HH:mm:ss',
    TIME_FORMAT_2: 'hh:mm:ss',
    TIME_FORMAT_3: 'HH:mm',
    TIME_FORMAT_4: 'hh:mm',
    TIME_FORMAT_5: 'mm:ss',

    LABELS: {
        DELETE_ENTRY_SUCCESS: 'Entry deleted',
        FILE_UPLOAD_ERROR: 'Invalid file',
        FILE_UPLOAD_ERROR_NO_ROWS: 'Invalid file, no entries found',
        FILE_SIZE_ERROR: 'File size exceeded',
        FILE_MAPPING_ERROR: 'File mapping does not match',
        FILE_UUID_ERROR: 'File contains duplicate ec5_uuid values',
        FILE_BRANCH_UUID_ERROR: 'File contains duplicate ec5_branch_uuid values',
        FILE_DOWNLOAD_ERROR: 'Cannot download file',
        DELETE_ENTRY_ERROR: 'Error, entry not deleted'
    },

    TOAST_OPTIONS: {
        SUCCESS: {
            closeButton: false,
            timeOut: 1000,
            extendedTimeOut: 0,
            preventDuplicates: true
        },
        ERROR: {
            closeButton: true,
            timeOut: 3000,
            extendedTimeOut: 0,
            preventDuplicates: true
        }
    },

    USER_PERMISSIONS: {
        CAN_DELETE: ['engineer', 'admin'],
        CAN_EDIT: ['engineer', 'admin']
    },

    PROJECT_ROLES: {
        ENGINEER: 'engineer',
        OPERATOR: 'field-operator',
        COLLECTOR: 'field-collector',
        VIEWER: 'viewer'
    },

    TIMEFRAME: {
        LIFETIME: 'Lifetime',
        TODAY: 'Today',
        LAST_7_DAYS: 'Last 7 days',
        LAST_30_DAYS: 'Last 30 days',
        YEAR: 'Current year',
        CUSTOM: 'Custom'
    },

    COOKIES: {
        DOWNLOAD_ENTRIES: 'wastewater-download-entries'
    },

    THEME: {
        PRIMARY: '#2c7da0',
        SECONDARY: '#61a5c2',
        ACCENT: '#f4a261'
    },

    DELAY: {
        SHORT: 250,
        MEDIUM: 500,
        LONG: 1000
    },

    MAP_OVERLAYS: {
        CLUSTERS: 'Clusters',
        HEATMAP: 'Heatmap',
        MARKERS: 'Markers'
    },

    CAN_BULK_UPLOAD: {
        NOBODY: 'nobody',
        MEMBERS: 'members',
        EVERYBODY: 'everybody'
    },

    PROJECT_ACCESS: {
        PRIVATE: 'private',
        PUBLIC: 'public'
    }
};

export default PARAMETERS;
