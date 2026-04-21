// lib/directions.ts
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  polyline: string;
  points?: Array<{ latitude: number; longitude: number }>;
}

export async function getDirectionsFromGoogle(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteInfo | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API key is missing');
    return null;
  }
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&key=${apiKey}` +
    `&mode=driving`;

  try {
    console.log('Fetching directions from Google...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decode the polyline points
      const points = decodePolyline(route.overview_polyline.points);
      
      return {
        distance: leg.distance.value / 1000, // Convert to kilometers
        duration: leg.duration.value / 60, // Convert to minutes
        polyline: route.overview_polyline.points,
        points: points,
      };
    } else {
      console.error('Directions API error:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Directions API error:', error);
    return null;
  }
}

// Helper function to decode Google's encoded polyline
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}