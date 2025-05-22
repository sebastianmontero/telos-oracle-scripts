const { RNGRequestListener}  = require('./src/listeners');
const ConfigLoader = require('./src/ConfigLoader');
const Eos = require('@smontero/eosjs');
const JsonRpc = Eos.JsonRpc;
const fetch = require('node-fetch');

// Read config
const configLoader = new ConfigLoader();
const config = configLoader.getConfig();

console.log('Configuration:')
console.log(JSON.stringify(config, null, 4))

// Instantiate services & variables
const rpc = new JsonRpc(config.antelope.rpc, { fetch });

const listeners = config.scripts.listeners;


// // Delphi Bridge Listener
// if(listeners.delphi.bridge.active){
//     const delphiBridgeListener = new DelphiBridgeListener(listeners.delphi.account, rpc, evm_provider, evm_api, config.scripts.listeners, config.antelope.hyperion)
//     delphiBridgeListener.start();
// }
// // Delphi Updater
// if(updaters.delphi.active){
//     const delphiOracleUpdater = new DelphiOracleUpdater(updaters.delphi.account, updaters, rpc)
//     const callbacks = new DelphiOracleCallbacks();
//     delphiOracleUpdater.start(callbacks.onRequestSuccess, callbacks.onRequestFailure);
// }
// // RNG Bridge Listener
// if(listeners.rng.bridge.active){
//     const rngBridgeListener = new RNGBridgeListener(listeners.rng.account, rpc, evm_provider, evm_api, config.scripts.listeners, config.antelope.hyperion)
//     rngBridgeListener.start();
// }
// RNG Requests Listener
if(listeners.rng.request.active){
    const rngRequestListener = new RNGRequestListener(listeners.rng.account, rpc, config.scripts.listeners, config.antelope.hyperion[0])
    rngRequestListener.start();
}
// // Gas Bridge Listener
// if(listeners.gas.bridge.active){
//     const gasBridgeListener = new GasBridgeListener(listeners.gas.account, rpc, evm_provider, evm_api, config.scripts.listeners, config.antelope.hyperion)
//     gasBridgeListener.start();
// }
