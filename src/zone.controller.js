/*
 * counters.controller.js
 */
import { counterController } from './counter.controller.js';
import { counterModel } from './counter.model.js';
import { zoneModel, adm } from './imports.js';

export const zoneController = {

    COLUMNS: [ 'name', 'zoneId', 'parentId', 'parentName', 'createdAt', 'updatedAt' ],

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of at-the-moment-used counters (which may be empty)
     */
    rtList: function( req, reply ){
        zoneModel.list( this )
            .then(( res ) => {
                const Msg = this.featureProvider.api().exports().Msg;
                // projection doesn't seem to work here, so have to filter ourselves
                Msg.debug( 'zoneController.rtList()', res );
                reply.send( adm.filter( res, zoneController.COLUMNS ));
            });
    },

    /*
     * Reply with the found zone
     */
    rtbyName: function( req, reply ){
        const query = { name: req.params.name };
        zoneModel.readOne( this, query )
            .then(( res ) => {
                if( res ){
                    reply.send({ OK: adm.filter( res, zoneController.COLUMNS )});
                } else {
                    reply.send({ ERR: query.name+': zone not found' });
                }
            });
    },

    /*
     * Reply with the list of zones which have this named parent, may be empty
     *  name may be empty: returns zones which do not have a parent
     */
    rtbyParent: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        let query = { name: req.params.name };
        let replySent = false;
        let _promise = Promise.resolve( true );
        if( query.name.length ){
            _promise = _promise
                .then(( res ) => {
                    return zoneModel.readOne( this, query );
                })
                .then(( res ) => {
                    if( res ){
                        query = { parentId: res.zoneId };
                        return Promise.resolve( true );
                    } else {
                        reply.send({ ERR: query.name+': zone not found' });
                        replySent = true;
                        return Promise.resolve( null );
                    }
                });
        } else {
            query = { parentId: 0 };
        }
        if( !replySent ){
            _promise = _promise
                .then(( res ) => {
                    return zoneModel.readAll( this, query );
                })
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: adm.filter( res, zoneController.COLUMNS )});
                    } else if( !replySent ){
                        Msg.verbose( 'zoneController.rtbyParent() sending empty array' );
                        reply.send({ OK: []});
                    }
                });
        }
    },

    /*
     * Reply with OK
     */
    rtDelete: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        let query = { name: req.params.name };
        zoneModel.delete( this, query )
            .then(( res ) => {
                if( res ){
                    reply.send({ OK: query.name+': deleted zone' });
                } else {
                    reply.send({ ERR: query.name+': zone not found' });
                }
            });
    },

    /*
     * Create/Update a zone
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     * 
     * Have     --header: 'content-type: application/json'
     * Provide  --body-data '{"parent":"toto"}'
     * 
     * Can be updated: the name, the parent
     */
    rtSet: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const query = { name: req.params.name };
        let doc = null;
        let set = {};
        let isNew = false;
        let replySent = false;
        // does the zone already exist ?
        zoneModel.read( this, query )
            // if the zone doesn't exist yet, then get the next id
            .then(( res ) => {
                Msg.debug( 'zoneController.rtSet() read=', res, 'body-data=', req.body );
                if( res ){
                    doc = { ...res };
                    return Promise.resolve( null );
                } else {
                    isNew = true;
                    return counterController.nextId( this, 'zone' );
                }
            })
            // initialize a new document
            .then(( res ) => {
                Msg.debug( 'zoneController.rtSet() res2=', res );
                if( res ){
                    doc = {
                        name: query.name,
                        zoneId: res.lastId,
                        parentId: 0,
                        createdAt: Date.now()
                    };
                    set = { ...doc };
                }
                return Promise.resolve( doc );
            })
            // if a name update is requested, check that the new name doesn't already exist
            //  empty or unchanged name is just ignored
            //  changing the name of a new doc is wrong
            .then(() => {
                if( Object.keys( req.body ).includes( 'name' )){
                    const _newName = req.body.name;
                    if( _newName.length > 0 && _newName != query.name ){
                        if( isNew ){
                            reply.send({ ERR: 'Incompatible names between request and sent data' });
                            replySent = true;
                            return Promise.resolve( null );
                        }
                        set.name = _newName;
                        doc.name = _newName;
                        const _q = { name: _newName }
                        return zoneModel.read( this, _q );
                    }
                }
                return Promise.resolve( null );
            })
            // send error message if name already exists
            // if a parent update is requested, check that the parent exists (or zero to clear the parent)
            .then(( res ) => {
                if( !replySent ){
                    if( res ){
                        reply.send({ ERR: 'Name already exists: '+req.body.name, result:res });
                        replySent = true;
                        return Promise.resolve( null );
    
                    } else if( Object.keys( req.body ).includes( 'parentId' )){
                        const _newParent = req.body.parentId;
                        if( _newParent != doc.parentId ){
                            set.parentId = _newParent;      // may be zero to clear the parent
                            doc.parentId = _newParent;
                            if( _newParent > 0 ){           // if not zero, must exists
                                const _q = { zoneId: _newParent }
                                return zoneModel.read( this, _q );
                            }
                        }
                    }
                }
            })
            // send error message if parent doesn't exist
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( set ).includes( 'parentId' ) && set.parentId > 0 && !res ){
                        reply.send({ ERR: 'Parent doesn\'t exist: '+req.body.parentId, result:res });
                        replySent = true;
                    }
                }
                return Promise.resolve( null );
            })
            // all checks done, upsert the doc
            .then(( res ) => {
                Msg.debug( 'zoneController.rtSet() doc=', doc, 'set=', set, 'isNew='+isNew, 'replySent='+replySent );
                if( !replySent ){
                    Msg.debug( 'zoneController.rtSet() set=', set, 'isNew='+isNew );
                    if( isNew || Object.keys( set ).length > 0 ){
                        return zoneModel.write( this, query, set );
                    } else {
                        Msg.verbose( 'zoneController.rtSet() ignoring empty update set' );
                    }
                }
            })
            .then(( res ) => {
                if( !replySent ){
                    reply.send({ OK: doc });
                }
            });
    }
};
