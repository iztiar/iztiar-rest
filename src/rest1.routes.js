/*
 * rest1.routes.js
 *  v1 API
 */
export const rest1 = {

    /**
     * @param {featureProvider} provider
     * @param {fastify} fastify
     * @throw {Error}
     */
    setRoutes: function( provider, fastify ){

        const Msg = provider.api().exports().Msg;
        const utils = provider.api().exports().utils;

        const _rootRoute = function( fast, opts, done ){
            fast.get( '/', ( req, reply ) => {
                const hello = provider.getCapability( 'helloMessage' );
                if( hello ){
                    return hello.then(( res ) => { return res; });
                } else {
                    return {};
                }
            });
            done();
        };

        const _v1Routes = function( fast, opts, done ){
            fast.get( '/nextId/:name', ( req, reply ) => {
                const counters = fast.mongo.db.collection( 'counters' );
                counters.findOne( req.params, ( err, res ) => {
                    if( err ){
                        reply.send({ 'error': err });
                        Msg.error( 'error', res );
                        return;
                    }
                    Msg.debug( 'req.params', req.params );
                    Msg.debug( 'document read from db', res );
                    let nextId = 0;
                    if( !res ){
                        counters.insertOne({ name: req.params.name, lastId: 1 }, ( err, res ) => {
                            if( err ){
                                reply.send({ 'error': err });
                                Msg.error( 'error', res );
                                return;
                            }
                            Msg.debug( 'insertOne', res );
                        });
                        nextId = 1;
                    } else {
                        if( utils.isInt( res.lastId )){
                            nextId = 1+res.lastId;
                        } else {
                            nextId = 1;
                        }
                        counters.updateOne( req.params, { $set: { lastId: nextId }}, ( err, res ) => {
                            if( err ){
                                reply.send({ 'error': err });
                                return;
                            }
                            Msg.debug( 'updateOne', res );
                        });
                    }
                    reply.send({
                        name: req.params.name,
                        nextId: nextId
                    });
                });
            });
            done();
        };

        fastify.register( _rootRoute );
        fastify.register( _v1Routes, { prefix: '/v1' });
    }
};
