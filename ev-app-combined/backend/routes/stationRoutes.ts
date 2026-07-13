import express from 'express';
import { searchNearbyStations, findNearestStation, getStationDetails } from '../controllers/stationController';

const router = express.Router();

router.post('/nearby', searchNearbyStations);
router.post('/nearest', findNearestStation);
router.get('/details/:placeId', getStationDetails);

export { router as stationRoutes }; 