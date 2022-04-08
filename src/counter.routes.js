/*
 * counters.routes.js
 */
import { counterController } from './imports.js';

export const counterRoutes = [
    { method:'GET', url:'/counters',           handler:counterController.rtList },
    { method:'GET', url:'/counter/:name',      handler:counterController.rtLastId },
    { method:'GET', url:'/counter/:name/next', handler:counterController.rtNextId },
    { method:'PUT', url:'/counter/:name/set',  handler:counterController.rtSetId }
];
