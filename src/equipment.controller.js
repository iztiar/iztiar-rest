/*
 * equipments.controller.js
 */
import { counterController, equipmentModel, zoneModel, adm } from './imports.js';

export const equipmentController = {

    COLUMNS: [ 'name', 'equipId', 'className', 'classId', 'zoneId', 'zoneName', 'powerSource', 'powerType', 'createdAt', 'updatedAt' ],
    powerSources: [ 'sector', 'battery' ],

    /*
     * Reply with OK
     */
    rtDelete: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        let query = { name: req.params.name };
        equipmentModel.delete( this, query )
            .then(( res ) => {
                if( res ){
                    reply.send({ OK: query.name+': deleted equipment' });
                } else {
                    reply.send({ ERR: query.name+': equipment not found' });
                }
            });
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
     * Expects "body=JSON data"
     * Reply with the OK: created/updated doc or ERR: reason
     * Can be updated: name, zone, class name and id, power source and type
     */
    rtSet: function( req, reply ){
        const Msg = this.featureProvider.api().exports().Msg;
        const query = { name: req.params.name };
        let doc = null;
        let set = {};
        let isNew = false;
        let replySent = false;
        // does the equipment already exist ?
        equipmentModel.readOne( this, query )
            // if the equipment doesn't exist yet, then get the next id
            .then(( res ) => {
                Msg.debug( 'equipmentController.rtSet() readOne=', res, 'body-data=', req.body );
                if( res ){
                    doc = { ...res };
                    return Promise.resolve( null );
                } else {
                    isNew = true;
                    return counterController.nextId( this, 'equipment' );
                }
            })
            // initialize a new document
            .then(( res ) => {
                Msg.debug( 'equipmentController.rtSetByName() res2=', res );
                if( res ){
                    doc = {
                        name: query.name,
                        equipId: res.lastId,
                        className: '',
                        classId: 0,
                        zoneId: 0,
                        powerSource: '',
                        powerType: '',
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
                        return equipmentModel.readOne( this, _q );
                    }
                }
                return Promise.resolve( null );
            })
            // send error message if new name already exists
            .then(( res ) => {
                if( !replySent ){
                    if( res ){
                        reply.send({ ERR: 'Name already exists: '+req.body.name });
                        replySent = true;
                        return Promise.resolve( null );
                    }
                }
            })
            // if a zone update is requested, check that it exists (or zero to clear)
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( req.body ).includes( 'zoneId' )){
                        const _newZone = req.body.zoneId;
                        if( _newZone != doc.zoneId ){
                            set.zoneId = _newZone;          // may be zero to clear the zone
                            doc.zoneId = _newZone;
                            if( _newZone > 0 ){             // if not zero, must exists
                                const _q = { zoneId: _newZone }
                                return zoneModel.readOne( this, _q );
                            }
                        }
                    }
                }
            })
            // send error message if new zone doesn't exist
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( set ).includes( 'zoneId' )){
                        if( req.body.zoneId > 0 ){
                            if( res ){
                                doc.zoneName = res.name;
                            } else {
                                reply.send({ ERR: 'Zone doesn\'t exist: '+req.body.zoneId });
                                replySent = true;
                            }
                        } else {
                            doc.zoneName = '';
                        }
                    }
                }
            })
            // if a power source update is requested, check that it belongs to the defined enum
            //  note that changing from battery to sector doesn't clear the powerType in the database
            //  in case of a goback on this update, we will find again the previous (expected correct) powerType value
            .then(( res ) => {
                if( !replySent ){
                    Msg.debug( 'equipmentController.set() req.body.keys=', Object.keys( req.body ));
                    if( Object.keys( req.body ).includes( 'powerSource' )){
                        let _source = req.body.powerSource;
                        if( !equipmentController.powerSources.includes( _source )){
                            reply.send({ ERR: 'Unmanaged power source: '+_source });
                            replySent = true;
                        } else {
                            doc.powerSource = _source;
                            set.powerSource = _source;
                        }
                    }
                }
            })
            // if a power type update is requested, take it as is
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( req.body ).includes( 'powerType' )){
                        set.powerType = req.body.powerType;
                        doc.powerType = req.body.powerType;
                    }
                }
            })
            // if a class name is set, take it as is
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( req.body ).includes( 'className' ) && doc.className !== req.body.className ){
                        set.className = req.body.className;
                        doc.className = req.body.className;
                    }
                }
            })
            // if a class id is set, take it as is
            .then(( res ) => {
                if( !replySent ){
                    if( Object.keys( req.body ).includes( 'classId' ) && doc.classId !== req.body.classId ){
                        set.classId = req.body.classId;
                        doc.classId = req.body.classId;
                    }
                }
            })
            // all checks done, upsert the doc
            .then(( res ) => {
                Msg.debug( 'equipmentController.rtSet() doc=', doc, 'set=', set, 'isNew='+isNew, 'replySent='+replySent );
                if( !replySent ){
                    if( isNew || Object.keys( set ).length > 0 ){
                        return equipmentModel.write( this, query, set );
                    } else {
                        Msg.verbose( 'equipmentController.rtSet() ignoring empty update set' );
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
