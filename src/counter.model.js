/*
 * counters.model.js
 *  Handle database model
 */
export const counterModel = {

    COLLECTION: 'counters',

    /**
     * @param {Fastify} fastify
     * @returns {Promise} which resolves to the array of 'counters' population, or []
     */
    list: function( fastify ){
        return new Promise(( resolve, reject ) => {
            fastify.mongo.db.collection( counterModel.COLLECTION ).find().toArray(( err, res ) => {
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
     * @param {String} name the counter to get next
     * @returns {Promise} which resolves to the next identifier
     */
    next: function( fastify, name ){
        return new Promise(( resolve, reject ) => {
            const query = { name:name };
            counterModel.read( fastify, query )
                .then(( res ) => {
                    let o = { ...res };
                    if( !res ){
                        o = {
                            name: name,
                            lastId: 0,
                            createdAt: Date.now()
                        };
                    }
                })
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
            fastify.mongo.db.collection( counterModel.COLLECTION ).findOne( query, ( err, res ) => {
                if( err ){
                    Msg.error( 'counterModel.read() query=', query, 'error=', err );
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
            fastify.mongo.db.collection( counterModel.COLLECTION ).updateOne( query, update, { upsert: true }, ( err, res ) => {
                if( err ){
                    Msg.error( 'counterModel.write() query=', query, 'update=', update, 'error=', err );
                }
                return resolve( doc );
            });
        });
    }
};
