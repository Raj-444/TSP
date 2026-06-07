/**
 * js/app.js
 * Main application entry point and controller.
 * Manages state, UI events, localStorage persistence, and modular interactions.
 */

import { 
    initMap, 
    renderMapMarkers, 
    drawRouteLine, 
    clearRouteLine, 
    resetMapCenter, 
    reverseGeocodeAddress, 
    setMapTheme,
    flyToLocation,
    invalidateMapSize
} from './map.js';

import { 
    solveTSP, 
    haversineDistance 
} from './tsp.js';

import { 
    fetchRoute 
} from './routing.js';

// --- Application State ---
let locations = [];
let apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQyNTljMDhlYWM2NTRlZWU5MjhjYTQ2OWU0ZDFhZTBkIiwiaCI6Im11cm11cjY0In0=";
let optimizationMode = "closed"; // "closed" (round-trip) or "open" (one-way)
let transportProfile = "driving-car";
let savedRoutes = [];
let isOptimized = false;
let isGeocoding = false;
let activeSearchField = "stop"; // tracks active input: "start" or "stop"

// --- DOM References ---
const btnSettings = document.getElementById('btn-settings');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const btnClearAll = document.getElementById('btn-clear-all');
const btnOptimize = document.getElementById('btn-optimize');
const btnExport = document.getElementById('btn-export');
const btnSave = document.getElementById('btn-save');
const selectSavedRoutes = document.getElementById('select-saved-routes');
const btnMobileToggle = document.getElementById('btn-mobile-toggle');
const mainContent = document.querySelector('.main-content');

const startLocationInput = document.getElementById('start-location-input');
const stopLocationInput = document.getElementById('stop-location-input');
const clearStartBtn = document.getElementById('clear-start-btn');
const clearStopBtn = document.getElementById('clear-stop-btn');
const btnSwapLocations = document.getElementById('btn-swap-locations');
const searchResultsContainer = document.getElementById('search-suggestions');

const emptyState = document.getElementById('empty-state');
const stopsListContainer = document.getElementById('stops-list');

const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const inputApiKey = document.getElementById('ors-api-key');
const selectOptMode = document.getElementById('optimization-mode');
const selectProfile = document.getElementById('transport-profile');

const statStops = document.getElementById('stat-stops');
const statDistance = document.getElementById('stat-distance');
const statTime = document.getElementById('stat-time');
const statSavings = document.getElementById('stat-savings');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map and center it on Bangladesh
    initMap('map', handleMapClick);

    // 2. Load settings from localStorage
    loadSettings();

    // 3. Initialize theme
    initTheme();

    // 4. Load saved routes list
    loadSavedRoutesList();

    // 5. Initial UI Render
    renderUI();

    // 6. Check if API Key is configured, warn if not
    checkAPIKeyConfiguration();

    // 7. Initialize Autocomplete search bar listeners
    initSearchAutocomplete();

    // 8. Fix map layout and size calculations in flexbox container
    setTimeout(() => {
        invalidateMapSize();
        resetMapCenter();
    }, 200);

    // 9. Mobile View Toggle Listener
    if (btnMobileToggle && mainContent) {
        btnMobileToggle.addEventListener('click', () => {
            const isShowingMap = mainContent.classList.toggle('show-map');
            const btnIcon = btnMobileToggle.querySelector('i');
            const btnText = btnMobileToggle.querySelector('span');

            if (isShowingMap) {
                if (btnIcon) btnIcon.className = 'fa-solid fa-list';
                if (btnText) btnText.textContent = 'View List';
                setTimeout(() => {
                    invalidateMapSize();
                }, 100);
            } else {
                if (btnIcon) btnIcon.className = 'fa-solid fa-map';
                if (btnText) btnText.textContent = 'View Map';
            }
        });
    }
});

// Fit map size on window resizing
window.addEventListener('resize', () => {
    invalidateMapSize();
});

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = (savedTheme === 'dark');
    
    if (isDark) {
        document.body.classList.add('dark-theme');
        btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    // Set map tiles theme accordingly
    setMapTheme(isDark);
}

btnThemeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    
    if (isDark) {
        localStorage.setItem('theme', 'dark');
        btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        localStorage.setItem('theme', 'light');
        btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    // Swap tiles dynamically
    setMapTheme(isDark);
    showToast("Theme Swapped", `Switched to ${isDark ? 'Dark' : 'Light'} UI.`, "success");
});

// --- Toast System ---
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconHTML = '<i class="fa-solid fa-circle-check toast-icon"></i>';
    if (type === 'error') {
        iconHTML = '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';
    } else if (type === 'warning') {
        iconHTML = '<i class="fa-solid fa-triangle-exclamation toast-icon"></i>';
    }

    toast.innerHTML = `
        ${iconHTML}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Close handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'toastSlideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove after 4.5s
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastSlideIn 0.3s reverse';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, 4500);
}

// --- Loading Spinner Control ---
function showLoader(message = "Processing...") {
    const loader = document.getElementById('loading-overlay');
    const msgEl = document.getElementById('loading-message');
    if (loader && msgEl) {
        msgEl.textContent = message;
        loader.classList.remove('hidden');
    }
}

function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// --- Settings Management ---
function loadSettings() {
    apiKey = localStorage.getItem('ors_api_key') || "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQyNTljMDhlYWM2NTRlZWU5MjhjYTQ2OWU0ZDFhZTBkIiwiaCI6Im11cm11cjY0In0=";
    optimizationMode = localStorage.getItem('ors_opt_mode') || "closed";
    transportProfile = localStorage.getItem('ors_transport_profile') || "driving-car";

    // Update modal input values
    inputApiKey.value = apiKey;
    selectOptMode.value = optimizationMode;
    selectProfile.value = transportProfile;

    // Highlight correct transport tab button in sidebar
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-profile') === transportProfile) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function checkAPIKeyConfiguration() {
    if (!apiKey || apiKey === "") {
        showToast(
            "API Key Required",
            "Please configure your OpenRouteService API key in settings to draw road routes.",
            "warning"
        );
        updateStatusIndicator('error', "API Key Missing");
    }
}

function updateStatusIndicator(state, text) {
    const indicator = document.getElementById('route-status-indicator');
    if (!indicator) return;

    indicator.className = `status-indicator ${state}`;
    const txtEl = indicator.querySelector('.status-text');
    if (txtEl) txtEl.textContent = text;
}

// Settings modal toggle listeners
btnSettings.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

btnSaveSettings.addEventListener('click', () => {
    apiKey = inputApiKey.value.trim();
    optimizationMode = selectOptMode.value;
    transportProfile = selectProfile.value;

    localStorage.setItem('ors_api_key', apiKey);
    localStorage.setItem('ors_opt_mode', optimizationMode);
    localStorage.setItem('ors_transport_profile', transportProfile);

    settingsModal.classList.add('hidden');
    showToast("Settings Saved", "API configurations and rules updated successfully.", "success");
    
    // If API Key has been inserted, resolve error state
    if (apiKey !== "") {
        if (locations.length === 0) {
            updateStatusIndicator('idle', "No Route Defined");
        } else if (isOptimized) {
            updateStatusIndicator('ready', "Route Optimized");
        } else {
            updateStatusIndicator('idle', "Pending Optimization");
        }
    } else {
        updateStatusIndicator('error', "API Key Missing");
    }
});

// --- Autocomplete Search Panel Event Handlers (Google Maps Directions style) ---
let searchDebounceTimeout = null;

function initSearchAutocomplete() {
    if (!startLocationInput || !stopLocationInput) return;

    // Track which input has active focus
    startLocationInput.addEventListener('focus', () => {
        activeSearchField = "start";
    });
    stopLocationInput.addEventListener('focus', () => {
        activeSearchField = "stop";
    });

    const handleInput = (inputEl, clearBtnEl) => {
        const query = inputEl.value.trim();
        
        if (query.length > 0) {
            clearBtnEl.classList.remove('hidden');
        } else {
            clearBtnEl.classList.add('hidden');
            searchResultsContainer.classList.add('hidden');
            searchResultsContainer.innerHTML = '';
            return;
        }

        // Debounce requests
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            performAddressSearch(query);
        }, 400);
    };

    startLocationInput.addEventListener('input', () => handleInput(startLocationInput, clearStartBtn));
    stopLocationInput.addEventListener('input', () => handleInput(stopLocationInput, clearStopBtn));

    // Clear start input
    clearStartBtn.addEventListener('click', () => {
        startLocationInput.value = '';
        clearStartBtn.classList.add('hidden');
        searchResultsContainer.classList.add('hidden');
        searchResultsContainer.innerHTML = '';
        
        if (locations.length > 0) {
            const removed = locations[0].address;
            locations.shift(); // remove starting point
            isOptimized = false;
            clearRouteLine();
            resetStatsUI();
            renderMapMarkers(locations, deleteLocation);
            renderUI();
            updateStatusIndicator('idle', 'Pending Optimization');
            showToast("Start Reset", `Cleared starting point: ${removed}`, "warning");
        }
    });

    // Clear stop input
    clearStopBtn.addEventListener('click', () => {
        stopLocationInput.value = '';
        clearStopBtn.classList.add('hidden');
        searchResultsContainer.classList.add('hidden');
        searchResultsContainer.innerHTML = '';
    });

    // Swap button logic
    btnSwapLocations.addEventListener('click', () => {
        if (locations.length >= 2) {
            const temp = locations[0];
            locations[0] = locations[1];
            locations[1] = temp;
            
            isOptimized = false;
            clearRouteLine();
            resetStatsUI();
            
            renderMapMarkers(locations, deleteLocation);
            renderUI();
            
            startLocationInput.value = locations[0].address;
            clearStartBtn.classList.remove('hidden');
            
            updateStatusIndicator('idle', 'Pending Optimization');
            showToast("Swapped Stops", "Swapped starting depot with the first delivery stop.", "success");
        } else {
            showToast("Swap Unavailable", "Add at least a start point and one stop to swap.", "warning");
        }
    });

    // Transport Profile Tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const profile = btn.getAttribute('data-profile');
            transportProfile = profile;
            
            localStorage.setItem('ors_transport_profile', profile);
            
            // Sync setting modal select value
            const modalSelect = document.getElementById('transport-profile');
            if (modalSelect) modalSelect.value = profile;

            showToast("Transport Updated", "Routing profile switched successfully.", "info");

            // Recalculate route automatically if optimized route is present
            if (isOptimized && locations.length >= 2) {
                optimizeRoute();
            }
        });
    });

    // Hide dropdown on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.directions-panel')) {
            searchResultsContainer.classList.add('hidden');
        }
    });
}

async function performAddressSearch(query) {
    try {
        let url = "";
        let data = [];

        // If ORS API Key is available, use the premium ORS Pelias geocoder (faster & highly reliable)
        if (apiKey && apiKey !== "" && apiKey !== "REPLACE_WITH_API_KEY") {
            url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                const result = await response.json();
                data = (result.features || []).map(feat => ({
                    lat: feat.geometry.coordinates[1],
                    lon: feat.geometry.coordinates[0],
                    display_name: feat.properties.label || feat.properties.name
                }));
            } else {
                throw new Error("ORS Search failed.");
            }
        } else {
            // Fallback to OSM Nominatim directly
            url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=en`;
            const response = await fetch(url);
            
            if (response.ok) {
                const result = await response.json();
                data = result.map(item => ({
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    display_name: item.display_name
                }));
            } else {
                throw new Error("OSM Nominatim search failed.");
            }
        }

        renderSearchResults(data);
    } catch (err) {
        console.error("Address Search Error: ", err);
        // Direct fallback attempt to OSM Nominatim on catch
        try {
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=en`;
            const response = await fetch(fallbackUrl);
            if (response.ok) {
                const result = await response.json();
                const data = result.map(item => ({
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    display_name: item.display_name
                }));
                renderSearchResults(data);
                return;
            }
        } catch (e) {
            console.error("OSM Fallback failed:", e);
        }
        showToast("Search Failed", "Geocoding services are rate-limited or API key is invalid.", "error");
    }
}

function renderSearchResults(results) {
    searchResultsContainer.innerHTML = '';

    if (!results || results.length === 0) {
        const li = document.createElement('li');
        li.className = 'search-result-item';
        li.textContent = "No locations found.";
        searchResultsContainer.appendChild(li);
        searchResultsContainer.classList.remove('hidden');
        return;
    }

    results.forEach(item => {
        const li = document.createElement('li');
        li.className = 'search-result-item';
        
        let label = item.display_name;
        if (label.length > 65) {
            label = label.substring(0, 62) + "...";
        }
        li.textContent = label;
        
        li.addEventListener('click', () => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            
            const newLoc = {
                id: Date.now().toString(),
                lat: lat,
                lng: lng,
                address: item.display_name
            };

            isOptimized = false;
            clearRouteLine();
            resetStatsUI();

            if (activeSearchField === "start") {
                // If setting starting depot
                if (locations.length > 0) {
                    locations[0] = newLoc;
                } else {
                    locations.push(newLoc);
                }
                startLocationInput.value = item.display_name;
                clearStartBtn.classList.remove('hidden');
                showToast("Start Depot Set", `Depot: ${label}`, "success");
            } else {
                // If adding delivery stop
                locations.push(newLoc);
                stopLocationInput.value = '';
                clearStopBtn.classList.add('hidden');
                showToast("Stop Added", `Added Stop #${locations.length}: ${label}`, "success");
            }

            renderMapMarkers(locations, deleteLocation);
            renderUI();
            
            updateStatusIndicator('idle', 'Pending Optimization');
            
            // Pan map
            flyToLocation(lat, lng, 14);

            // Close menu
            searchResultsContainer.classList.add('hidden');
            searchResultsContainer.innerHTML = '';
        });
        
        searchResultsContainer.appendChild(li);
    });

    searchResultsContainer.classList.remove('hidden');
}

// --- Map Click Handler (Reverse Geocoding & Add Stop) ---
async function handleMapClick(lat, lng) {
    if (isGeocoding) {
        showToast("Please wait", "Resolving previous location coordinates.", "warning");
        return;
    }

    isGeocoding = true;
    showToast("Geocoding", "Resolving address for delivery coordinates...", "warning");

    try {
        const address = await reverseGeocodeAddress(lat, lng);

        const newLoc = {
            id: Date.now().toString(),
            lat: lat,
            lng: lng,
            address: address
        };

        locations.push(newLoc);
        isOptimized = false; // Location list changed, reset optimized state

        // Clear existing drawn route line since coordinates changed
        clearRouteLine();
        resetStatsUI();

        // Update markers & UI
        renderMapMarkers(locations, deleteLocation);
        renderUI();
        
        updateStatusIndicator('idle', "Pending Optimization");
        showToast("Stop Added", `Added Stop #${locations.length}: ${address}`, "success");
    } catch (error) {
        showToast("Geocoding Error", "Failed to resolve coordinates. Check connection.", "error");
    } finally {
        isGeocoding = false;
    }
}

// --- Delete Stop Location ---
function deleteLocation(id) {
    const index = locations.findIndex(loc => loc.id === id);
    if (index === -1) return;

    const removedAddress = locations[index].address;
    locations.splice(index, 1);
    
    isOptimized = false;
    clearRouteLine();
    resetStatsUI();

    renderMapMarkers(locations, deleteLocation);
    renderUI();

    if (locations.length === 0) {
        updateStatusIndicator('idle', "No Route Defined");
    } else {
        updateStatusIndicator('idle', "Pending Optimization");
    }

    showToast("Stop Removed", `Removed delivery location: "${removedAddress}"`, "warning");
}

// --- Clear All Locations ---
btnClearAll.addEventListener('click', () => {
    if (locations.length === 0) return;

    if (confirm("Are you sure you want to clear all delivery stops?")) {
        locations = [];
        isOptimized = false;
        clearRouteLine();
        renderMapMarkers(locations, deleteLocation);
        renderUI();
        resetStatsUI();
        resetMapCenter();
        updateStatusIndicator('idle', "No Route Defined");
        showToast("Cleared All", "All delivery locations and routes have been reset.", "info");
    }
});

// --- UI Rendering ---
function renderUI() {
    if (locations.length === 0) {
        emptyState.classList.remove('hidden');
        stopsListContainer.classList.add('hidden');
        stopsListContainer.innerHTML = '';
        
        btnOptimize.disabled = true;
        btnExport.disabled = true;
        btnSave.disabled = true;
        statStops.textContent = "0";

        // Reset search field values
        if (startLocationInput) {
            startLocationInput.value = '';
            clearStartBtn.classList.add('hidden');
        }
        if (stopLocationInput) {
            stopLocationInput.value = '';
            clearStopBtn.classList.add('hidden');
        }
    } else {
        emptyState.classList.add('hidden');
        stopsListContainer.classList.remove('hidden');
        stopsListContainer.innerHTML = '';

        // Synchronize start location text box
        if (startLocationInput) {
            startLocationInput.value = locations[0].address;
            clearStartBtn.classList.remove('hidden');
        }

        locations.forEach((loc, index) => {
            const li = document.createElement('li');
            li.className = `stop-item ${index === 0 ? 'start-stop' : ''}`;
            
            li.innerHTML = `
                <div class="stop-badge">${index + 1}</div>
                <div class="stop-details">
                    <div class="stop-address" title="${loc.address}">${loc.address}</div>
                    <div class="stop-coords">${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</div>
                </div>
                <button class="text-button text-danger btn-delete-stop" data-id="${loc.id}" title="Remove this stop">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            li.querySelector('.btn-delete-stop').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteLocation(loc.id);
            });
            
            stopsListContainer.appendChild(li);
        });

        // Update basic stop counter
        statStops.textContent = locations.length;

        // Button rules
        btnOptimize.disabled = locations.length < 2;
        btnExport.disabled = !isOptimized;
        btnSave.disabled = !isOptimized;
    }
}

// --- Geodesic calculations (Heuristics helper for savings stat) ---
function calculateOriginalGeodesicDistance(locationsList, closed) {
    if (locationsList.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < locationsList.length - 1; i++) {
        dist += haversineDistance(
            locationsList[i].lat, locationsList[i].lng,
            locationsList[i+1].lat, locationsList[i+1].lng
        );
    }
    if (closed) {
        dist += haversineDistance(
            locationsList[locationsList.length - 1].lat, locationsList[locationsList.length - 1].lng,
            locationsList[0].lat, locationsList[0].lng
        );
    }
    return dist;
}

// --- Statistics UI updates ---
function updateStatsUI(stops, distance, duration, savings) {
    statStops.textContent = stops;
    statDistance.textContent = `${distance.toFixed(1)} km`;
    
    if (duration >= 60) {
        const hrs = Math.floor(duration / 60);
        const mins = Math.round(duration % 60);
        statTime.textContent = `${hrs} hr ${mins} mins`;
    } else {
        statTime.textContent = `${Math.round(duration)} mins`;
    }

    statSavings.textContent = `${savings}%`;
}

function resetStatsUI() {
    statStops.textContent = locations.length;
    statDistance.textContent = "0.0 km";
    statTime.textContent = "0 mins";
    statSavings.textContent = "0%";
}

// --- Optimization Runner ---
btnOptimize.addEventListener('click', optimizeRoute);

async function optimizeRoute() {
    if (locations.length < 2) {
        showToast("Alert", "Please add at least 2 locations.", "warning");
        return;
    }

    showLoader("Applying Nearest Neighbor algorithm...");
    updateStatusIndicator('optimizing', "Calculating optimal order...");

    try {
        const closedLoop = (optimizationMode === 'closed');
        
        // 1. Solve the Travelling Salesman heuristic (returns reordered array + total geodesic distance)
        const tspResult = solveTSP(locations, closedLoop);
        
        // Retain unique locations in state (exclude duplicate depot references)
        let uniqueOptimizedStops = [...tspResult.optimizedLocations];
        if (closedLoop && uniqueOptimizedStops.length > 1) {
            uniqueOptimizedStops.pop(); // Remove the extra start node which completed the loop
        }

        // Calculate original sequential distance to show efficiency savings
        const originalGeodesicDist = calculateOriginalGeodesicDistance(locations, closedLoop);
        
        // Update local memory coordinates to optimized order
        locations = uniqueOptimizedStops;
        
        // 2. Fetch routing path from OpenRouteService
        showLoader("Fetching road calculations from OpenRouteService...");
        const routeData = await fetchRoute(tspResult.optimizedLocations, apiKey, transportProfile);

        // 3. Render road polyline & update sequential map pins
        drawRouteLine(routeData.coordinates);
        renderMapMarkers(locations, deleteLocation);

        // 4. Calculate efficiency savings
        const optimizedGeodesicDist = tspResult.totalGeodesicDistance;
        const savingsPercent = originalGeodesicDist > 0
            ? Math.max(0, Math.round(((originalGeodesicDist - optimizedGeodesicDist) / originalGeodesicDist) * 100))
            : 0;

        // 5. Update Stats
        updateStatsUI(
            locations.length,
            routeData.distance,
            routeData.duration,
            savingsPercent
        );

        isOptimized = true;
        updateStatusIndicator('ready', "Route Optimized");
        renderUI();

        showToast("Success", `Route optimized! Travel distance: ${routeData.distance.toFixed(1)} km. Saved ~${savingsPercent}% travel overhead.`, "success");

        // Auto-switch to Map view on mobile after successful optimization
        if (window.innerWidth <= 768 && mainContent && !mainContent.classList.contains('show-map')) {
            if (btnMobileToggle) btnMobileToggle.click();
        }
    } catch (error) {
        console.error("Optimization Execution Error: ", error);
        updateStatusIndicator('error', "Routing Error");
        showToast("Routing API Error", error.message, "error");
    } finally {
        hideLoader();
    }
}

// --- Save Route Logic ---
btnSave.addEventListener('click', saveCurrentRoute);

function saveCurrentRoute() {
    if (locations.length === 0 || !isOptimized) {
        showToast("Error", "You must optimize a route before saving it.", "error");
        return;
    }

    const defaultName = `Route - ${locations.length} Stops (${new Date().toLocaleDateString()})`;
    const name = prompt("Name your delivery route:", defaultName);
    
    if (name === null) return;
    const finalName = name.trim() !== "" ? name.trim() : defaultName;

    const routePayload = {
        name: finalName,
        stops: [...locations],
        date: Date.now(),
        stats: {
            stops: statStops.textContent,
            distance: statDistance.textContent,
            time: statTime.textContent,
            savings: statSavings.textContent
        }
    };

    savedRoutes.unshift(routePayload);
    if (savedRoutes.length > 20) {
        savedRoutes.pop();
    }

    localStorage.setItem('ors_saved_routes', JSON.stringify(savedRoutes));
    loadSavedRoutesList();
    showToast("Route Saved", `"${finalName}" saved to browser local database.`, "success");
}

function loadSavedRoutesList() {
    selectSavedRoutes.innerHTML = '<option value="" disabled selected>Select a saved route...</option>';

    try {
        const raw = localStorage.getItem('ors_saved_routes');
        savedRoutes = raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Failed to parse saved routes.", e);
        savedRoutes = [];
    }

    savedRoutes.forEach((route, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        const dateStr = new Date(route.date).toLocaleDateString();
        option.textContent = `${route.name} (${route.stops.length} stops) - ${dateStr}`;
        selectSavedRoutes.appendChild(option);
    });
}

selectSavedRoutes.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx) || !savedRoutes[idx]) return;

    const loadedRoute = savedRoutes[idx];
    locations = [...loadedRoute.stops];
    isOptimized = false; // Marks it for calculation so they can redraw paths if key changed
    
    clearRouteLine();
    renderMapMarkers(locations, deleteLocation);
    renderUI();

    // Recover stats if they exist
    if (loadedRoute.stats) {
        statStops.textContent = loadedRoute.stats.stops;
        statDistance.textContent = loadedRoute.stats.distance;
        statTime.textContent = loadedRoute.stats.time;
        statSavings.textContent = loadedRoute.stats.savings;
        updateStatusIndicator('ready', "Saved Route Loaded");
    } else {
        resetStatsUI();
        updateStatusIndicator('idle', "Loaded - Optimize Needed");
    }

    // Auto-center map on first stop if loaded
    if (locations.length > 0) {
        // Find leaflet map instance bounds and fit markers
        showToast("Route Loaded", `Loaded "${loadedRoute.name}" with ${locations.length} stops. Click 'Optimize' to calculate roads.`, "info");

        // Auto-switch to Map view on mobile to let the user see the loaded stops
        if (window.innerWidth <= 768 && mainContent && !mainContent.classList.contains('show-map')) {
            if (btnMobileToggle) btnMobileToggle.click();
        }
    }
});

// --- Export Route as JSON ---
btnExport.addEventListener('click', exportRouteAsJSON);

function exportRouteAsJSON() {
    if (locations.length === 0 || !isOptimized) return;

    const data = {
        application: "Smart Delivery Route Optimizer",
        exportTimestamp: new Date().toISOString(),
        settings: {
            optimizationMode: optimizationMode,
            transportProfile: transportProfile
        },
        routeSummary: {
            totalStops: statStops.textContent,
            routeDistance: statDistance.textContent,
            estimatedTravelTime: statTime.textContent,
            geodesicEfficiencySavings: statSavings.textContent
        },
        deliverySequence: locations.map((loc, index) => ({
            stopNumber: index + 1,
            address: loc.address,
            coordinates: {
                lat: loc.lat,
                lng: loc.lng
            }
        }))
    };

    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 4));
        const downloadEl = document.createElement('a');
        downloadEl.setAttribute("href", dataStr);
        
        const timestampStr = new Date().toISOString().slice(0, 10);
        downloadEl.setAttribute("download", `optimized-route-${timestampStr}.json`);
        document.body.appendChild(downloadEl);
        downloadEl.click();
        downloadEl.remove();

        showToast("Export Success", "JSON configuration downloaded.", "success");
    } catch (err) {
        showToast("Export Error", "Failed to build JSON download.", "error");
    }
}
