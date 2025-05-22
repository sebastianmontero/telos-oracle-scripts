const { HyperionStreamClient, StreamClientEvents } = require("@smontero/hyperion-stream-client");


async function run() {
  const client = new HyperionStreamClient({
    endpoints: 'https://eos.hyperion.eosrio.io',
    debug: true,
    libStream: false
  });
  client.on(StreamClientEvents.LIBUPDATE, (data) => {
    // What is that ??
    console.log(data);
  });
  client.on('connect', () => {
    console.log('Connected to Hyperion Stream ...');
    client.streamDeltas({
      code: 'rng.beny',
      table: 'rngrequests',
      scope: 'rng.beny',
      payer: '',
      start_from: 432313000,
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


