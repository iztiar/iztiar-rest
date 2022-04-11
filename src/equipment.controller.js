/*
 * equipments.controller.js
 */
import { counterController, equipmentModel, zoneModel, adm } from './imports.js';

export const equipmentController = {

    COLUMNS: [ 'name', 'equipId', 'className', 'classId', 'zoneId', 'zoneName', 'powerSource', 'powerType', 'createdAt', 'updatedAt' ],
    powerSources: [ 'sector', 'battery' ],

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
        // does the equipment already exist ?
        return equipmentModel.readOne( fastify, query )
            // if the equipment doesn't exist yet, then get the next id
            .then(( res ) => {
                Msg.debug( 'equipmentController._getDocument() readOne=', res );
                if( res ){
                    answer.doc = { ...res };
                    return Promise.resolve( null );
                } else {
                    return counterController.nextId( fastify, 'equipment' );
                }
            })
            // initialize a new document
            .then(( res ) => {
                Msg.debug( 'equipmentController._getDocument() res=', res );
                if( res ){
                    answer.doc = {
                        name: '',
                        equipId: res.lastId,
                        className: '',
                        classId: 0,
                        zoneId: 0,
                        powerSource: '',
                        powerType: '',
                        createdAt: Date.now()
                    };
                    answer.isNew = true;
                }
                return Promise.resolve( answer );
            });
    },

    /*
     * check the requested updates
     *  entering with work = {
     *      doc: current or new document
     *      set: update to later send to mongo.update()
     *      isNew: true|false
     *      add: true|false
     *  }
     * @returns {Promise} which resolves with an object work = {
     *      doc:
     *      set:
     *      isNew:
     *      ERR: reason
     *  }
     * Can be updated: name, zone, class name and id, power source and type
     * May have a sub-document with the className as key
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
                        work.ERR = 'Refusing to update to an empty equipment name';
                        return Promise.resolve( work );
                    }
                    if( _newName !== work.doc.name ){
                        if( work.doc.name && work.doc.name.length && work.isNew ){
                            work.ERR = 'Refusing to update the name of a just creating document';
                            return Promise.resolve( work );
                        }
                        return equipmentModel.readOne( this, { name: _newName })
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
            // if a zone update is requested, check that it exists (or zero to clear)
            .then(() => {
                if( !work.ERR ){
                    if( Object.keys( update ).includes( 'zoneId' )){
                        checked.push( 'zoneId' );
                        const _newZone = update.zoneId;
                        if( _newZone != work.doc.zoneId ){
                            // clearing the zone
                            if( !_newZone ){
                                work.set.zoneId = 0;
                                work.doc.zoneId = 0;
                                work.doc.zoneName = '';
                            } else {
                                return zoneModel.readOne( this, { zoneId: _newZone })
                                    .then(( res ) => {
                                        if( res ){
                                            work.set.zoneId = _newZone;
                                            work.doc.zoneId = _newZone;
                                            work.doc.zoneName = res.name;
                                        } else {
                                            work.ERR = 'New zone \''+_newZone+'\'doesn\'t exist, update refused';
                                            return Promise.resolve( work );
                                        }
                                    });
                            }
                        }
                    }
                }
            })
            // if a power source update is requested, check that it belongs to the defined enum
            //  note that changing from battery to sector doesn't clear the powerType in the database
            //  in case of a goback on this update, we will find again the previous (expected correct) powerType value
            .then(() => {
                if( !work.ERR ){
                    if( Object.keys( update ).includes( 'powerSource' )){
                        checked.push( 'powerSource' );
                        let _value = update.powerSource;
                        if( !equipmentController.powerSources.includes( _value )){
                            work.ERR = 'Unmanaged power source \''+_value+'\', update refused';
                            return Promise.resolve( work );
                        } else if( work.doc.powerSource !== _value ){
                            work.doc.powerSource = _value;
                            work.set.powerSource = _value;
                        }
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
                            Msg.debug( 'equipmentController._setUpdate() work=', work, 'update=', update, 'k='+k, typeof update[k] );
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
                            Msg.debug( 'equipmentController._setUpdate() new work=', work );
                        }
                        return true;
                    });
                    return Promise.resolve( work );
                }
            })
            // all checks done, upsert the doc
            .then(( res ) => {
                Msg.debug( 'equipmentController._setUpdate() work=', work );
                if( !work.ERR ){
                    if( work.isNew || Object.keys( work.set ).length > 0 ){
                        return equipmentModel.write( fastify, { name: work.doc.name }, work.set );
                    } else {
                        Msg.verbose( 'equipmentController._setUpdate() ignoring empty update set' );
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
                Msg.debug( 'equipmentController.uniqueName() testing '+test );
                equipmentModel.readOne( fastify, { name: test })
                    .then(( res ) => {
                        Msg.debug( 'equipmentController.uniqueName() res=', res );
                        if( res ){
                            return _fTest( test+'1' );
                        }
                        Msg.debug( 'equipmentController.uniqueName() resolving with '+test );
                        resolve( test );
                    });
            });
        };
        return _fTest( name );
    },

    /**
     * Create/Update an equipment
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     */
    rtAddByClass: function( req, reply ){
        equipmentController.rtSetByClass.apply( this, [ req, reply, true ]);
    },

    /**
     * Create/Update an equipment
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     * Can be updated: name, zone, class name and id, power source and type
     * May have a sub-document with the className as key
     */
    rtAddByName: function( req, reply ){
        equipmentController.rtSetByName.apply( this, [ req, reply, true ]);
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with OK|ERR
     */
    rtDelete: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        if( !req.params.name || !req.params.name.length ){
            reply.send({ ERR: 'Empty equipment name, ignoring request' });
        } else {
            let query = { name: req.params.name };
            equipmentModel.delete( this, query )
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: query.name+': deleted equipment' });
                    } else {
                        reply.send({ ERR: query.name+': equipment not found' });
                    }
                });
        }
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of class equipments
     * name may be empty: returns equipments which do not have a className
     */
    rtGetByClass: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const query = { className: req.params.name };
        equipmentModel.readAll( this, query )
            .then(( res ) => {
                if( res ){
                    reply.send({ OK: adm.filter( res, equipmentController.COLUMNS )});
                } else {
                    Msg.verbose( 'equipmentController.rtGetByClass() sending empty array' );
                    reply.send({ OK: []});
                }
            });
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the named equipment
     */
    rtGetByName: function( req, reply ){
        const query = { name: req.params.name };
        equipmentModel.readOne( this, query )
            .then(( res ) => {
                if( res ){
                    reply.send({ OK: adm.filter( res, equipmentController.COLUMNS )});
                } else {
                    reply.send({ ERR: query.name+': equipment not found' });
                }
            });
    },

    /**
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * Reply with the list of equipments which are in this named zone
     * name may be empty: returns equipments which do not have a zone
     */
    rtGetByZone: function( req, reply ){
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
                        query = { zoneId: res.zoneId };
                        return Promise.resolve( true );
                    } else {
                        reply.send({ ERR: query.name+': zone not found' });
                        replySent = true;
                        return Promise.resolve( null );
                    }
                });
        } else {
            query = { zoneId: 0 };
        }
        if( !replySent ){
            _promise = _promise
                .then(( res ) => {
                    return equipmentModel.readAll( this, query );
                })
                .then(( res ) => {
                    if( res ){
                        reply.send({ OK: adm.filter( res, equipmentController.COLUMNS )});
                    } else if( !replySent ){
                        Msg.verbose( 'equipmentController.rtGetByZone() sending empty array' );
                        reply.send({ OK: []});
                    }
                });
        }
    },

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
                reply.send( adm.filter( res, equipmentController.COLUMNS ));
            });
    },

    /**
     * Create/Update an equipment
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @param {Boolean} add whether subdocuments should be incremented (add=true) or replaced
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     */
    rtSetByClass: function( req, reply, add=false ){
        const Msg = this.featureProvider.api().exports().Msg;
        Msg.debug( 'equipmentController.rtSetByClass() req.params=', req.params, 'add='+add );
        if( !req.params.name || !req.params.name.length ){
            reply.send({ ERR: 'Empty class name, ignoring request' });
            return;
        }
        const utils = this.featureProvider.api().exports().utils;
        if( !req.params.id || !utils.isInt( req.params.id )){
            reply.send({ ERR: 'Empty class id, ignoring request' });
            return;
        }
        let work = { add: add };
        req.params.id = Math.floor( req.params.id );
        equipmentController._getDocument( this, { className: req.params.name, classId: req.params.id })
            .then(( res ) => {
                work = {
                    ...work,
                    ...res
                };
                if( work.isNew ){
                    work.doc.className = req.params.name;
                    work.doc.classId = req.params.id;
                    work.set = { ...work.doc };
                } else {
                    work.set = {};
                }
                return Promise.resolve( work );
            })
            .then(() => {
                if( work.isNew && !Object.keys( req.body ).includes( 'name' )){
                    equipmentController._uniqueName( this, work.doc.className+'-'+work.doc.classId )
                        .then(( res ) => {
                            work.doc.name = res;
                            work.set.name = res;
                        });
                }
            })
            .then(() => {
                return equipmentController._setUpdate( this, work, req.body );
            })
            .then(( res ) => {
                Msg.debug( 'equipmentController.rtSetByClass() res=', res );
                if( res.ERR ){
                    reply.send({ ERR: res.ERR });
                } else {
                    reply.send({ OK: res.doc });
                }
            });
    },

    /**
     * Create/Update an equipment
     * @param {Object} req the request
     * @param {Object} reply the object to reply to
     * @param {Boolean} add whether subdocuments should be incremented (add=true) or replaced
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     * Can be updated: name, zone, class name and id, power source and type
     */
    rtSetByName: function( req, reply, add=false ){
        const Msg = this.featureProvider.api().exports().Msg;
        Msg.debug( 'equipmentController.rtSetByName() req.params=', req.params, 'add='+add );
        if( !req.params.name || !req.params.name.length ){
            reply.send({ ERR: 'Empty equipment name, ignoring request' });
            return;
        }
        let work = { add: add };
        equipmentController._getDocument( this, { name: req.params.name })
            .then(( res ) => {
                work = {
                    ...work,
                    ...res
                };
                if( work.isNew ){
                    work.doc.name = req.params.name;
                    work.set = { ...work.doc };
                } else {
                    work.set = {};
                }
                return Promise.resolve( work );
            })
            .then(() => {
                return equipmentController._setUpdate( this, work, req.body );
            })
            .then(( res ) => {
                Msg.debug( 'equipmentController.rtSetByName() res=', res );
                if( res.ERR ){
                    reply.send({ ERR: res.ERR });
                } else {
                    reply.send({ OK: res.doc });
                }
            });
    }
};
