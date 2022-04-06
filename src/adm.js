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
            '/v1/adm/counters',
            '/v1/adm/counter/next/:name'
        ]);
    }
};
