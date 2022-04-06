/*
 * mongo.js
 */
import fs from 'fs';
import path from 'path';
import fastifyPlugin from 'fastify-plugin';
import fastifyMongo from 'fastify-mongodb';

export const mongo = {
    /**
     * @param {featureProvider} provider
     * @param {fastify} fastify
     * @throw {Error}
     */
    setConnect: function( provider, fastify ){
        /*
        const api = provider.api();
        const exports = api.exports();
        const _config = api.config().core();
        exports.Msg.debug( 'mongo.connect() database configuration', _config.database );
        if( !_config.database ){
            throw new Error( 'mongo.connect() expects a database configuration group, not found' );
        }
        if( !_config.database.uri ){
            throw new Error( 'mongo.connect() expects a database.uri configuration, not found' );
        }
        let _uri = _config.database.uri;
        if( _config.database.passwdFile ){
            const _passwd = fs.readFileSync( path.join( api.storageDir(), _config.database.passwdFile )).toString().replace( /[\r\n]/g, '' );
            _uri = _uri.replace( '<passwd>', _passwd );
        }
        exports.Msg.debug( 'mongo.connect() uri='+_uri );
        mongoose.connect( _uri, {
            ssl: true,
            sslCA: path.join( api.storageDir(), _config.rootCA )
        }). then(( res ) => {
            exports.Msg.debug( 'mongo.connect() OK mongoose instance is', res );
        }, ( rej ) => {
            exports.Msg.error( 'mongo.connect() NOT OK', rej );
        });
        */

        const _dbConnector = function( fast, opts, done ){
            const api = provider.api();
            const Msg = api.exports().Msg;
            const _config = api.config().core();
            Msg.debug( 'mongo.setConnect() database configuration', _config.database );
            if( !_config.database ){
                throw new Error( 'mongo.setConnect() expects a database configuration group, not found' );
            }
            if( !_config.database.uri ){
                throw new Error( 'mongo.setConnect() expects a database.uri configuration, not found' );
            }
            let _uri = _config.database.uri;
            if( _config.database.passwdFile ){
                const _passwd = fs.readFileSync( path.join( api.storageDir(), _config.database.passwdFile )).toString().replace( /[\r\n]/g, '' );
                _uri = _uri.replace( '<passwd>', _passwd );
            }
            Msg.debug( 'mongo.setConnect() uri='+_uri );
            fast.register( fastifyMongo, {
                url: _uri,
                forceClose: true
            });
            done();
        };

        fastify.register( fastifyPlugin( _dbConnector ));
    }
};
