import { ChargingStationDetails, ChargerType, CHARGER_TYPES } from './types';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Get randomized charger details for a charging station
 */
export function getRandomChargerDetails(): ChargingStationDetails {
  const types = ['DC Fast', 'AC Level 2'] as ChargerType[];
  if (Math.random() > 0.7) types.push('Tesla Supercharger' as ChargerType);
  
  const connectors = new Set<string>();
  types.forEach(type => {
    CHARGER_TYPES[type].connectors.forEach(connector => connectors.add(connector));
  });
  
  const power = types.includes('DC Fast') ? '50-350kW' : '7-22kW';
  
  return {
    types,
    connectors: Array.from(connectors),
    power
  };
}

/**
 * Find nearby charging stations around a location
 */
export async function findNearbyChargingStations(
  location: { lat: number; lng: number }, 
  radius: number = 10000
): Promise<any[]> {
  try {
    // For now, use mock data since we haven't set up the Google API key
    return getMockStations(location, radius);
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    return [];
  }
}

/**
 * Find the single nearest charging station to a location, within range (km)
 */
export async function findNearestStation(
  location: { lat: number; lng: number },
  range: number
): Promise<any | null> {
  const stations = await findNearbyStations(location, range * 1000);
  if (stations.length === 0) return null;

  let nearest: any = null;
  let nearestDistance = Infinity;

  for (const station of stations) {
    if (!station.geometry?.location) continue;
    const distance = calculateDistance(
      location.lat, location.lng,
      station.geometry.location.lat, station.geometry.location.lng
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

export const findNearestChargingStation = findNearestStation;

/**
 * Find the nearest charging station within a certain range along a route
 */
export async function findNearestChargingStationWithinRange(
  location: { lat: number; lng: number },
  remainingRange: number,
  path: Array<{ location: { lat: number; lng: number } }>,
  currentPathIndex: number
): Promise<{ station: any | null; distance: number }> {
  // First try with a smaller radius
  let stations = await findNearbyChargingStations(location, 5000);
  
  // If no stations found, try with a larger radius
  if (stations.length === 0) {
    stations = await findNearbyChargingStations(
      location, 
      Math.min(remainingRange * 1000, 20000)
    );
  }

  if (stations.length === 0) {
    return { station: null, distance: 0 };
  }

  // Calculate distances to all stations and find the best one
  const stationDistances = await Promise.all(
    stations.map(async (station) => {
      if (!station.geometry?.location) return { station, distance: Infinity, totalDetour: Infinity };

      // Find the closest point on the route to this station
      let minDistance = Infinity;
      let bestDistance = 0;
      
      // Look at nearby points on the path to find the best detour
      const searchRange = 10;
      const startIdx = Math.max(0, currentPathIndex - searchRange);
      const endIdx = Math.min(path.length - 1, currentPathIndex + searchRange);
      
      for (let i = startIdx; i <= endIdx; i++) {
        const pathPoint = path[i];
        const stationPoint = station.geometry.location;
        
        // Calculate direct distance using Haversine formula
        const directDist = calculateDistance(
          pathPoint.location.lat, pathPoint.location.lng,
          stationPoint.lat, stationPoint.lng
        );
        
        if (directDist < minDistance && directDist <= remainingRange * 0.8) {
          minDistance = directDist;
          bestDistance = (i / path.length) * remainingRange;
        }
      }

      return { station, distance: bestDistance, totalDetour: minDistance };
    })
  );

  // Sort by total detour distance and pick the best option
  const validStations = stationDistances
    .filter(({ distance, totalDetour }) => 
      distance < remainingRange && totalDetour < remainingRange * 0.2)
    .sort((a, b) => a.totalDetour - b.totalDetour);

  if (validStations.length === 0) {
    return { station: null, distance: 0 };
  }

  return {
    station: validStations[0].station,
    distance: validStations[0].distance
  };
}

export const findNearbyStations = async (
  location: { lat: number; lng: number },
  radius: number
): Promise<any[]> => {
  // Implementation of finding nearby stations
  // This would likely use a Maps API or your own database
  
  // Example implementation (replace with actual implementation)
  try {
    // Here you would typically call Google Places API or similar
    // For now, returning mock data
    return getMockStations(location, radius);
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    return [];
  }
};

export async function getStationDetails(placeId: string): Promise<ChargingStationDetails> {
  // Return mock data for now
  return Promise.resolve({
    types: ['Fast Charging', 'DC Fast Charging'],
    connectors: ['CCS', 'CHAdeMO', 'Type 2'],
    power: '150kW'
  });
}

// Helper function to generate mock data (remove in production)
function getMockStations(location: { lat: number; lng: number }, radius: number): any[] {
  // Generate some mock stations around the given location
  return [
    {
      place_id: 'mock-place-1',
      name: 'EV Charging Station 1',
      formatted_address: '123 Electric Ave, City',
      geometry: {
        location: {
          lat: location.lat + 0.01,
          lng: location.lng + 0.01,
          toJSON: () => ({ lat: location.lat + 0.01, lng: location.lng + 0.01 })
        }
      },
      rating: 4.5,
      opening_hours: { isOpen: true }
    },
    {
      place_id: 'mock-place-2',
      name: 'EV Charging Station 2',
      formatted_address: '456 Power St, City',
      geometry: {
        location: {
          lat: location.lat - 0.01,
          lng: location.lng - 0.01,
          toJSON: () => ({ lat: location.lat - 0.01, lng: location.lng - 0.01 })
        }
      },
      rating: 4.2,
      opening_hours: { isOpen: false }
    }
  ];
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Keep your existing mock data functions but update getMockStationDetails
function getMockStationDetails(placeId: string): ChargingStationDetails {
  return {
    types: ['Fast Charging', 'DC Fast Charging'],
    connectors: ['CCS', 'CHAdeMO', 'Type 2'],
    power: '150kW'
  };
} 