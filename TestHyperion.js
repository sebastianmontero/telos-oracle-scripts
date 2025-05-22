const { HyperionStreamClient, StreamClientEvents } = require("@smontero/hyperion-stream-client");


async function run() {
  const client = new HyperionStreamClient({
    endpoints: 'https://eos.hyperion.eosrio.io',
    debug: true,
    libStream: false,
    tryForever: true,
    libActivityTimeoutMs: 4000
  });
  client.on(StreamClientEvents.LIBUPDATE, (data) => {
    // What is that ??
    console.log(data);
  });
  client.once('connect', () => {
    console.log('####Connected to Hyperion Stream ...####');
    client.streamDeltas({
      code: 'rng.beny',
      table: 'rngrequests',
      scope: 'rng.beny',
      payer: '',
      start_from: 432313000,
      read_until: 0
    });
    client.on(StreamClientEvents.LIBACTIVITY_TIMEOUT, () => {
      console.log('####Lib Activity Timeout from Hyperion Stream ...####');
    });
    client.on(StreamClientEvents.DISCONNECT, () => {
      console.log('####Disconnected from Hyperion Stream ...####');
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


