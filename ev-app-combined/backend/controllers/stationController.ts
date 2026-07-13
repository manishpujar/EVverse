import { Request, Response } from 'express';
import * as stationService from '../stationService';
import { StationSearchRequest } from '../types';

export const searchNearbyStations = async (req: Request, res: Response) => {
  try {
    const searchRequest: StationSearchRequest = req.body;
    const stations = await stationService.findNearbyStations(searchRequest.location, searchRequest.radius);
    res.json(stations);
  } catch (error) {
    console.error('Error searching nearby stations:', error);
    res.status(500).json({ error: 'Failed to find nearby stations' });
  }
};

export const findNearestStation = async (req: Request, res: Response) => {
  try {
    const { location, range } = req.body;
    const station = await stationService.findNearestStation(location, range);
    res.json(station);
  } catch (error) {
    console.error('Error finding nearest station:', error);
    res.status(500).json({ error: 'Failed to find nearest station' });
  }
};

export const getStationDetails = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const details = await stationService.getStationDetails(placeId);
    res.json(details);
  } catch (error) {
    console.error('Error getting station details:', error);
    res.status(500).json({ error: 'Failed to get station details' });
  }
}; 