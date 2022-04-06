/*
 * equipments.controller.js
 */
import { adm } from './imports.js';

export const equipments = {

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @throws {Error}
     * 
     * Reply with the list of defined equipments
     */
    list: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const equipments = this.mongo.db.collection( 'equipments' );
        // projection doesn't seem to work here, so have to filter ourselves
        equipments.find().toArray(( err, res ) => {
            if( err ){
                reply.send({ 'error': err });
                Msg.error( 'counters.list().find', err );
                return;
            }
            Msg.debug( 'counters.list().find', res );
            reply.send( adm.filter( res, [ 'name', 'equipId', 'className' ]));
        });
    }
};
