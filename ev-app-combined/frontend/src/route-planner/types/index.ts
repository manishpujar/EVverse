export interface EVSpecification {
  batteryCapacity: number;
  efficiency: number;
  chargingRate: number;
  minChargeLevel: number;
  range: number;
  connectorTypes: string[];
}

// Map of EV models to their specifications
export const GLOBAL_EVS: Record<string, EVSpecification> = {
  'Tesla Model 3 Long Range': {
    batteryCapacity: 82,
    efficiency: 0.142,
    chargingRate: 250,
    minChargeLevel: 10,
    range: 576,
    connectorTypes: ['Tesla', 'CCS']
  },
  'Hyundai IONIQ 5': {
    batteryCapacity: 77.4,
    efficiency: 0.171,
    chargingRate: 220,
    minChargeLevel: 10,
    range: 507,
    connectorTypes: ['Type 2', 'CCS']
  },
  'Volkswagen ID.4': {
    batteryCapacity: 77,
    efficiency: 0.168,
    chargingRate: 135,
    minChargeLevel: 10,
    range: 516,
    connectorTypes: ['Type 2', 'CCS']
  },
  'Ford Mustang Mach-E': {
    batteryCapacity: 88,
    efficiency: 0.172,
    chargingRate: 150,
    minChargeLevel: 10,
    range: 490,
    connectorTypes: ['Type 2', 'CCS']
  },
  'Kia EV6': {
    batteryCapacity: 77.4,
    efficiency: 0.171,
    chargingRate: 240,
    minChargeLevel: 10,
    range: 528,
    connectorTypes: ['Type 2', 'CCS']
  },
  'BMW i4': {
    batteryCapacity: 83.9,
    efficiency: 0.165,
    chargingRate: 200,
    minChargeLevel: 10,
    range: 521,
    connectorTypes: ['Type 2', 'CCS']
  },
  'Tata Nexon EV Max': {
    batteryCapacity: 40.5,
    efficiency: 0.145,
    chargingRate: 50,
    minChargeLevel: 10,
    range: 437,
    connectorTypes: ['Type 2', 'CCS']
  },
  'MG ZS EV': {
    batteryCapacity: 50.3,
    efficiency: 0.173,
    chargingRate: 76,
    minChargeLevel: 10,
    range: 461,
    connectorTypes: ['Type 2', 'CCS']
  }
};

export interface RouteInfo {
  totalDistance: number;
  totalTime: number;
  stops: ChargingStop[];
}

export interface ChargingStop {
  location: {
    lat: number;
    lng: number;
  };
  duration: number;
  chargeAmount?: number;
  distance: number;
  station?: google.maps.places.PlaceResult;
  direction: 'outward' | 'return';
  originalDistance: number;
}

export interface ChargingStationDetails {
  types: string[];
  connectors: string[];
  power: string;
}

export interface RouteRequest {
  source: string;
  destination: string;
  selectedEV: string;
  currentCharge: number;
  isRoundTrip: boolean;
}

export interface StationSearchRequest {
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
}