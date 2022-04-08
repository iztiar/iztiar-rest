/*
 * equipments.routes.js
 */
import { equipmentController } from './imports.js';

export const equipmentRoutes = [
    { method:'GET', url:'/equipments',                  handler:equipmentController.rtList },
    //{ method:'GET', url:'/equipment/name/:name',        handler:equipmentController.rtList },
    //{ method:'GET', url:'/equipment/class/:class',      handler:equipmentController.rtList },
    //{ method:'GET', url:'/equipment/zone/:zone',        handler:equipmentController.rtList },
    //{ method:'PUT', url:'/equipment/class/:class/set',  handler:equipmentController.rtSet },
];
