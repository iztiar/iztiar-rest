/*
 * commands.controller.js
 */
import { counterController, commandModel, zoneModel, adm, mqtt } from './imports.js';

export const commandController = {

    COLUMNS: [ 'name', 'cmdId', 'equipName', 'equipId', 'className', 'classId', 'readable', 'writable', 'historized', 'createdAt', 'updatedAt' ],
    PUBS: [ 'name', 'cmdId', 'equipId', 'className', 'classId', 'readable', 'writable', 'historized', 'createdAt', 'updatedAt' ],

    /*
     * Retrieves either an existing document, or a new one
     * @returns {Promise} which resolves with an object { isNew, doc }
     */
    _getDocument: function( fastify, query ){
        const Msg = fastify.featureProvider.api().exports().Msg;
        let answer = {
            doc: null,
            isNew: false
        };
        // does the command already exist ?
        return commandModel.readOne( fastify, query )
            // if the command doesn't exist yet, then get the next id
            .then(( res ) => {
                Msg.debug( 'commandController._getDocument() readOne=', res );
                if( res ){
                    answer.doc = { ...res };
                    return Promise.resolve( null );
                } else {
                    return counterController.nextId( fastify, 'command' );
                }
            })
            // initialize a new document
            .then(( res ) => {
                Msg.debug( 'commandController._getDocument() res=', res );
                if( res ){
                    answer.doc = {
                        name: '',
                        cmdId: res.lastId,
                        classId: 0,
                        equipId: 0,
                        readable: false,
                        writable: false,
                        historized: false,
                        createdAt: Date.now()
                    };
                    answer.isNew = true;
                }
                return Promise.resolve( answer );
            });
    },

    // list known instances
    publishAll( fastify ){
        commandModel.list( fastify )
            .then(( res ) => {
                adm.filter( res, commandController.PUBS ).every(( doc ) => {
                    commandController.publishDoc( fastify, doc );
                    return true;
                })
            });
    },

    // publish the current document
    publishDoc: function( fastify, doc ){
        let id = doc.cmdId;
        Object.keys( doc ).every(( k ) => {
            if( k !== 'cmdId' ){
                const topic = 'command/'+id+'/'+k;
                mqtt.publish( fastify.featureProvider, topic, doc[k] );
            }
            return true;
        })
    },

    /*
     * check the requested updates
     *  entering with work = {
     *      doc: current or new document
     *      set: update to later send to mongo.update()
     *      isNew: true|false
     *      add: true|false
     *      upsertQuery
     *  }
     * @returns {Promise} which resolves with an object work = {
     *      doc:
     *      set:
     *      isNew:
     *      ERR: reason
     *  }
     * Can be set/updated: name, classId, readable, writable, historized
     * May have sub-documents
     */
    _setUpdate: function( fastify, work, update ){
        const Msg = fastify.featureProvider.api().exports().Msg;
        // fields that we want check before update
        let checked = [];
        return Promise.resolve( true )
            // if a name update is requested, check that the new name doesn't already exist
            //  unchanged name is just ignored
            //  changing the name of a new doc is wrong
            .then(() => {
                if( Object.keys( update ).includes( 'name' )){
                    checked.push( 'name' );
                    const _newName = update.name;
                    if( !_newName || !_newName.length ){
                        work.ERR = 'Refusing to update to an empty command name';
                        return Promise.resolve( work );
                    }
                    if( _newName !== work.doc.name ){
                        if( work.doc.name && work.doc.name.length && work.isNew ){
                            work.ERR = 'Refusing to update the name of a just creating document';
                            return Promise.resolve( work );
                        }
                        return commandModel.readOne( this, { name: _newName })
                            .then(( res ) => {
                                if( res ){
                                    work.ERR = 'Refusing to update to an already existing name: '+update.name;
                                    return Promise.resolve( work );
                                } else {
                                    work.set.name = _newName;
                                    work.doc.name = _newName;
                                }
                            });
                    }
                }
            })
            // if a classId is specified, must be an integer
            .then(() => {
                if( !work.ERR ){
                    if( Object.keys( update ).includes( 'classId' )){
                        checked.push( 'classId' );
                        let _value = Math.floor( update.classId );
                        if( work.doc.classId !== _value ){
                            work.doc.classId = _value;
                            work.set.classId = _value;
                        }
                    }
                }
            })
            // does it have other fields or a sub-document ?
            // whe manage two ways of updating a subdocument:
            //  - replacing existing subdoc with the one provided
            //  - adding to existing subdoc the keys provided
            .then(() => {
                if( !work.ERR ){
                    Object.keys( update ).every(( k ) => {
                        if( !checked.includes( k )){
                            Msg.debug( 'commandController._setUpdate() work=', work, 'update=', update, 'k='+k, typeof update[k] );
                            if( typeof update[k] === 'object' ){
                                if( work.add ){
                                    if( !work.doc[k] ){
                                        work.doc[k] = {};
                                    }
                                    Object.keys( update[k] ).every(( subk ) => {
                                        work.doc[k][subk] = update[k][subk];
                                        work.set[k+'.'+subk] = update[k][subk];
                                        return true;
                                    });
                                } else {
                                    work.doc[k] = {
                                        ...update[k]
                                    };
                                    work.set[k] = {
                                        ...update[k]
                                    };
                                }
                            } else if( work.doc[k] !== update[k] ){
                                work.doc[k] = update[k];
                                work.set[k] = update[k];
                            }
                            Msg.debug( 'commandController._setUpdate() new work=', work );
                        }
                        return true;
                    });
                    return Promise.resolve( work );
                }
            })
            // all checks done, upsert the doc
            .then(( res ) => {
                Msg.debug( 'commandController._setUpdate() work=', work );
                if( !work.ERR ){
                    if( work.isNew || Object.keys( work.set ).length > 0 ){
                        return commandModel.write( fastify, work.upsertQuery, work.set );
                    } else {
                        Msg.verbose( 'commandController._setUpdate() ignoring empty update set' );
                    }
                }
            })
            .then(() => {
                return Promise.resolve( work );
            });
    },

    /*
     * @returns {Promise} which resolve to a new unique name
     */
    _uniqueName: function( fastify, name ){
        const Msg = fastify.featureProvider.api().exports().Msg;
        const _fTest = function( test ){
            return new Promise(( resolve, reject ) => {
                Msg.debug( 'commandController.uniqueName() testing '+test );
                return commandModel.readOne( fastify, { name: test })
                    .then(( res ) => {
                        Msg.debug( 'commandController.uniqueName() res=', res );
                        if( res ){
                            return _fTest( test+'1' );
                        }
                        Msg.debug( 'commandController.uniqueName() resolving with '+test );
                        resolve( test );
                    });
            });
        };
        return _fTest( name );
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with OK|ERR
     */
    rtDelete: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const _id = Math.floor( req.params.id || 0 );
        if( !_id ){
            reply.send({ ERR: 'Empty command identifier, ignoring request' });
        } else {
            let query = { cmdId:_id };
            commandModel.delete( this, query )
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: query.cmdId+': deleted command' });
                    } else {
                        reply.send({ ERR: query.cmdId+': command not found' });
                    }
                });
        }
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of class commands
     */
    rtGetByEquipmentId: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const _id = Math.floor( req.params.id || 0 );
        if( !_id ){
            reply.send({ ERR: 'Empty command identifier, ignoring request' });
        } else {
            const query = { cmdId:_id };
            commandModel.readAll( this, query )
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: adm.filter( res, commandController.COLUMNS )});
                    } else {
                        Msg.verbose( 'commandController.rtGetByEquipmentId() sending empty array' );
                        reply.send({ OK: []});
                    }
                });
        }
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of defined commands
     */
    rtList: function( req, reply ){
        commandModel.list( this )
            .then(( res ) => {
                const Msg = this.featureProvider.api().exports().Msg;
                // projection doesn't seem to work here, so have to filter ourselves
                Msg.debug( 'commandController.rtList()', res );
                reply.send( adm.filter( res, commandController.COLUMNS ));
            });
    },

    /**
     * Create/Update an command
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @param {Boolean} add whether subdocuments should be incremented (add=true) or replaced
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     */
    rtSetByEquipmentId: function( req, reply, add=false ){
        const Msg = this.featureProvider.api().exports().Msg;
        Msg.debug( 'commandController.rtSetByClass() req.params=', req.params, 'add='+add );
        const _id = Math.floor( req.params.id || 0 );
        const _subid = Math.floor( req.params.subid || 0 );
        if( !_id ){
            reply.send({ ERR: 'Empty equipment identifier, ignoring request' });
        } else if( !_subid ){
            reply.send({ ERR: 'Empty command identifier, ignoring request' });
        } else {
            let work = {
                add: add,
                upsertQuery: { equipId:_id, classId:_subid }
            };
            commandController._getDocument( this, work.upsertQuery )
                .then(( res ) => {
                    work = {
                        ...work,
                        ...res
                    };
                    if( work.isNew ){
                        work.doc.equipId = _id;
                        work.doc.classId = _subid;
                        work.set = { ...work.doc };
                    } else {
                        work.set = {};
                    }
                    return Promise.resolve( work );
                })
                .then(() => {
                    if( work.isNew && !Object.keys( req.body ).includes( 'name' )){
                        return commandController._uniqueName( this, 'cmd-'+work.doc.equipId+'-'+work.doc.classId )
                            .then(( res ) => {
                                work.doc.name = res;
                                work.set.name = res;
                            });
                    }
                })
                .then(() => {
                    return commandController._setUpdate( this, work, req.body );
                })
                .then(( res ) => {
                    Msg.debug( 'commandController.rtSetByEquipmentId() res=', res );
                    if( res.ERR ){
                        reply.send({ ERR: res.ERR });
                    } else {
                        commandController.publishDoc( this, res.doc );
                        reply.send({ OK: res.doc });
                    }
                });
        }
    },

    /**
     * Create/Update an command
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @param {Boolean} add whether subdocuments should be incremented (add=true) or replaced
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     * The document always exists here
     */
    rtSetById: function( req, reply, add=false ){
        const Msg = this.featureProvider.api().exports().Msg;
        Msg.debug( 'commandController.rtSetByName() req.params=', req.params, 'add='+add );
        const _id = Math.floor( req.params.id || 0 );
        if( !_id ){
            reply.send({ ERR: 'Empty command identifier, ignoring request' });
        } else {
            let work = {
                add: add,
                upsertQuery: { cmdId: _id }
            };
            commandController.readOne( this, work.upsertQuery )
                .then(( res ) => {
                    work.doc = { ...res };
                    work.set = {};
                    return Promise.resolve( work );
                })
                .then(() => {
                    return commandController._setUpdate( this, work, req.body );
                })
                .then(( res ) => {
                    Msg.debug( 'commandController.rtSetById() res=', res );
                    if( res.ERR ){
                        reply.send({ ERR: res.ERR });
                    } else {
                        commandController.publishDoc( this, res.doc );
                        reply.send({ OK: res.doc });
                    }
                });
        }
    }
};
