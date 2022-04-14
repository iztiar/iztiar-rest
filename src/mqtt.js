/*
 * mqtt.js
 */

export const mqtt = {

    subscribedTopic: 'iztiar/#',
    publishTopic: 'iztiar',

    // the MqttConnect client connection to iztiar message bus
    connection: null,

    /**
     * @param {Rest} Instance
     * @param {String} topic
     * @param {String} payload
     * @param {Object} options
     */
    publish( instance, topic, payload, options ){
        const Msg = instance.api().exports().Msg;
        if( mqtt.connection ){
            let _topic = mqtt.publishTopic;
            if( topic.charAt(0) !== '/' ){
                _topic += '/';
            }
            _topic += topic;
            const _options = {
                ...options
            }
            mqtt.connection.publish( _topic, payload, _options );
        } else {
            Msg.warn( 'mqtt.publish() no client connection' );
        }
    },

    /**
     * @param {String} topic
     * @param {String} payload
     * Inside of this IMqttClient callback, 'this' is the mySensors instance
     */
    receive( topic, payload ){
        const Msg = this.api().exports().Msg;
        Msg.debug( 'mqtt.receive() topic='+topic, 'payload='+payload );
    },

    /**
     * @param {Rest} instance
     */
    start( instance ){
        const Msg = instance.api().exports().Msg;
        Msg.debug( 'mqtt.start()' );
        const _clients = instance.IMqttClient.getConnections();
        Object.keys( _clients ).every(( key ) => {
            const _connect = _clients[key];
            const _conf = _connect.config();
            if( _conf.publications.documents ){
                Msg.verbose( 'mqtt.start() identifying \''+key+'\' connection' );
                mqtt.connection = _connect;
                mqtt.connection.subscribe( mqtt.subscribedTopic, instance, mqtt.receive );
                return false;
            }
            return true;
        });
    }
};
