const mongodb = require('@lead-management/mongodb/client');
const upsert = require('@lead-management/sync/commands/upsert-brand-data');
const { AWS_EXECUTION_ENV } = require('../env');

const { log } = console;

process.on('unhandledRejection', (e) => { throw e; });

exports.handler = async (event, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;
  await mongodb.connect();

  log('Upserting brand data...');
  await upsert();

  if (!AWS_EXECUTION_ENV) await mongodb.close();
  log('DONE');
};