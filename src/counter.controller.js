/*
 * counters.controller.js
 */
import { counterModel, adm } from './imports.js';

export const counterController = {

    /*
     * @param {Fastify} fastify
     * @param {Object} query the query that has read the doc
     * @param {Object|null} doc the found document, may be null
     * @returns {Promise} which resolves to the same document, or an empty one
     */
    fill: function( fastify, query, doc ){
        return new Promise(( resolve, reject ) => {
            if( doc ){
                return resolve( doc );
            }
            return resolve({
                name: query.name,
                createdAt: Date.now(),
                lastId: 0
            });
        });
    },

    /*
     * @param {Fastify} fastify
     * @param {String} name the named counter
     * @returns {Promise} which resolve with the updated document
     */
    nextId: function( fastify, name ){
        const Msg = fastify.featureProvider.api().exports().Msg;
        const query = { name: name };
        return counterModel.read( fastify, query )
            .then(( res ) => { return counterController.fill( fastify, query, res ); })
            .then(( res ) => {
                res.lastId += 1;
                return counterModel.write( fastify, res );
            });
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of at-the-moment-used counters (which may be empty)
     */
    rtList: function( req, reply ){
        counterModel.list( this )
            .then(( res ) => {
                const Msg = this.featureProvider.api().exports().Msg;
                // projection doesn't seem to work here, so have to filter ourselves
                Msg.debug( 'counterController.rtList()', res );
                reply.send( adm.filter( res, [ 'name', 'lastId' ]));
            });
    },

    /*
     * Reply with the last-used named counter
     */
    rtLastId: function( req, reply ){
        const query = { name: req.params.name };
        counterModel.read( this, query )
            .then(( res ) => { return counterController.fill( this, query, res ); })
            .then(( res ) => {
                reply.send( o );
            });
    },

    /*
     * Reply with the next to-be-used named counter
     */
    rtNextId: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        counterController.nextId( this, req.params.name )
            .then(( res ) => {
                reply.send( adm.filter( res, [ 'name', 'lastId' ]));
            });
    },

    /*
     * Set the lastId to the given value IF AND ONLY IF this given value is greater than the existing lastId
     * Expects body-data: {id:<id>}
     * Reply with the new lastId value
     */
    rtSetId: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const query = { name: req.params.name };
        counterModel.read( this, query )
            .then(( res ) => { return counterController.fill( this, query, res ); })
            .then(( res ) => {
                const newId = Math.floor( req.body.id );
                Msg.debug( 'counterController.setId() lastId='+res.lastId, 'newId='+newId );
                if( res.lastId > 0 && res.lastId < newId ){
                    Msg.debug( 'counterController.setId() setting lastId to newId' );
                    res.lastId = newId;
                    return counterModel.write( this, res );
                } else {
                    return Promise.resolve( res );
                }
            })
            .then(( res ) => {
                reply.send( adm.filter( res, [ 'name', 'lastId' ]));
            });
    }
};
