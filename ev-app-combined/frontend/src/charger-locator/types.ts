export interface ChargingStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  connectorTypes: string[];
  available: boolean;
  price: string;
}