/*
 * commands.routes.js
 */
import { commandController } from './imports.js';

export const commandRoutes = [
    { method:'GET',    url:'/commands',                     handler:commandController.rtList },
    { method:'GET',    url:'/commands/equipment/:id',       handler:commandController.rtGetByEquipmentId },
    { method:'PUT',    url:'/command/:id',                  handler:commandController.rtSetById },
    { method:'PUT',    url:'/command/equipment/:id/:subid', handler:commandController.rtSetByEquipmentId },
    { method:'DELETE', url:'/command/:id',                  handler:commandController.rtDelete },
];
