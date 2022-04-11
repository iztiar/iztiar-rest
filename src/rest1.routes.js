/*
 * rest1.routes.js
 *  v1 API
 */
import { counterRoutes, equipmentRoutes, zoneRoutes, adm } from './imports.js';

export const rest1 = {

    /**
     * @param {featureProvider} provider
     * @param {fastify} fastify
     */
    setRoutes: function( provider, fastify ){

        const _rootRoutes = function( fast, opts, done ){
            fast.get( '/', ( req, reply ) => {
                const hello = provider.getCapability( 'helloMessage' );
                if( hello ){
                    return hello.then(( res ) => { return res; });
                } else {
                    return {};
                }
            });
            fast.get( '/last', ( req, reply ) => { reply.send({ last: provider.feature().config().urlPrefix }); });
            done();
        };

        const v1Prefix = "/v1";

        const _v1Routes = function( fast, opts, done ){
            fast.get( '/adm', ( req, reply ) => { adm.list( provider, fast, req, reply ); });
            adm.installRoutes( provider, fast, v1Prefix, counterRoutes );
            adm.installRoutes( provider, fast, v1Prefix, equipmentRoutes );
            adm.installRoutes( provider, fast, v1Prefix, zoneRoutes );
            done();
        };

        fastify.register( _rootRoutes );
        fastify.register( _v1Routes, { prefix: v1Prefix });
    }
};
