/*
 * equipments.routes.js
 */
import { equipments } from './imports.js';

export const equipmentRoutes = [
    { method:'GET', url:'/equipments', handler:equipments.list },
];
