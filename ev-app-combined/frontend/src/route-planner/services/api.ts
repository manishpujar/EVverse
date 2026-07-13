import axios from 'axios';
import { RouteInfo, ChargingStationDetails, RouteRequest, StationSearchRequest } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const findNearbyStations = async (
  request: StationSearchRequest
): Promise<google.maps.places.PlaceResult[]> => {
  try {
    const response = await axios.post(`${API_URL}/stations/nearby`, request);
    return response.data;
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    return [];
  }
};

export const findNearestStation = async (
  location: { lat: number; lng: number },
  range: number
): Promise<google.maps.places.PlaceResult | null> => {
  try {
    const response = await axios.post(`${API_URL}/stations/nearest`, { location, range });
    return response.data;
  } catch (error) {
    console.error('Error finding nearest station:', error);
    return null;
  }
};

export const planRoute = async (
  directionsResult: google.maps.DirectionsResult,
  routeRequest: RouteRequest
): Promise<RouteInfo> => {
  try {
    const legs = directionsResult.routes[0].legs;
    const routeData = {
      distance: legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000,
      duration: legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60,
      waypoints: legs.map(leg => ({
        startLocation: {
          lat: leg.start_location.lat(),
          lng: leg.start_location.lng()
        },
        endLocation: {
          lat: leg.end_location.lat(),
          lng: leg.end_location.lng()
        }
      }))
    };

    const response = await axios.post(`${API_URL}/routes/plan`, {
      ...routeRequest,
      routeData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error planning route:', error);
    throw error;
  }
};

export const getStationDetails = async (placeId: string): Promise<ChargingStationDetails> => {
  try {
    const response = await axios.get(`${API_URL}/stations/details/${placeId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting station details:', error);
    throw error;
  }
}; 