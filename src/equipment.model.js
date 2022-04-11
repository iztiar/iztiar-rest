/*
 * equipments.model.js
 */
import { zoneModel } from './imports.js';

export const equipmentModel = {

    COLLECTION: 'equipments',

    // returns a '$lookup' aggregate object array which adds the 'zoneName' to the output documents set
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
                localField: 'zoneId',
                foreignField: 'name',
                as: '_pa'
            }
        },{
            $set: {
                _pb: { $first: "$_pa" }
            }
        }, {
            $set: {
                zoneName: { $ifNull: [ "$_pb.name", "" ]}
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
            fastify.mongo.db.collection( equipmentModel.COLLECTION ).aggregate( equipmentModel._lookup( query )).toArray(( err, res ) => {
                if( err ){
                    Msg.debug( 'equipmentModel.read() query=', query, 'err=', err );
                    return resolve( null );
                }
                if( res ){
                    Msg.debug( 'equipmentModel.read() query=', query, 'found', res );
                    return resolve( res );
                }
                Msg.debug( 'equipmentModel.read() query=', query, 'not found' );
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
            fastify.mongo.db.collection( equipmentModel.COLLECTION ).deleteOne( query, ( err, res ) => {
                if( err ){
                    Msg.debug( 'equipmentModel.delete() query=', query, 'err=', err );
                    return resolve( false );
                }
                if( res ){
                    Msg.debug( 'equipmentModel.delete() query=', query, 'found', res );
                    return resolve( res.deletedCount );
                }
            });
        });
    },

    /**
     * @param {Fastify} fastify
     * @returns {Promise} which resolves to the array of 'equipments' population, or []
     */
    list: function( fastify ){
        return new Promise(( resolve, reject ) => {
            fastify.mongo.db.collection( equipmentModel.COLLECTION ).aggregate( zoneModel._lookup()).toArray(( err, res ) => {
                if( err ){
                    fastify.featureProvider.api().exports().Msg.error( 'equipmentModel.list() error=', err );
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
        return equipmentModel._read( fastify, query )
            .then(( res ) => {
                return Promise.resolve( res ? res : [] );
            });
    },

    /**
     * @param {Fastify} fastify
     * @param {Object} query the query
     * @returns {Promise} which resolves to the requested document, or null
     */
    readOne: function( fastify, query ){
        return equipmentModel._read( fastify, query )
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
            fastify.mongo.db.collection( equipmentModel.COLLECTION ).updateOne( query, { $set: update }, { upsert: true }, ( err, res ) => {
                if( err ){
                    Msg.error( 'equipmentModel.write().updateOne() query=', query, 'update=', update, 'error=', err );
                    return resolve( null );
                }
                Msg.debug( 'equipmentModel.write().updateOne() query=', query, 'update=', update, 'res=', res );
                return resolve( update );
            });
        });
    }
};
