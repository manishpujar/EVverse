import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, StandaloneSearchBox } from '@react-google-maps/api';
import { ChargingStation } from '../types';
import { Search } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

interface MapProps {
  onStationSelect: (station: ChargingStation) => void;
}

export default function Map({ onStationSelect }: MapProps) {
  const [center, setCenter] = useState(defaultCenter);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const searchNearbyStations = useCallback((location: google.maps.LatLng) => {
    if (!map) return;

    const service = new google.maps.places.PlacesService(map);
    const request = {
      location,
      radius: 5000, // 5km radius
      keyword: 'ev charging station',
      type: 'point_of_interest'
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const newStations: ChargingStation[] = results.map(place => {
          const connectorTypes = [];
          const name = place.name?.toLowerCase() || '';
          if (name.includes('tesla')) connectorTypes.push('Tesla');
          if (name.includes('ccs')) connectorTypes.push('CCS');
          if (name.includes('chademo')) connectorTypes.push('CHAdeMO');
          if (connectorTypes.length === 0) connectorTypes.push('Type 2', 'CCS');

          return {
            id: place.place_id!,
            name: place.name!,
            location: {
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng()
            },
            address: place.vicinity!,
            connectorTypes,
            available: place.business_status === 'OPERATIONAL',
            price: '$0.35-0.45/kWh'
          };
        });
        setStations(newStations);
      }
    });
  }, [map]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenter(userLocation);
          if (map) {
            const location = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            searchNearbyStations(location);
          }
        },
        () => {
          if (map) {
            const location = new google.maps.LatLng(defaultCenter.lat, defaultCenter.lng);
            searchNearbyStations(location);
          }
        }
      );
    }
  }, [map, searchNearbyStations]);

  const handleSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const handlePlacesChanged = useCallback(() => {
    if (!searchBox || !map) return;

    const places = searchBox.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    // Update map center and search for stations
    const newCenter = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    
    setCenter(newCenter);
    map.setCenter(newCenter);
    searchNearbyStations(place.geometry.location);
  }, [searchBox, map, searchNearbyStations]);

  const handleMarkerClick = useCallback((station: ChargingStation) => {
    setSelectedStation(station);
    onStationSelect(station);
  }, [onStationSelect]);

  const getMarkerIcon = (station: ChargingStation) => {
    const color = station.available ? '#10B981' : '#EF4444';
    const networkIcon = station.connectorTypes.includes('Tesla') 
      ? `<path d="M12 2L4 12h4v8l8-10h-4V2z"/>`
      : `<path d="M13 2H11V13H13V2z"/>
         <path d="M5 13H3V17H5V13z"/>
         <path d="M21 13H19V17H21V13z"/>
         <path d="M19 11H17V13H19V11z"/>
         <path d="M7 11H5V13H7V11z"/>
         <path d="M16 2C16 1.4 15.6 1 15 1H9C8.4 1 8 1.4 8 2V13H16V2z"/>`;

    return {
      url: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
          ${networkIcon}
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32)
    };
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  return (
    <div className="relative h-full">
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <StandaloneSearchBox
              onLoad={handleSearchBoxLoad}
              onPlacesChanged={handlePlacesChanged}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </StandaloneSearchBox>
          </div>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.location}
            onClick={() => handleMarkerClick(station)}
            icon={getMarkerIcon(station)}
          />
        ))}

        {selectedStation && (
          <InfoWindow
            position={selectedStation.location}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div className="p-2">
              <h3 className="font-semibold">{selectedStation.name}</h3>
              <p className="text-sm text-gray-600">{selectedStation.address}</p>
              <p className="text-sm mt-1">
                <span className={`font-medium ${selectedStation.available ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedStation.available ? 'Available' : 'In Use'}
                </span>
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}