/*
 * main.js
 *
 *  This is the default export of the module.
 *  This is also the Iztiar initialization entry point as this default export is identified in the 'main' key of package.json
 */
import { Rest } from './imports.js';

/**
 * @param {engineApi} api the engine API as described in engine-api.schema.json
 * @param {featureCard} card a description of this feature
 * @returns {Promise} which must resolves to an IServiceable instance
 */
export default ( api, card ) => {
    return new Rest( api, card ).then(( o ) => { return o.IServiceable; });
}
