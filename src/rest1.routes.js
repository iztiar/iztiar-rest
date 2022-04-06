/*
 * rest1.routes.js
 *  v1 API
 */
import { adm, counterRoutes, equipmentRoutes } from './imports.js';

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
            adm.installRoutes( provider, fast, counterRoutes );
            adm.installRoutes( provider, fast, equipmentRoutes );
            done();
        };

        fastify.register( _rootRoute );
        fastify.register( _v1Routes, { prefix: '/v1' });
    }
};
