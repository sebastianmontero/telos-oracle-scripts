const { HyperionStreamClient, StreamClientEvents } = require("@eosrio/hyperion-stream-client");


async function run() {
  const client = new HyperionStreamClient({
    endpoint: 'https://jungle.eosusa.io',
    debug: true,
    libStream: false
  });
  client.on(StreamClientEvents.LIBUPDATE, (data) => {
    // What is that ??
    console.log(data);
  });
  client.on('connect', () => {
    console.log('Connected to Hyperion Stream ...');
    // client.streamDeltas({
    //   code: 'bennyrngorac',
    //   table: 'rngrequests',
    //   scope: 'bennyrngorac',
    //   payer: '',
    //   start_from: -1,
    //   read_until: 0
    // });
  });
  client.setAsyncDataHandler(async (data) => {
    console.log(data);
  });
  await client.connect();
}

(async () => {
  await run()
})()


