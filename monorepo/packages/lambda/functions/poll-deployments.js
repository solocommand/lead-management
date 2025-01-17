const mongodb = require('@lead-management/mongodb/client');
const loadDB = require('@lead-management/mongodb/load-db');
const loadIds = require('@lead-management/sync/ops/load-deployment-ids-since');
const upsert = require('@lead-management/sync/commands/upsert-deployments');
const dayjs = require('../dayjs');
const { AWS_EXECUTION_ENV } = require('../env');

const { log } = console;

process.on('unhandledRejection', (e) => { throw e; });

exports.handler = async (event, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;
  const db = await loadDB();

  // get the last omeda deployment saved in the db
  const lastDeployment = await db.collection('omeda-email-deployments').findOne({
    'omeda.Status': { $in: ['Sent', 'Sending'] },
    'omeda.SentDate': { $ne: null, $exists: true },
  }, { projection: { 'omeda.SentDate': 1 }, sort: { 'omeda.SentDate': -1 } });

  const defaultStart = dayjs().subtract(30, 'days').toDate();
  const start = lastDeployment ? lastDeployment.omeda.SentDate : defaultStart;

  // find all omeda deployments since the last save and upsert them to the db
  const trackIds = await loadIds({ onOrAfter: start });
  log(`Found ${trackIds.length} deployment(s) to upsert.`, trackIds);
  if (trackIds.length) await upsert({ trackIds });
  if (!AWS_EXECUTION_ENV) await mongodb.close();
  log('DONE');
};
