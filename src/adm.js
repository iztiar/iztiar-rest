/*
 * adm.js
 */
export const adm = {

    definedRoutes: [],

    /**
     * @param {Object[]} input the full result returned from the database
     * @param {String[]} columns the columns we want on output
     * @returns {Object[]} the filtered input
     */
    filter: function( input, columns ){
        let result = [];
        input.every(( i ) => {
            let o = {};
            columns.every(( c ) => {
                o[c] = i[c];
                return true;
            })
            result.push( o );
            return true;
        });
        return result;
    },

    /**
     * @param {featureProvider} provider 
     * @param {fastify} fastify 
     * @param {Object[]} routes
     */
    installRoutes: function( provider, fastify, routes ){
        routes.every(( r ) => {
            fastify.featureProvider = provider;
            fastify.route( r );
            adm.definedRoutes.push({ method:r.method, url:r.url });
            return true;
        });
    },

    /**
     * @param {featureProvider} provider 
     * @param {fastify} fastify
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @throws {Error}
     */
    list: function( provider, fastify, req, reply ){
        reply.send( adm.definedRoutes );
    }
};
