/**
 * js/routing.js
 * Handles OpenRouteService API integration and route polyline decoding.
 */

// Global config with fallback API key.
// The user can edit this string directly, or set it via the settings UI (stored in localStorage)
export const config = {
    ORS_API_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQyNTljMDhlYWM2NTRlZWU5MjhjYTQ2OWU0ZDFhZTBkIiwiaCI6Im11cm11cjY0In0="
};

/**
 * Decodes a Google Encoded Polyline string (precision 5) into a list of [lat, lng] coordinates.
 * @param {string} encoded - The encoded polyline string.
 * @returns {Array<Array<number>>} Array of [latitude, longitude] pairs.
 */
export function decodePolyline(encoded) {
    if (!encoded) return [];
    
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        
        // Decode Latitude
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        // Decode Longitude
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        // Add [lat, lng] to points list
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

/**
 * Fetches routing directions from OpenRouteService for a list of locations.
 * 
 * @param {Array<Object>} locations - Ordered array of locations: [{lat, lng}, ...]
 * @param {string} customApiKey - Optional custom API key (from localStorage)
 * @param {string} profile - ORS vehicle profile (e.g. 'driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking')
 * @returns {Promise<Object>} Object containing { distance, duration, coordinates }
 */
export async function fetchRoute(locations, customApiKey = null, profile = 'driving-car') {
    // Determine API Key to use (custom overrides config)
    const apiKey = (customApiKey && customApiKey !== "") ? customApiKey : config.ORS_API_KEY;
    
    if (!apiKey || apiKey === "REPLACE_WITH_API_KEY") {
        throw new Error("Missing OpenRouteService API Key. Please click the gear icon to set your API key.");
    }

    if (locations.length < 2) {
        throw new Error("At least 2 delivery locations are required to draw a route.");
    }

    // Format coordinates as [longitude, latitude] for OpenRouteService
    const coordinates = locations.map(loc => [loc.lng, loc.lat]);
    
    // Set search radiuses to -1 (unlimited) for all points to snap off-road locations 
    // to the nearest routable street, preventing "Could not find routable point" errors.
    const radiuses = new Array(coordinates.length).fill(-1);

    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json; charset=utf-8',
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                coordinates: coordinates,
                radiuses: radiuses
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
            if (errData.error && errData.error.message) {
                errorMessage = errData.error.message;
            } else if (response.status === 401 || response.status === 403) {
                errorMessage = "Invalid API Key. Please verify your OpenRouteService API key in settings.";
            } else if (response.status === 404) {
                errorMessage = "No route found between the selected delivery locations. They may be separated by water or have no road access.";
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error("No route calculations returned from the server.");
        }

        const route = data.routes[0];
        const distance = route.summary.distance; // meters
        const duration = route.summary.duration; // seconds
        const encodedGeometry = route.geometry;

        // Decode geometry to [lat, lng] array
        const decodedCoords = decodePolyline(encodedGeometry);

        return {
            distance: distance / 1000, // convert to km
            duration: duration / 60,   // convert to minutes
            coordinates: decodedCoords
        };
    } catch (error) {
        console.error("OpenRouteService API Error: ", error);
        throw error;
    }
}
