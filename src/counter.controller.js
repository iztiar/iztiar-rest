/*
 * counters.controller.js
 */
import { adm } from './imports.js';

export const counter = {

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @throws {Error}
     * 
     * Reply with the list of at-the-moment-used counters
     */
    list: function( req, reply ){
        const provider = this.featureProvider;
        const Msg = provider.api().exports().Msg;
        const counters = this.mongo.db.collection( 'counters' );
        // projection doesn't seem to work here, so have to filter ourselves
        counters.find().toArray(( err, res ) => {
            if( err ){
                reply.send({ 'error': err });
                Msg.error( 'counters.list().find', err );
                return;
            }
            Msg.debug( 'counters.list().find', res );
            reply.send( adm.filter( res, [ 'name', 'lastId' ]));
        });
    },

    /*
     * Reply with the last-used named counter
     */
    lastId: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const counters = this.mongo.db.collection( 'counters' );
        counters.findOne( req.params, ( err, res ) => {
            if( err ){
                reply.send({ 'error': err });
                Msg.error( 'counters.lastId().findOne', err );
                return;
            }
            let o = {
                name: req.params.name,
                lastId: 0
            };
            if( !res ){
                o.lastId = 'never allocated';
            } else {
                o.lastId = res.lastId;
            }
            reply.send( o );
        });
    },

    /*
     * Reply with the next to-be-used named counter
     */
    nextId: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const utils = this.featureProvider.api().exports().utils;
        const counters = this.mongo.db.collection( 'counters' );
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
