import { RouteInfo, ChargingStop, GLOBAL_EVS, ChargingStationDetails } from './types';
import { findNearestChargingStationWithinRange } from './stationService';

/**
 * Calculate charging stops for a given route
 */
export async function calculateChargeStops(
  totalDistance: number,
  routeData: {
    waypoints: Array<{
      location: { lat: number; lng: number };
    }>;
  },
  selectedEV: string,
  currentCharge: number,
  isRoundTrip: boolean
): Promise<RouteInfo> {
  const evSpecs = GLOBAL_EVS[selectedEV];
  const currentChargeKwh = (currentCharge / 100) * evSpecs.batteryCapacity;
  const oneWayDistance = totalDistance / (isRoundTrip ? 2 : 1);
  const stops: ChargingStop[] = [];
  let totalTime = (totalDistance / 80) * 60;

  const path = routeData.waypoints;
  const pathLength = path.length;

  const calculateDirectionalStops = async (
    startDistance: number,
    endDistance: number,
    direction: 'outward' | 'return',
    initialBattery: number
  ) => {
    let currentDist = startDistance;
    let battery = initialBattery;
    let currentPathIndex = Math.floor((currentDist / totalDistance) * (pathLength - 1));

    while (currentDist < endDistance) {
      const rangeLeft = battery / evSpecs.efficiency;
      
      if (rangeLeft < 50 && (endDistance - currentDist) > 50) {
        const idealStopPoint = {
          lat: path[currentPathIndex].location.lat,
          lng: path[currentPathIndex].location.lng
        };

        // Find nearest suitable charging station within remaining range
        const { station, distance: actualStopDistance } = await findNearestChargingStationWithinRange(
          idealStopPoint,
          rangeLeft,
          path,
          currentPathIndex
        );

        if (!station) {
          // If no station found within range, use the ideal point and mark it
          const chargeAmount = evSpecs.batteryCapacity * 0.8;
          const chargingTime = (chargeAmount - battery) / (evSpecs.chargingRate / 60);

          stops.push({
            location: idealStopPoint,
            duration: Math.round(chargingTime),
            chargeAmount: Math.round(chargeAmount),
            distance: Math.round(currentDist),
            direction,
            originalDistance: Math.round(currentDist)
          });

          totalTime += chargingTime;
          battery = chargeAmount;
        } else {
          // Use the found charging station
          const chargeAmount = evSpecs.batteryCapacity * 0.8;
          const chargingTime = (chargeAmount - battery) / (evSpecs.chargingRate / 60);

          stops.push({
            location: {
              lat: station.geometry.location.lat,
              lng: station.geometry.location.lng
            },
            duration: Math.round(chargingTime),
            chargeAmount: Math.round(chargeAmount),
            distance: Math.round(actualStopDistance),
            station,
            direction,
            originalDistance: Math.round(currentDist)
          });

          totalTime += chargingTime;
          battery = chargeAmount;
        }
      }

      const distanceToNext = Math.min(rangeLeft * 0.8, endDistance - currentDist);
      currentDist += distanceToNext;
      currentPathIndex = Math.floor((currentDist / totalDistance) * (pathLength - 1));
      battery -= distanceToNext * evSpecs.efficiency;
    }
    
    return battery;
  };

  // Calculate outward journey stops
  const remainingBattery = await calculateDirectionalStops(0, oneWayDistance, 'outward', currentChargeKwh);

  // Calculate return journey stops if it's a round trip
  if (isRoundTrip) {
    await calculateDirectionalStops(oneWayDistance, totalDistance, 'return', remainingBattery);
  }

  return {
    stops,
    totalTime: Math.floor(totalTime),
    totalDistance: Math.round(totalDistance)
  };
}

export async function planRoute(
  source: string,
  destination: string,
  selectedEV: string,
  currentCharge: number,
  isRoundTrip: boolean,
  routeData: {
    distance: number;
    duration: number;
    waypoints: {
      startLocation: { lat: number; lng: number };
      endLocation: { lat: number; lng: number };
    }[];
  }
): Promise<RouteInfo> {
  try {
    const totalDistance = routeData.distance;
    const totalTime = routeData.duration;
    
    // Transform waypoints into the format needed by calculateChargeStops
    const transformedRouteData = {
      waypoints: routeData.waypoints.map(wp => ({
        location: wp.startLocation
      }))
    };
    
    return await calculateChargeStops(
      totalDistance,
      transformedRouteData,
      selectedEV,
      currentCharge,
      isRoundTrip
    );
  } catch (error) {
    console.error('Error planning route:', error);
    throw error;
  }
}

// Helper function to calculate charging stops
async function calculateStops(
  distance: number,
  initialRange: number,
  evSpecs: any,
  waypoints: { startLocation: { lat: number; lng: number }; endLocation: { lat: number; lng: number } }[],
  direction: 'outward' | 'return',
  stops: ChargingStop[]
): Promise<void> {
  let remainingRange = initialRange;
  let distanceCovered = 0;
  
  while (distanceCovered < distance) {
    const distanceToNextStop = Math.min(remainingRange * 0.8, distance - distanceCovered);
    distanceCovered += distanceToNextStop;
    remainingRange -= distanceToNextStop;
    
    // If we've reached the destination or have enough range, break
    if (distanceCovered >= distance || remainingRange >= evSpecs.range * (evSpecs.minChargeLevel / 100)) {
      break;
    }
    
    // Find nearest charging station to this point
    const nearestWaypoint = findNearestWaypoint(distanceCovered, distance, waypoints);
    
    // Find nearest charging station within range
    const { station, distance: actualStopDistance } = await findNearestChargingStationWithinRange(
      nearestWaypoint,
      remainingRange,
      [], // Remove path dependency
      0 // Remove path index dependency
    );
    
    // Calculate charging duration
    const currentPercentage = (remainingRange / evSpecs.range) * 100;
    const targetPercentage = 80;
    const percentageToCharge = targetPercentage - currentPercentage;
    const energyToCharge = (percentageToCharge / 100) * evSpecs.batteryCapacity;
    const chargingDuration = Math.ceil((energyToCharge / evSpecs.chargingRate) * 60); // in minutes
    
    // Add stop to list
    stops.push({
      distance: distanceCovered,
      originalDistance: distanceCovered,
      location: station ? {
        lat: station.geometry.location.lat,
        lng: station.geometry.location.lng
      } : nearestWaypoint,
      duration: chargingDuration,
      station,
      direction
    });
    
    // Reset remaining range to 80% of full range
    remainingRange = evSpecs.range * 0.8;
  }
}

// Helper function to find the nearest waypoint to a given distance along the route
function findNearestWaypoint(
  targetDistance: number,
  totalDistance: number,
  waypoints: { startLocation: { lat: number; lng: number }; endLocation: { lat: number; lng: number } }[]
): { lat: number; lng: number } {
  if (waypoints.length === 0) {
    return { lat: 0, lng: 0 };
  }
  
  if (waypoints.length === 1) {
    return waypoints[0].startLocation;
  }
  
  // Calculate approximate position based on percentage of total distance
  const percentage = targetDistance / totalDistance;
  const index = Math.floor(percentage * (waypoints.length - 1));
  
  return waypoints[index].endLocation;
} 