const { HyperionStreamClient, StreamClientEvents } = require("@smontero/hyperion-stream-client");


async function run() {
  const client = new HyperionStreamClient({
    endpoints: ['https://jungle.eosusa.io'],
    // endpoint: 'https://eos.hyperion.eosrio.io',
    // endpoint: 'https://telos.caleos.io',
    debug: true,
    libStream: false,
    tryForever: true,
    libActivityTimeoutMs: 10000
  });
  client.on(StreamClientEvents.LIBUPDATE, (data) => {
    // What is that ??
    console.log(data);
  });
  client.once('connect', () => {
    console.log('##Connected to Hyperion Stream ...##');
    // client.streamDeltas({
    //   code: 'bennyrngorac',
    //   table: 'rngrequests',
    //   scope: 'bennyrngorac',
    //   payer: '',
    //   start_from: -1,
    //   read_until: 0
    // });

    client.streamDeltas({
      code: 'rng.beny',
      table: 'rngrequests',
      scope: 'rng.beny',
      payer: '',
      // start_from: 432313038,
      start_from: -1,
      read_until: 0
    });
  });
  client.setAsyncDataHandler(async (data) => {
    console.log(data);
  });
  await client.connect();
}

(async () => {
  await run()
})()


