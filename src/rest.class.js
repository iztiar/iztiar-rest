/*
 * Rest class
 */

export class Rest {

    /**
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card a description of this feature
     * @returns {Promise} which resolves to a pidUsagePlug instance
     */
    constructor( api, card ){
        const exports = api.exports();
        const Interface = exports.Interface;
        const Msg = exports.Msg;

        //Interface.extends( this, exports.baseService, api, card );
        Msg.debug( 'pidUsagePlug instanciation' );

        // first interface to be added, so that other interfaces may take advantage of that
        Interface.add( this, exports.ICapability );

        this.ICapability.add(
            'pidUsage', ( o ) => { return o._pidUsage(); }
        );

        // this is mandatory
        Interface.add( this, exports.IServiceable, {
            class: this._class,
            config: this.iserviceableConfig
        });

        return Promise.resolve( true )
            .then(() => { return this._filledConfig(); })
            .then(( o ) => { return this.config( o ); })
            .then(() => { return Promise.resolve( this ); });
    }

    _class(){
        return this.constructor.name;
    }

    /*
     * @returns {Object} the filled configuration for the service
     */
    _filledConfig(){
        const exports = this.api().exports();
        exports.Msg.debug( 'pidUsagePlug.filledConfig()' );
        let _config = this.feature().config();
        let _filled = { ..._config };
        return _filled;
    }

    /*
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     */
    _pidUsage(){
        const exports = this.api().exports();
        return pidUsage( process.pid )
        .then(( res ) => {
            const o = {
                cpu: res.cpu,
                memory: res.memory,
                ctime: res.ctime,
                elapsed: res.elapsed
            };
            exports.Msg.debug( 'pidUsagePlug._pidUsage()', o );
            return Promise.resolve( o );
        });
    }

    /*
     * @returns {Object} the filled configuration for the feature
     * [-implementation Api-]
     */
    iserviceableConfig(){
        const c = this.config();
        this.api().exports().Msg.debug( 'pidUsagePlug.iserviceableConfig()', c );
        return c;
    }
}
