/*
 * equipments.routes.js
 */
import { equipment } from './imports.js';

export const equipmentRoutes = [
    { method:'GET', url:'/equipments', handler:equipment.list },
];
