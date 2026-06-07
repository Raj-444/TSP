/**
 * js/map.js
 * Manages Leaflet map initialization, markers, routes, and address reverse-geocoding.
 * Supports light & dark tile layers mapping standard themes.
 */

let mapInstance = null;
let markerLayerGroup = null;
let routePolylineLayer = null;
let activeTileLayer = null;

// SVG pin and pulse animation markup for custom markers
function createCustomMarkerIcon(number, isStart = false) {
    const markerClass = isStart ? 'start-stop-marker' : 'regular-marker';
    return L.divIcon({
        html: `
            <div class="marker-pin-wrapper ${markerClass}">
                <div class="marker-pulse"></div>
                <svg class="marker-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16,2 C9.37,2 4,7.37 4,14 C4,22.75 14.5,30.25 15.2,30.73 C15.44,30.9 15.72,31 16,31 C16.28,31 16.56,30.9 16.8,30.73 C17.5,30.25 28,22.75 28,14 C28,7.37 22.63,2 16,2 Z" />
                </svg>
                <span class="marker-label">${number}</span>
            </div>
        `,
        className: 'custom-map-marker',
        iconSize: [32, 36],
        iconAnchor: [16, 31],
        popupAnchor: [0, -32]
    });
}

/**
 * Initializes the Leaflet map.
 * @param {string} elementId - The ID of the map container element.
 * @param {Function} onClickCallback - Callback triggered when the map is clicked: (lat, lng) => {}
 * @returns {L.Map} The initialized Leaflet map instance.
 */
export function initMap(elementId, onClickCallback) {
    // Bangladesh default coordinates
    const defaultCenter = [23.6850, 90.3563];
    const defaultZoom = 7;

    // Create Leaflet Map centered on Bangladesh
    mapInstance = L.map(elementId, {
        zoomControl: true,
        attributionControl: true
    }).setView(defaultCenter, defaultZoom);

    // Layer groups for markers & routing
    markerLayerGroup = L.layerGroup().addTo(mapInstance);
    routePolylineLayer = L.layerGroup().addTo(mapInstance);

    // Listen for click events on map
    mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (onClickCallback) {
            onClickCallback(lat, lng);
        }
    });

    return mapInstance;
}

/**
 * Swaps map tiles dynamically based on the current theme mode.
 * @param {boolean} isDark - True for dark mode, false for light mode.
 */
export function setMapTheme(isDark) {
    if (!mapInstance) return;

    if (activeTileLayer) {
        mapInstance.removeLayer(activeTileLayer);
    }

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    activeTileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: attribution
    });

    activeTileLayer.addTo(mapInstance);
}

/**
 * Queries OSM Nominatim API to get human-readable address for a coordinate.
 * @param {number} lat - Latitude.
 * @param {number} lng - Longitude.
 * @returns {Promise<string>} The address string.
 */
export async function reverseGeocodeAddress(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'SmartRouteOptimaApp/1.0 (rajes@example.com)'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error("Geocoding service unavailable.");
        }
        
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.suburb || addr.neighbourhood || "";
            const village = addr.village || addr.town || addr.city_district || "";
            const city = addr.city || addr.state || "";
            
            let displayString = [road, village, city]
                .filter(part => part !== "")
                .join(", ");
                
            if (!displayString) {
                displayString = data.display_name;
            }
            
            if (displayString.length > 55) {
                return displayString.substring(0, 52) + "...";
            }
            return displayString;
        }
        
        return `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    } catch (error) {
        console.warn("Geocoding failed, using coordinates fallback: ", error);
        return `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    }
}

/**
 * Updates markers layer on the map with the current list of locations.
 * @param {Array<Object>} locations - Current locations list.
 * @param {Function} onDeleteCallback - Callback triggered when marker popup delete button is clicked: (id) => {}
 */
export function renderMapMarkers(locations, onDeleteCallback) {
    if (!markerLayerGroup) return;

    // Clear existing markers
    markerLayerGroup.clearLayers();

    locations.forEach((loc, index) => {
        const isStart = index === 0;
        const markerNum = index + 1;
        const icon = createCustomMarkerIcon(markerNum, isStart);
        
        const marker = L.marker([loc.lat, loc.lng], { icon: icon });
        
        const popupContent = document.createElement('div');
        popupContent.className = 'custom-popup-content';
        popupContent.innerHTML = `
            <div class="popup-title">
                <i class="fa-solid fa-location-dot"></i> Stop #${markerNum} ${isStart ? '(Start/Depot)' : ''}
            </div>
            <div class="popup-desc">${loc.address}</div>
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'popup-delete-btn';
        deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Remove Stop`;
        deleteBtn.onclick = () => {
            if (onDeleteCallback) {
                onDeleteCallback(loc.id);
            }
        };
        
        popupContent.appendChild(deleteBtn);

        marker.bindPopup(popupContent);
        markerLayerGroup.addLayer(marker);
    });
}

/**
 * Draws the routing polyline on the map.
 * @param {Array<Array<number>>} coordinates - Decoded coordinates: [[lat, lng], ...]
 */
export function drawRouteLine(coordinates) {
    if (!routePolylineLayer || !mapInstance) return;

    routePolylineLayer.clearLayers();

    if (coordinates.length === 0) return;

    const polyline = L.polyline(coordinates, {
        color: '#4f46e5',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round'
    });

    routePolylineLayer.addLayer(polyline);

    mapInstance.fitBounds(polyline.getBounds(), {
        padding: [50, 50]
    });
}

/**
 * Clears the routing polyline layer.
 */
export function clearRouteLine() {
    if (routePolylineLayer) {
        routePolylineLayer.clearLayers();
    }
}

/**
 * Re-centers map on Bangladesh view.
 */
export function resetMapCenter() {
    if (mapInstance) {
        mapInstance.setView([23.6850, 90.3563], 7);
    }
}

/**
 * Focuses map view on a specific coordinate.
 * @param {number} lat - Latitude.
 * @param {number} lng - Longitude.
 * @param {number} zoom - Zoom level.
 */
export function flyToLocation(lat, lng, zoom = 14) {
    if (mapInstance) {
        mapInstance.flyTo([lat, lng], zoom, {
            animate: true,
            duration: 1.2
        });
    }
}

/**
 * Invalidates map size layout constraints.
 */
export function invalidateMapSize() {
    if (mapInstance) {
        mapInstance.invalidateSize();
    }
}
