/*
 * counters.routes.js
 */
import { zoneController } from './imports.js';

export const zoneRoutes = [
    { method:'GET',    url:'/zones',             handler:zoneController.rtList },
    { method:'GET',    url:'/zone/name/:name',   handler:zoneController.rtGetByName },
    { method:'GET',    url:'/zone/parent/:name', handler:zoneController.rtGetByParent },
    { method:'PUT',    url:'/zone/:name',        handler:zoneController.rtSet },
    { method:'DELETE', url:'/zone/:name',        handler:zoneController.rtDelete },
];
