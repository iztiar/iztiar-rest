/*
 * counters.model.js
 *  Handle database model
 */
export const zoneModel = {

    COLLECTION: 'zones',

    // returns a '$lookup' aggregate object array which adds the 'parentName' to the output documents set
    _lookup: function( query ){
        if( !query ){
            query = {};
        }
        return [{
            $match: {
                ...query
            },
        },{
            $lookup: {
                from: zoneModel.COLLECTION,
                localField: 'parentId',
                foreignField: 'zoneId',
                as: '_pa'
            }
        },{
            $set: {
                _pb: { $first: "$_pa" }
            }
        }, {
            $set: {
                //parentName: { $ifNull: [ "$_pb.name", "<unset>" ]}
                parentName: { $ifNull: [ "$_pb.name", "" ]}
            }
        },{
            $unset: [ "_pa", "_pb" ]
        }]
    },

    /*
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to the array of requested documents, or null
     */
    _read: function( fastify, query ){
        return new Promise(( resolve, reject ) => {
            const Msg = fastify.featureProvider.api().exports().Msg;
            fastify.mongo.db.collection( zoneModel.COLLECTION ).aggregate( zoneModel._lookup( query )).toArray(( err, res ) => {
                if( err ){
                    Msg.debug( 'zoneModel.read() query=', query, 'err=', err );
                    return resolve( null );
                }
                if( res ){
                    Msg.debug( 'zoneModel.read() query=', query, 'found', res );
                    return resolve( res );
                }
                Msg.debug( 'zoneModel.read() query=', query, 'not found' );
                return resolve( null );
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to true|false
     */
    delete: function( fastify, query ){
        return new Promise(( resolve, reject ) => {
            const Msg = fastify.featureProvider.api().exports().Msg;
            fastify.mongo.db.collection( zoneModel.COLLECTION ).deleteOne( query, ( err, res ) => {
                if( err ){
                    Msg.debug( 'zoneModel.delete() query=', query, 'err=', err );
                    return resolve( false );
                }
                if( res ){
                    Msg.debug( 'zoneModel.delete() query=', query, 'found', res );
                    return resolve( res.deletedCount );
                }
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @returns {Promise} which resolves to the array of 'zones' population, or []
     * Mongosh tested expression
     * db.zones.aggregate([{$lookup:{from:'zones',localField:'parentId',foreignField:'zoneId',as:'pName'}},{$set:{ parentName:'<empty>', ppName:{ $first:"$pName"}}},{$set:{ parentName:{$ifNull:["$ppName.name","<unset>"]}}},{$unset:["pName","ppName"]}])
     */
    list: function( fastify ){
        return new Promise(( resolve, reject ) => {
            fastify.mongo.db.collection( zoneModel.COLLECTION ).aggregate( zoneModel._lookup()).toArray(( err, res ) => {
                if( err ){
                    fastify.featureProvider.api().exports().Msg.error( 'zoneModel.list() error=', err );
                    return resolve( [] );
                }
                return resolve( res );
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to the requested collection of documents, or null
     */
    readAll: function( fastify, query ){
        return zoneModel._read( fastify, query )
            .then(( res ) => {
                return Promise.resolve( res );
            });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to the requested document, or null
     */
    readOne: function( fastify, query ){
        return zoneModel._read( fastify, query )
            .then(( res ) => {
                return Promise.resolve( res ? res[0] : null );
            });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @param {Object} update the fields to be set
     * @returns {Promise} which resolves to the written document
     */
    write: function( fastify, query, update ){
        return new Promise(( resolve, reject ) => {
            const Msg = fastify.featureProvider.api().exports().Msg;
            update.updatedAt = Date.now();
            fastify.mongo.db.collection( zoneModel.COLLECTION ).updateOne( query, { $set: update }, { upsert: true }, ( err, res ) => {
                if( err ){
                    Msg.error( 'zoneModel.write().updateOne() query=', query, 'update=', update, 'error=', err );
                    return resolve( null );
                }
                Msg.debug( 'zoneModel.write().updateOne() query=', query, 'update=', update, 'res=', res );
                return resolve( update );
            });
        });
    }
};
