/*
 * equipments.routes.js
 */
import { equipmentController } from './imports.js';

export const equipmentRoutes = [
    { method:'GET',    url:'/equipments',                    handler:equipmentController.rtList },
    { method:'GET',    url:'/equipment/name/:name',          handler:equipmentController.rtGetByName },
    { method:'GET',    url:'/equipment/class/:name',         handler:equipmentController.rtGetByClass },
    { method:'GET',    url:'/equipment/zone/:name',          handler:equipmentController.rtGetByZone },
    { method:'PUT',    url:'/equipment/name/:name/set',      handler:equipmentController.rtSetByName },
    { method:'PUT',    url:'/equipment/name/:name/add',      handler:equipmentController.rtAddByName },
    { method:'PUT',    url:'/equipment/class/:name/:id/set', handler:equipmentController.rtSetByClass },
    { method:'PUT',    url:'/equipment/class/:name/:id/add', handler:equipmentController.rtAddByClass },
    { method:'DELETE', url:'/equipment/:name',               handler:equipmentController.rtDelete },
];
