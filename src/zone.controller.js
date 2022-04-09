/*
 * counters.controller.js
 */
import { counterController } from './counter.controller.js';
import { counterModel } from './counter.model.js';
import { zoneModel, adm } from './imports.js';

export const zoneController = {

    /**
     * @param {Fastify} fastify
     * @param {} query the query that has read the doc
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
                lastId: 0
            });
        });
    },

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
                reply.send( adm.filter( res, [ 'name', 'zoneId', 'parentName' ]));
            });
    },

    /*
     * Reply with the last-used named counter
     */
    rtbyName: function( req, reply ){
        const query = { name: req.params.name };
        zoneModel.read( this, query )
            .then(( res ) => { return zoneController.fill( this, query, res ); })
            .then(( res ) => {
                reply.send( o );
            });
    },

    /*
     * Reply with the next to-be-used named counter
     */
    rtbyParent: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const query = { name: req.params.name };
        zoneModel.read( this, query )
            .then(( res ) => { return zoneController.fill( this, query, res ); })
            .then(( res ) => {
                res.lastId += 1;
                return zoneModel.write( this, res );
            })
            .then(( res ) => {
                reply.send( adm.filter( res, [ 'name', 'lastId' ]));
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
