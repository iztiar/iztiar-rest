/*
 * rest1.routes.js
 *  v1 API
 */
import { adm, counters } from './imports.js';

export const rest1 = {

    /**
     * @param {featureProvider} provider
     * @param {fastify} fastify
     */
    setRoutes: function( provider, fastify ){

        const _rootRoute = function( fast, opts, done ){
            fast.get( '/', ( req, reply ) => {
                const hello = provider.getCapability( 'helloMessage' );
                if( hello ){
                    return hello.then(( res ) => { return res; });
                } else {
                    return {};
                }
            });
            done();
        };

        const _v1Routes = function( fast, opts, done ){
            fast.get( '/adm', ( req, reply ) => { adm.list( provider, fast, req, reply ); });
            fast.get( '/counters', ( req, reply ) => { counters.list( provider, fast, req, reply ); });
            fast.get( '/counter/:name', ( req, reply ) => { counters.lastId( provider, fast, req, reply ); });
            fast.get( '/counter/:name/next', ( req, reply ) => { counters.nextId( provider, fast, req, reply ); });
            done();
        };

        fastify.register( _rootRoute );
        fastify.register( _v1Routes, { prefix: '/v1' });
    }
};
