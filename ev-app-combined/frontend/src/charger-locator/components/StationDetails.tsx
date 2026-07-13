import { ChargingStation } from '../types';
import { Plug, MapPin, Battery, DollarSign } from 'lucide-react';

interface StationDetailsProps {
  station: ChargingStation | null;
}

export default function StationDetails({ station }: StationDetailsProps) {
  if (!station) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a charging station to view details
      </div>
    );
  }

  const getNetworkName = (connectorTypes: string[]) => {
    if (connectorTypes.includes('Tesla')) return 'Tesla Supercharger Network';
    if (connectorTypes.includes('CCS') && connectorTypes.includes('CHAdeMO')) return 'Universal Fast Charging';
    return 'Standard EV Network';
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{station.name}</h2>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-600 mt-1" />
          <p className="text-gray-700">{station.address}</p>
        </div>

        <div className="flex items-center gap-3">
          <Battery className="w-5 h-5 text-gray-600" />
          <div>
            <p className={`font-medium ${station.available ? 'text-green-600' : 'text-red-600'}`}>
              {station.available ? 'Available' : 'Currently in use'}
            </p>
            <p className="text-sm text-gray-600">{getNetworkName(station.connectorTypes)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-gray-600" />
          <p className="text-gray-700">{station.price}</p>
        </div>

        <div className="flex items-start gap-3">
          <Plug className="w-5 h-5 text-gray-600 mt-1" />
          <div>
            <p className="font-medium mb-2">Connector Types:</p>
            <div className="flex flex-wrap gap-2">
              {station.connectorTypes.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}