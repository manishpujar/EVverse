import { useState, useCallback, useEffect } from 'react';
import { Battery, MapPin, Clock, Car, AlertCircle, Zap, Search, Navigation, Power, Plug, RotateCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { GoogleMap, DirectionsService, DirectionsRenderer, StandaloneSearchBox, Marker, InfoWindow } from '@react-google-maps/api';

// Import shared types from the frontend's own types module
import {
  GLOBAL_EVS,
  RouteInfo,
  ChargingStationDetails,
  RouteRequest,
  StationSearchRequest
} from './types';

// Import API services
import {
  findNearbyStations,
  planRoute,
  getStationDetails
} from './services/api';

interface RoutePlannerAppProps {
  isLoaded: boolean;
  loadError?: Error;
}

function RoutePlannerApp({ isLoaded, loadError }: RoutePlannerAppProps) {
  const [selectedEV, setSelectedEV] = useState<string>("Tesla Model 3 Long Range");
  const [currentCharge, setCurrentCharge] = useState<number>(80);
  const [source, setSource] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 0, lng: 0 });
  const [directionsKey, setDirectionsKey] = useState<number>(0);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [sourceSearchBox, setSourceSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [destSearchBox, setDestSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [locationSearchBox, setLocationSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [selectedStation, setSelectedStation] = useState<google.maps.places.PlaceResult | null>(null);
  const [nearbyStations, setNearbyStations] = useState<google.maps.places.PlaceResult[]>([]);
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [isRoutePlanner, setIsRoutePlanner] = useState<boolean>(true);
  const [stationDetails, setStationDetails] = useState<Map<string, ChargingStationDetails>>(new Map());

  // Fetch charger-type/connector details for stations and merge into state.
  // (This is what the old, non-compiling code was trying to do by passing
  // setStationDetails into findNearbyStations/planRoute — those functions
  // never supported that, so details were never actually loaded.)
  const loadStationDetails = useCallback(async (stations: google.maps.places.PlaceResult[]) => {
    const withIds = stations.filter(
      (s): s is google.maps.places.PlaceResult & { place_id: string } => !!s.place_id
    );
    if (withIds.length === 0) return;

    const entries = await Promise.all(
      withIds.map(async (station) => {
        try {
          const details = await getStationDetails(station.place_id);
          return [station.place_id, details] as const;
        } catch (error) {
          console.error(`Error fetching details for station ${station.place_id}:`, error);
          return null;
        }
      })
    );

    setStationDetails(prev => {
      const next = new Map(prev);
      entries.forEach((entry) => {
        if (entry) next.set(entry[0], entry[1]);
      });
      return next;
    });
  }, []);

  // Get user's location and nearby stations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(location);
          if (isLoaded) {
            // Use the backend API for finding nearby stations
            const searchRequest: StationSearchRequest = {
              location,
              radius: 10000
            };
            
            try {
              const stations = await findNearbyStations(searchRequest);
              setNearbyStations(stations);
              loadStationDetails(stations);
            } catch (error) {
              console.error("Error finding nearby stations:", error);
            }
          }
        },
        () => {
          setMapCenter({ lat: 20, lng: 0 });
        }
      );
    }
  }, [isLoaded, loadStationDetails]);

  const onSourceBoxLoaded = (ref: google.maps.places.SearchBox) => {
    setSourceSearchBox(ref);
  };

  const setDestBoxLoaded = (ref: google.maps.places.SearchBox) => {
    setDestSearchBox(ref);
  };

  const onLocationBoxLoaded = (ref: google.maps.places.SearchBox) => {
    setLocationSearchBox(ref);
  };

  const onSourcePlacesChanged = () => {
    if (sourceSearchBox) {
      const places = sourceSearchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.formatted_address) {
          setSource(place.formatted_address);
          handleLocationChange();
        }
      }
    }
  };

  const onDestPlacesChanged = () => {
    if (destSearchBox) {
      const places = destSearchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.formatted_address) {
          setDestination(place.formatted_address);
          handleLocationChange();
        }
      }
    }
  };

  const onLocationPlacesChanged = async () => {
    if (locationSearchBox) {
      const places = locationSearchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.geometry?.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };
          setMapCenter(location);
          setSearchLocation(place.formatted_address || "");
          
          try {
            const searchRequest: StationSearchRequest = {
              location,
              radius: 10000
            };
            const stations = await findNearbyStations(searchRequest);
            setNearbyStations(stations);
            loadStationDetails(stations);
          } catch (error) {
            console.error("Error finding nearby stations:", error);
          }
        }
      }
    }
  };

  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirections(result);
      setDirectionsError(null);
      
      const routeRequest: RouteRequest = {
        source,
        destination,
        selectedEV,
        currentCharge,
        isRoundTrip
      };
      
      planRoute(result, routeRequest)
        .then(routeInfo => {
          setRouteInfo(routeInfo);
          const stopStations = routeInfo.stops
            .map(stop => stop.station)
            .filter((s): s is google.maps.places.PlaceResult => !!s);
          loadStationDetails(stopStations);
        })
        .catch(error => {
          console.error("Error planning route:", error);
          setDirectionsError("Error planning route. Please try again.");
        });
    } else {
      setDirections(null);
      setRouteInfo(null);
      switch (status) {
        case 'NOT_FOUND':
          setDirectionsError('Could not find a route between these locations. Please check if the addresses are correct.');
          break;
        case 'ZERO_RESULTS':
          setDirectionsError('No driving route found between these locations.');
          break;
        case 'MAX_WAYPOINTS_EXCEEDED':
          setDirectionsError('Too many waypoints in the route.');
          break;
        case 'INVALID_REQUEST':
          setDirectionsError('Please enter both source and destination locations.');
          break;
        case 'OVER_QUERY_LIMIT':
          setDirectionsError('Too many requests. Please try again later.');
          break;
        case 'REQUEST_DENIED':
          setDirectionsError('Route request was denied. Please check your API key configuration.');
          break;
        default:
          setDirectionsError('Could not calculate the route. Please try again.');
      }
    }
  }, [currentCharge, selectedEV, isRoundTrip, source, destination, loadStationDetails]);

  const handleLocationChange = useCallback(() => {
    setDirectionsKey(prev => prev + 1);
    setDirectionsError(null);
  }, []);

  const evSpecs = GLOBAL_EVS[selectedEV];

  const renderSearchBox = (
    type: 'source' | 'destination' | 'location',
    value: string,
    onChange: (value: string) => void,
    onBoxLoaded: (ref: google.maps.places.SearchBox) => void,
    onPlacesChanged: () => void
  ) => {
    if (!isLoaded) {
      return (
        <input
          type="text"
          placeholder={`Enter ${type} location`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled
        />
      );
    }

    return (
      <StandaloneSearchBox
        onLoad={onBoxLoaded}
        onPlacesChanged={onPlacesChanged}
      >
        <input
          type="text"
          placeholder={`Enter ${type} location`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </StandaloneSearchBox>
    );
  };

  const renderStationDetails = (station: google.maps.places.PlaceResult) => {
    const details = station.place_id ? stationDetails.get(station.place_id) : null;
    
    if (!details) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-gray-700">
          <Power className="w-4 h-4" />
          <span>Power Output: {details.power}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Plug className="w-4 h-4" />
          <div>
            <p className="font-medium">Available Connectors:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {details.connectors.map((connector, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {connector}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Zap className="w-4 h-4" />
          <div>
            <p className="font-medium">Charger Types:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {details.types.map((type, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600" />
              EV Route Planner
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setIsRoutePlanner(true)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isRoutePlanner ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Navigation className="w-5 h-5" />
                Route Planner
              </button>
              <button
                onClick={() => setIsRoutePlanner(false)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  !isRoutePlanner ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Search className="w-5 h-5" />
                Find Chargers
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1 space-y-4">
              {isRoutePlanner ? (
                <>
                  <label className="block">
                    <span className="text-gray-700 flex items-center gap-2 mb-1">
                      <Car className="w-5 h-5 text-purple-600" />
                      Select Your EV
                    </span>
                    <select
                      value={selectedEV}
                      onChange={(e) => {
                        setSelectedEV(e.target.value);
                        handleLocationChange();
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {Object.keys(GLOBAL_EVS).map((ev) => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-gray-700 flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-red-600" />
                        Source Location
                      </span>
                      {renderSearchBox(
                        'source',
                        source,
                        setSource,
                        onSourceBoxLoaded,
                        onSourcePlacesChanged
                      )}
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-gray-700 flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Destination
                      </span>
                      {renderSearchBox(
                        'destination',
                        destination,
                        setDestination,
                        setDestBoxLoaded,
                        onDestPlacesChanged
                      )}
                    </label>
                  </div>

                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 flex items-center gap-2">
                        <RotateCw className="w-5 h-5 text-orange-600" />
                        Round Trip
                      </span>
                      <div className="relative inline-block w-12 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          checked={isRoundTrip}
                          onChange={() => {
                            setIsRoundTrip(!isRoundTrip);
                            handleLocationChange();
                          }}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                            isRoundTrip ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-gray-700 flex items-center gap-2 mb-1">
                      <Battery className="w-5 h-5 text-green-600" />
                      Current Battery Charge (%)
                    </span>
                    <input
                      type="number"
                      value={currentCharge}
                      onChange={(e) => {
                        setCurrentCharge(Math.min(100, Math.max(0, Number(e.target.value))));
                        handleLocationChange();
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="0"
                      max="100"
                    />
                  </label>

                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Specifications</h2>
                    <div className="space-y-2">
                      <p className="text-gray-600">Model: {selectedEV}</p>
                      <p className="text-gray-600">Battery Capacity: {evSpecs.batteryCapacity} kWh</p>
                      <p className="text-gray-600">Range: {evSpecs.range} km</p>
                      <p className="text-gray-600">Charging Rate: {evSpecs.chargingRate} kW</p>
                      <p className="text-gray-600">Min. Battery Level: {evSpecs.minChargeLevel}%</p>
                      <div className="mt-3">
                        <p className="text-gray-600">Compatible Connectors:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {evSpecs.connectorTypes.map((connector, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {connector}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-gray-700 flex items-center gap-2 mb-1">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      Search Location
                    </span>
                    {renderSearchBox(
                      'location',
                      searchLocation,
                      setSearchLocation,
                      onLocationBoxLoaded,
                      onLocationPlacesChanged
                    )}
                  </label>
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Nearby Charging Stations</h2>
                    <div className="space-y-4">
                      {nearbyStations.map((station, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-500"
                          onClick={() => {
                            setSelectedStation(station);
                            if (station.geometry?.location) {
                              setMapCenter({
                                lat: station.geometry.location.lat(),
                                lng: station.geometry.location.lng()
                              });
                            }
                          }}
                        >
                          <h3 className="font-semibold text-gray-800">{station.name}</h3>
                          <p className="text-sm text-gray-600">{station.formatted_address}</p>
                          {station.rating && (
                            <p className="text-sm text-gray-600 mt-1">Rating: {station.rating} ⭐</p>
                          )}
                          {station.opening_hours?.isOpen && (
                            <p className="text-sm text-green-600 mt-1">Currently Open</p>
                          )}
                          {station.place_id && renderStationDetails(station)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {directionsError && isRoutePlanner && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{directionsError}</p>
                </div>
              )}
              
              <div className="h-[600px] rounded-xl overflow-hidden">
                {loadError ? (
                  <div className="w-full h-full flex items-center justify-center bg-red-50">
                    <div className="text-center">
                      <p className="text-red-600 text-xl">Error loading maps</p>
                      <p className="text-gray-600 mt-2">Please check your API key and try again</p>
                    </div>
                  </div>
                ) : !isLoaded ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
                      <p className="text-gray-600">Loading maps...</p>
                    </div>
                  </div>
                ) : (
                <GoogleMap
                    mapContainerClassName="w-full h-full"
                    center={mapCenter}
                    zoom={!isRoutePlanner ? 12 : 4}
                  >
                    {isRoutePlanner && source && destination && (
                      <DirectionsService
                        options={{
                          destination: destination,
                          origin: source,
                          travelMode: google.maps.TravelMode.DRIVING,
                        }}
                        callback={directionsCallback}
                        key={directionsKey}
                      />
                    )}
                    {isRoutePlanner && directions && <DirectionsRenderer directions={directions} />}
                    {isRoutePlanner ? (
                      routeInfo?.stops.map((stop, index) => (
                        <Marker
                          key={index}
                          position={stop.location}
                          icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                            scaledSize: new google.maps.Size(32, 32)
                          }}
                          onClick={() => setSelectedStation(stop.station || null)}
                        />
                      ))
                    ) : (
                      nearbyStations.map((station, index) => {
                        if (station.geometry?.location) {
                          return (
                            <Marker
                              key={index}
                              position={station.geometry.location}
                              icon={{
                                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                                scaledSize: new google.maps.Size(32, 32)
                              }}
                              onClick={() => setSelectedStation(station)}
                            />
                          );
                        }
                        return null;
                      })
                    )}
                    {selectedStation && selectedStation.geometry?.location && (
                      <InfoWindow
                        position={selectedStation.geometry.location}
                        onCloseClick={() => setSelectedStation(null)}
                      >
                        <div className="p-2">
                          <h3 className="font-semibold">{selectedStation.name}</h3>
                          <p className="text-sm text-gray-600">{selectedStation.formatted_address}</p>
                          {selectedStation.rating && (
                            <p className="text-sm mt-1">Rating: {selectedStation.rating} ⭐</p>
                          )}
                          {selectedStation.opening_hours?.isOpen && (
                            <p className="text-sm text-green-600 mt-1">Currently Open</p>
                          )}
                          {selectedStation.place_id && renderStationDetails(selectedStation)}
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                )}
              </div>
            </div>
          </div>

          {isRoutePlanner && routeInfo && (
            <div className="border-t pt-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Route Summary</h2>
              <div className="bg-blue-50 p-6 rounded-xl mb-6">
                <p className="text-lg text-blue-900">
                  Total Distance: {routeInfo.totalDistance} km {isRoundTrip && '(Round Trip)'}
                </p>
                <p className="text-lg text-blue-900">
                  Total Journey Time: {Math.floor(routeInfo.totalTime / 60)}h {routeInfo.totalTime % 60}m
                </p>
                <p className="text-blue-900">
                  Number of Charging Stops: {routeInfo.stops.length} 
                  {isRoundTrip && ` (${routeInfo.stops.filter(s => s.direction === 'outward').length} outward, ${routeInfo.stops.filter(s => s.direction === 'return').length} return)`}
                </p>
              </div>

              {routeInfo.stops.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Charging Stops</h3>
                  
                  {/* Outward Journey Stops */}
                  {routeInfo.stops.filter(stop => stop.direction === 'outward').length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <ArrowRight className="w-5 h-5 text-green-600" />
                        <h4 className="text-lg font-semibold text-gray-800">Outward Journey</h4>
                      </div>
                      {routeInfo.stops
                        .filter(stop => stop.direction === 'outward')
                        .map((stop, index) => (
                          <div key={`outward-${index}`} className="bg-white border-l-4 border-green-500 border border-gray-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-green-100 p-3 rounded-full">
                                <Zap className="w-6 h-6 text-green-600" />
                              </div>
                              <div className="flex-grow">
                                <p className="font-medium text-gray-800">
                                  {stop.station?.name || `Charging Stop ${index + 1}`}
                                </p>
                                <p className="text-gray-600">{stop.station?.formatted_address || `At ${stop.distance}km`}</p>
                                {stop.originalDistance !== stop.distance && (
                                  <p className="text-amber-600">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    Charging needed at {stop.originalDistance}km, nearest station found at {stop.distance}km
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  {stop.duration} minutes charging required
                                </div>
                                {stop.station?.rating && (
                                  <p className="text-gray-600 mt-1">
                                    Rating: {stop.station.rating} ⭐
                                  </p>
                                )}
                                {stop.station?.opening_hours?.isOpen && (
                                  <p className="text-green-600 mt-1">
                                    Currently Open
                                  </p>
                                )}
                                {stop.station?.place_id && renderStationDetails(stop.station)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Return Journey Stops */}
                  {isRoundTrip && routeInfo.stops.filter(stop => stop.direction === 'return').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <ArrowLeft className="w-5 h-5 text-blue-600" />
                        <h4 className="text-lg font-semibold text-gray-800">Return Journey</h4>
                      </div>
                      {routeInfo.stops
                        .filter(stop => stop.direction === 'return')
                        .map((stop, index) => (
                          <div key={`return-${index}`} className="bg-white border-l-4 border-blue-500 border border-gray-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 p-3 rounded-full">
                                <Zap className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-grow">
                                <p className="font-medium text-gray-800">
                                  {stop.station?.name || `Charging Stop ${index + 1}`}
                                </p>
                                <p className="text-gray-600">{stop.station?.formatted_address || `At ${stop.distance}km`}</p>
                                {stop.originalDistance !== stop.distance && (
                                  <p className="text-amber-600">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    Charging needed at {stop.originalDistance}km, nearest station found at {stop.distance}km
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  {stop.duration} minutes charging required
                                </div>
                                {stop.station?.rating && (
                                  <p className="text-gray-600 mt-1">
                                    Rating: {stop.station.rating} ⭐
                                  </p>
                                )}
                                {stop.station?.opening_hours?.isOpen && (
                                  <p className="text-green-600 mt-1">
                                    Currently Open
                                  </p>
                                )}
                                {stop.station?.place_id && renderStationDetails(stop.station)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoutePlannerApp;