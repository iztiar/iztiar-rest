/*
 * adm.js
 */
export const adm = {

    /**
     * @param {featureProvider} provider 
     * @param {fastify} fastify
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @throws {Error}
     */
    list: function( provider, fastify, req, reply ){
        reply.send([
            '/v1/counters',
            '/v1/counter/:name',
            '/v1/counter/:name/next'
        ]);
    }
};
