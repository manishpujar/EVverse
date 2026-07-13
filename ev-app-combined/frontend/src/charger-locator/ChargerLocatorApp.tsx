import { useState } from 'react';
import { ChargingStation } from './types';
import Map from './components/Map';
import StationDetails from './components/StationDetails';
import { Zap } from 'lucide-react';

interface ChargerLocatorAppProps {
  isLoaded: boolean;
  loadError?: Error;
}

function ChargerLocatorApp({ isLoaded, loadError }: ChargerLocatorAppProps) {
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-600 text-xl">Error loading maps</p>
          <p className="text-gray-600 mt-2">Please check your API key and try again</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Zap className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Zap className="w-8 h-8 text-blue-500" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">EV Charging Locator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
            <div className="lg:col-span-2 h-full">
              <Map onStationSelect={setSelectedStation} />
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-gray-200">
              <StationDetails station={selectedStation} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChargerLocatorApp;