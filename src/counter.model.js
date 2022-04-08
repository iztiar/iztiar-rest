/*
 * counters.model.js
 *  Handle database model
 */
export const counterModel = {

    /**
     * @param {Fastify} fastify
     * @returns {Promise} which resolves to the array of 'counters' population, or []
     */
    list: function( fastify ){
        return new Promise(( resolve, reject ) => {
            fastify.mongo.db.collection( 'counters' ).find().toArray(( err, res ) => {
                if( err ){
                    fastify.featureProvider.api().exports().Msg.error( 'counterModel.list() error=', err );
                    return resolve( [] );
                }
                return resolve( res );
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to the requested document, or null
     */
    read: function( fastify, query ){
        return new Promise(( resolve, reject ) => {
            const Msg = fastify.featureProvider.api().exports().Msg;
            fastify.mongo.db.collection( 'counters' ).findOne( query, ( err, res ) => {
                if( err ){
                    Msg.error( 'counterModel.get().findOne() query=', query, 'error=', err );
                    return resolve( null );
                }
                if( !res ){
                    return resolve( null );
                }
                return resolve( res );
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} doc the document to be written
     * @returns {Promise} which resolves to the written document
     */
    write: function( fastify, doc ){
        return new Promise(( resolve, reject ) => {
            const Msg = fastify.featureProvider.api().exports().Msg;
            const query = {
                name: doc.name
            };
            doc.updatedAt = Date.now();
            const update = {
                $set: {
                    lastId: doc.lastId,
                    updatedAt: doc.updatedAt
                }
            };
            fastify.mongo.db.collection( 'counters' ).updateOne( query, update, { upsert: true }, ( err, res ) => {
                if( err ){
                    Msg.error( 'counterModel.write().updateOne() query=', query, 'update=', update, 'error=', err );
                }
                return resolve( doc );
            });
        });
    }
};
