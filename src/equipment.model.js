/*
 * equipments.model.js
 */
export const equipmentModel = {

    /**
     * @param {Fastify} fastify
     * @returns {Promise} which resolves to the array of 'equipments' population, or []
     */
    list: function( fastify ){
        return new Promise(( resolve, reject ) => {
            fastify.mongo.db.collection( 'equipments' ).find().toArray(( err, res ) => {
                if( err ){
                    fastify.featureProvider.api().exports().Msg.error( 'equipmentModel.list() error=', err );
                    return resolve( [] );
                }
                return resolve( res );
            });
        });
    },
};
