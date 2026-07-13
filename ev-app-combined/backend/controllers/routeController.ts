import { Request, Response } from 'express';
import * as routeService from '../routeService';

export const planRoute = async (req: Request, res: Response) => {
  try {
    const { source, destination, selectedEV, currentCharge, isRoundTrip, routeData } = req.body;
    
    const routeInfo = await routeService.planRoute(
      source,
      destination,
      selectedEV,
      currentCharge,
      isRoundTrip,
      routeData
    );
    
    res.json(routeInfo);
  } catch (error) {
    console.error('Error planning route:', error);
    res.status(500).json({ error: 'Failed to plan route' });
  }
}; 