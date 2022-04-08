/*
 * counters.routes.js
 */
import { counter } from './imports.js';

export const counterRoutes = [
    { method:'GET', url:'/counters',           handler:counter.list },
    { method:'GET', url:'/counter/:name',      handler:counter.lastId },
    { method:'GET', url:'/counter/:name/next', handler:counter.nextId }
];
