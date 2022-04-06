/*
 * counters.controller.js
 */
export const counters = {

    /**
     * @param {featureProvider} provider 
     * @param {fastify} fastify
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @throws {Error}
     * 
     * Reply with the list of at-the-moment-used counters
     */
    list: function( provider, fastify, req, reply ){
        const Msg = provider.api().exports().Msg;
        const utils = provider.api().exports().utils;
        const counters = fastify.mongo.db.collection( 'counters' );

        counters.find().toArray(( err, res ) => {
            if( err ){
                reply.send({ 'error': err });
                Msg.error( 'counters.list().find', err );
                return;
            }
            Msg.debug( 'counters.list().find', res );
            reply.send( res );
        });
    },

    /*
     * Reply with the next to-be-used named counter
     */
    nextId: function( provider, fastify, req, reply ){
        const Msg = provider.api().exports().Msg;
        const utils = provider.api().exports().utils;
        const counters = fastify.mongo.db.collection( 'counters' );

        counters.findOne( req.params, ( err, res ) => {
            if( err ){
                reply.send({ 'error': err });
                Msg.error( 'counters.nextId().findOne', err );
                return;
            }
            let nextId = 0;
            if( !res ){
                counters.insertOne({
                    name: req.params.name,
                    lastId: 1,
                    updatedAt: Date.now()
                }, ( err, res ) => {
                    if( err ){
                        reply.send({ 'error': err });
                        Msg.error( 'counters.nextId().insertOne', err );
                        return;
                    }
                    Msg.debug( 'counters.nextId().insertOne', res );
                });
                nextId = 1;
            } else {
                if( utils.isInt( res.lastId )){
                    nextId = 1+res.lastId;
                } else {
                    nextId = 1;
                }
                counters.updateOne( req.params, { $set: { lastId: nextId, updatedAt: Date.now() }}, ( err, res ) => {
                    if( err ){
                        reply.send({ 'error': err });
                        Msg.error( 'counters.nextId().updateOne', err );
                        return;
                    }
                    Msg.debug( 'counters.nextId().updateOne', res );
                });
            }
            reply.send({
                name: req.params.name,
                nextId: nextId
            });
        });
    }
};
