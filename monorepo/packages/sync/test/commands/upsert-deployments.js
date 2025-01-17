const run = require('../_run');
const command = require('../../commands/upsert-deployments');

run(command, { trackIds: ['IMCD210602002', 'IMCD210526002', 'IMCD210529003', 'IMCD210529004', 'IMCD210529005'] })
  .catch((e) => setImmediate(() => { throw e; }));
