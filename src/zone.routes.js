/*
 * counters.routes.js
 */
import { zoneController } from './imports.js';

export const zoneRoutes = [
    { method:'GET', url:'/zones',             handler:zoneController.rtList },
    { method:'GET', url:'/zone/name/:name',   handler:zoneController.rtbyName },
    { method:'GET', url:'/zone/parent/:name', handler:zoneController.rtbyParent },
    { method:'PUT', url:'/zone/:name/set',    handler:zoneController.rtSet }
];
