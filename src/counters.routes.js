/*
 * counters.routes.js
 */
import { counters } from './imports.js';

export const counterRoutes = [
    { method:'GET', url:'/counters',           handler:counters.list },
    { method:'GET', url:'/counter/:name',      handler:counters.lastId },
    { method:'GET', url:'/counter/:name/next', handler:counters.nextId }
];
