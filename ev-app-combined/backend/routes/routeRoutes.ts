import express from 'express';
import { RouteInfo, RouteRequest } from '../types';

const router = express.Router();

// Route handler for planning routes
router.post('/plan', async (req, res) => {
  try {
    const routeRequest: RouteRequest = req.body;
    
    // Import the route service instead of controller
    const { planRoute } = await import('../routeService');
    
    const routeInfo = await planRoute(
      routeRequest.source,
      routeRequest.destination,
      routeRequest.selectedEV,
      routeRequest.currentCharge,
      routeRequest.isRoundTrip,
      routeRequest.routeData
    );
    
    res.json(routeInfo);
  } catch (error) {
    console.error('Error planning route:', error);
    res.status(500).json({ error: 'Failed to plan route' });
  }
});

export { router as routeRoutes }; 