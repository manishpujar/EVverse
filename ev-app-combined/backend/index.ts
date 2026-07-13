/**
 * Main entry point for the EV Smart Route Planner backend
 */

import express from 'express';
import cors from 'cors';
import { routeRoutes } from './routes/routeRoutes';
import { stationRoutes } from './routes/stationRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/routes', routeRoutes);
app.use('/stations', stationRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 