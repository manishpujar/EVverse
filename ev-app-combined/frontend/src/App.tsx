import { useState } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Zap, MapPin, Route } from 'lucide-react';
import ChargerLocatorApp from './charger-locator/ChargerLocatorApp';
import RoutePlannerApp from './route-planner/RoutePlannerApp';

// The Google Maps script must only be loaded ONCE per page. Both modules
// need it (with the union of libraries each one uses), so it's loaded here
// at the top level and passed down — neither module loads it itself.
const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

type Tab = 'route-planner' | 'charger-locator';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('route-planner');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Zap className="w-7 h-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EV Companion</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('route-planner')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  activeTab === 'route-planner'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Route className="w-5 h-5" />
                Route Planner
              </button>
              <button
                onClick={() => setActiveTab('charger-locator')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  activeTab === 'charger-locator'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MapPin className="w-5 h-5" />
                Charger Locator
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Both modules stay mounted once loaded, just hidden, so switching tabs
          doesn't lose in-progress state (a planned route, a selected station). */}
      <div style={{ display: activeTab === 'route-planner' ? 'block' : 'none' }}>
        <RoutePlannerApp isLoaded={isLoaded} loadError={loadError} />
      </div>
      <div style={{ display: activeTab === 'charger-locator' ? 'block' : 'none' }}>
        <ChargerLocatorApp isLoaded={isLoaded} loadError={loadError} />
      </div>
    </div>
  );
}

export default App;
