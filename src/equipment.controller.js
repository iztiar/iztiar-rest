/*
 * equipments.controller.js
 */
import { equipmentModel, adm } from './imports.js';

export const equipmentController = {

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of defined equipments
     */
    rtList: function( req, reply ){
        equipmentModel.list( this )
            .then(( res ) => {
                const Msg = this.featureProvider.api().exports().Msg;
                // projection doesn't seem to work here, so have to filter ourselves
                Msg.debug( 'equipmentController.rtList()', res );
                reply.send( adm.filter( res, [ 'name', 'equipId', 'className' ]));
            });
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the created/existing document
     */
    rtSet: function( req, reply ){
        equipmentModel.list( this )
            .then(( res ) => {
                const Msg = this.featureProvider.api().exports().Msg;
                // projection doesn't seem to work here, so have to filter ourselves
                Msg.debug( 'equipmentController.rtList()', res );
                reply.send( adm.filter( res, [ 'name', 'equipId', 'className' ]));
            });
    }
};
