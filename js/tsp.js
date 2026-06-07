/**
 * js/tsp.js
 * Implementation of the Travelling Salesman Problem (TSP) optimizer using
 * the Nearest Neighbor heuristic for geodesic (Haversine) distances.
 */

/**
 * Calculates the geodesic distance between two points using the Haversine formula.
 * @param {number} lat1 - Latitude of first point.
 * @param {number} lon1 - Longitude of first point.
 * @param {number} lat2 - Latitude of second point.
 * @param {number} lon2 - Longitude of second point.
 * @returns {number} Distance in kilometers.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Optimizes a list of locations using the Nearest Neighbor TSP heuristic.
 * Starts from the first location (depot) and finds the nearest unvisited location.
 * 
 * @param {Array<Object>} locations - Array of location objects, each containing:
 *                                    { id, lat, lng, address }
 * @param {boolean} closedLoop - If true, appends the starting point to the end.
 * @returns {Object} { optimizedLocations, originalIndices, totalGeodesicDistance }
 */
export function solveTSP(locations, closedLoop = true) {
    if (!locations || locations.length === 0) {
        return { optimizedLocations: [], originalIndices: [], totalGeodesicDistance: 0 };
    }
    
    // Copy locations to avoid modifying original array
    const unvisited = [...locations];
    const optimizedLocations = [];
    const originalIndices = [];
    
    // Start at the first location (depot)
    let current = unvisited.shift();
    optimizedLocations.push(current);
    originalIndices.push(locations.indexOf(current));
    
    let totalGeodesicDistance = 0;
    
    while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
            const dist = haversineDistance(
                current.lat, current.lng,
                unvisited[i].lat, unvisited[i].lng
            );
            if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = i;
            }
        }
        
        // Move to the nearest location
        totalGeodesicDistance += minDistance;
        current = unvisited.splice(nearestIndex, 1)[0];
        optimizedLocations.push(current);
        originalIndices.push(locations.indexOf(current));
    }
    
    // Return to start if closed loop is enabled
    if (closedLoop && locations.length > 1) {
        const start = locations[0];
        const distBack = haversineDistance(
            current.lat, current.lng,
            start.lat, start.lng
        );
        totalGeodesicDistance += distBack;
        
        // We append a reference to the starting point to complete the loop
        optimizedLocations.push(start);
        originalIndices.push(0);
    }
    
    return {
        optimizedLocations,
        originalIndices,
        totalGeodesicDistance
    };
}
