const { HyperionStreamClient, StreamClientEvents } = require("@smontero/hyperion-stream-client");
const nameToInt = require('./utils/anteloppeName');
const util = require('util');
const JsSignatureProvider = require('eosjs/dist/eosjs-jssig').JsSignatureProvider;
const Eos = require('eosjs');
const { PromisePool } = require('@supercharge/promise-pool')
const Api = Eos.Api;

class Listener {
    constructor(
        oracle,
        rpc,
        config,
        hyperion,
        caller
    ) {
        this.caller = caller;
        this.oracle = oracle;
        this.check_interval_ms = config.check_interval_ms;
        this.heartbeat_interval_blocks = Number(config.heartbeat_interval_seconds) * 2;
        this.max_block_diff = config.max_block_diff;
        this.hyperion = hyperion;
        this.rpc = rpc;
        this.trx_batch_size = config.trx_batch_size;
        this.console_log = (config.console_log) ? true : false;
        this.counter = 0;
        this.checking_table = false;
        this.next_key = '';
        this.lastReceivedBlock = 0;
        this.lastHeartbeatBlock = 0;
        this.streamClient = new HyperionStreamClient({
            endpoints: hyperion,
            debug: true,
            libStream: false,
            tryForever: true,
            libActivityTimeoutMs: 10000
        });
        const signatureProvider = new JsSignatureProvider([caller.private_key]);
        this.api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new util.TextDecoder(),
            textEncoder: new util.TextEncoder()
        });
        this.abi = false;
    }

    // RPC ANTELOPE TABLE CHECK
    async doTableCheck(name, account, scope, table, reverse, callback) {
        if(this.checking_table) return;
        this.log(`${name}: Doing table check...`);
        this.checking_table = true;
        let count = 0;
        let more = true;
        while(more){
            try {
                const results = await this.rpc.get_table_rows({
                    code: account,
                    scope: scope,
                    table: table,
                    limit: this.trx_batch_size,
                    lower_bound: this.next_key
                });
                this.log(`${name}: Table check has retreived ${results.rows.length} request rows`);
                if(results.rows.length){
                    await PromisePool.for(results.rows).withConcurrency(results.rows.length).process(async data => {
                        await callback(data);
                    })
                }
                this.next_key = results.next_key;
                if (results.more) {
                    more = true;
                } else {
                    more = false;
                }
            } catch (e) {
                more = false;
                this.log(`${name}: Table check failed: ${e}`);
            }
        }
        this.checking_table = false;
        this.log(`${name}: Done doing table check !`);
    }

    // HYPERION STREAM
    async startStream(name, account, table, scope, callback){
        let getInfo = await this.rpc.get_info();
        let headBlock = getInfo.head_block_num;
        this.lastHeartbeatBlock = headBlock;
        this.lastReceivedBlock = headBlock - 1;
        this.log(`${name}: Starting Hyperion Stream ...`);

        this.libUpdateListener = (data) => {
            // What is that ??
            if((data.block_num - this.lastHeartbeatBlock) > this.heartbeat_interval_blocks){
                this.lastHeartbeatBlock = data.block_num;
                console.log(`Listener Heartbeat: ${JSON.stringify(data, null, 2)}`);
            }
            this.lastReceivedBlock = data.block_num;
        };

        this.streamClient.on(StreamClientEvents.LIBUPDATE, this.libUpdateListener);

        this.connectListener = () => {
            this.log(`${name}: Connected to Hyperion Stream ...`);
            this.streamClient.streamDeltas({
                code: account,
                table: table,
                scope: scope,
                payer: "",
                start_from: -1,
                read_until: 0,
            });
        };

        this.streamClient.once(StreamClientEvents.CONNECT, this.connectListener);

        this.streamClient.setAsyncDataHandler(async (data) => {
            this.log(`Data: ${JSON.stringify(data, null, 2)}`);
            if (data.content.present && scope === nameToInt(data.content.scope) || data.content.present && scope === data.content.scope.toString()) {
                this.log(`${name}: Data received from Hyperion Stream...`);
                await callback(data.content.data);
            }
        });

        this.activityInterval = setInterval(async () => {
            this.log(`Interval: ${this.lastReceivedBlock} ${this.streamClient.online}`);
            let getInfo = await this.rpc.get_info();
            if(true ||this.max_block_diff < ( getInfo.head_block_num - this.lastReceivedBlock)){
                this.stopStream();
                await this.startStream(name, account, table, scope, callback);
            }
        }, this.check_interval_ms);

        await this.streamClient.connect();
        console.log(`${name}: Hyperion Stream started !`);

        return;
    }

    async stopStream(){
        clearInterval(this.activityInterval);
        this.streamClient.off(StreamClientEvents.LIBUPDATE, this.libUpdateListener)
        this.streamClient.off(StreamClientEvents.CONNECT, this.connectListener)
        try {
            await this.streamClient.disconnect();
        } catch (error) {
            this.log(`${name}: Failed to disconnect from Hyperion Stream: ${error}`);
        }
    }

    // LOG UTIL
    log(message){
        if(this.console_log) console.log(message);
    }
}

module.exports = Listener;
