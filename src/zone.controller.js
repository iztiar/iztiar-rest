/*
 * counters.controller.js
 */
import { counterController, equipmentModel, zoneModel, adm, mqtt } from './imports.js';

export const zoneController = {

    COLUMNS: [ 'name', 'zoneId', 'parentId', 'parentName', 'createdAt', 'updatedAt' ],
    PUBS: [ 'name', 'zoneId', 'parentId', 'createdAt', 'updatedAt' ],

    /**
     * @returns {Promise} which resolves to true|false
     */
    isDeletableById: function( fastify, id ){
        const Msg = fastify.featureProvider.api().exports().Msg;
        let query = { zoneId: id };
        if( id <= 0 ){
            // invalid id: cannot be deleted
            return Promise.resolve( false );
        }
        return zoneModel.readOne( fastify, query )
            .then(( res ) => {
                if( !res ){
                    // doesn't exist: cannot be deleted
                    return Promise.resolve( false );
                }
            })
            .then(( res ) => {
                if( res ){
                    query = { parentId: id };
                    return zoneModel.readAll( fastify, query );
                }
            })
            .then(( res ) => {
                if( !res.length > 0 ){
                    // at least one child zone: cannot be deleted
                    return Promise.resolve( false );
                }
            })
            .then(( res ) => {
                if( res ){
                    query = { zoneId: id };
                    return equipmentModel.readAll( fastify, query );
                }
            })
            .then(( res ) => {
                if( !res.length > 0 ){
                    // at least one child zone: cannot be deleted
                    return Promise.resolve( false );
                }
            })
            .then(( res ) => {
                return Promise.resolve( res );
            });
    },

    // list known instances
    publishAll( fastify ){
        zoneModel.list( fastify )
            .then(( res ) => {
                adm.filter( res, zoneController.PUBS ).every(( doc ) => {
                    zoneController.publishDoc( fastify, doc );
                    return true;
                })
            });
    },

    // publish the current document
    publishDoc: function( fastify, doc ){
        let id = doc.zoneId;
        Object.keys( doc ).every(( k ) => {
            if( k !== 'zoneId' ){
                const topic = 'zone/'+id+'/'+k;
                mqtt.publish( fastify.featureProvider, topic, doc[k] );
            }
            return true;
        })
    },

    /**
     * Reply with OK
     */
    rtDelete: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        if( !req.params.name.length ){
            reply.send({ ERR: 'Empty zone name, ignoring request' });
        } else {
            let query = { name: req.params.name };
            zoneModel.delete( this, query )
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: query.name+': deleted zone' });
                    } else {
                        reply.send({ ERR: query.name+': zone not found' });
                    }
                });
        }
    },

    /**
     * Reply with the found zone
     */
    rtGetByName: function( req, reply ){
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

    /**
     * Reply with the list of zones which have this named parent, may be empty
     *  name may be empty: returns zones which do not have a parent
     */
    rtGetByParent: function( req, reply ){
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

    /**
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
        zoneModel.readOne( this, query )
            // if the zone doesn't exist yet, then get the next id
            .then(( res ) => {
                Msg.debug( 'zoneController.rtSet() readOne=', res, 'body-data=', req.body );
                if( res ){
                    doc = { ...res };
                    return Promise.resolve( null );
                } else {
                    isNew = true;
                    return counterController.nextId( this, 'zone' );
                }
            })
            // initialize a new document with this new id
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
                        return zoneModel.readOne( this, _q );
                    }
                }
                return Promise.resolve( null );
            })
            // send error message if new name already exists
            .then(( res ) => {
                if( !replySent ){
                    if( res ){
                        reply.send({ ERR: 'Name already exists: '+req.body.name, result:res });
                        replySent = true;
                        return Promise.resolve( null );
                    }
                }
                return Promise.resolve( res );
            })
            // if a parent update is requested, check that the parent exists (or zero to clear the parent)
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( req.body ).includes( 'parentId' )){
                        const _newParent = req.body.parentId;
                        if( _newParent != doc.parentId ){
                            set.parentId = _newParent;      // may be zero to clear the parent
                            doc.parentId = _newParent;
                            if( _newParent > 0 ){           // if not zero, must exists
                                const _q = { zoneId: _newParent }
                                return zoneModel.readOne( this, _q );
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
                    if( isNew || Object.keys( set ).length > 0 ){
                        return zoneModel.write( this, query, set );
                    } else {
                        Msg.verbose( 'zoneController.rtSet() ignoring empty update set' );
                    }
                }
            })
            .then(( res ) => {
                if( !replySent ){
                    zoneController.publishDoc( this, doc );
                    reply.send({ OK: doc });
                }
            });
    }
};
