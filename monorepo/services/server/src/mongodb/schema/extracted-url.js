const { Schema } = require('mongoose');
const { nanoid } = require('nanoid');
const newrelic = require('../../newrelic');
const connection = require('../connection');
const urlParamsPlugin = require('../plugins/url-params');
const cleanUrl = require('../../utils/clean-url');
const isURL = require('../../utils/is-url');

const valuesSchema = new Schema({
  original: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator(v) {
        return isURL(v);
      },
      message: 'The provided URL is invalid {VALUE}',
    },
    set: (v) => {
      if (!v) return v;
      try {
        return cleanUrl(v);
      } catch (e) {
        return '';
      }
    },
  },
  resolved: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator(v) {
        return isURL(v);
      },
      message: 'The provided URL is invalid {VALUE}',
    },
    set: (v) => {
      if (!v) return v;
      try {
        return cleanUrl(v);
      } catch (e) {
        return '';
      }
    },
  },
}, { _id: false });

const metaSchema = new Schema({
  description: {
    type: String,
    trim: true,
  },
  openGraph: {
    type: Schema.Types.Mixed,
  },
}, { _id: false });

const schema = new Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    default() {
      return nanoid(10);
    },
  },
  title: {
    type: String,
    trim: true,
  },
  lastCrawledDate: {
    type: Date,
  },
  errorMessage: {
    type: String,
  },
  linkType: {
    type: String,
    required: true,
    default: '(Not Set)',
    enum: ['(Not Set)', 'Advertising', 'Editorial'],
  },
  values: {
    type: valuesSchema,
    required: true,
  },
  meta: {
    type: metaSchema,
  },
  headerDirectives: {
    type: Schema.Types.Mixed,
    default: () => ({}),
  },
  resolvedHostId: {
    type: Schema.Types.ObjectId,
    required: true,
    validate: {
      async validator(v) {
        const doc = await connection.model('extracted-host').findOne({ _id: v }, { _id: 1 });
        if (doc) return true;
        return false;
      },
      message: 'No extracted host was found for {VALUE}',
    },
  },
  customerId: {
    type: Schema.Types.ObjectId,
    validate: {
      async validator(v) {
        if (!v) return true;
        const doc = await connection.model('customer').findOne({ _id: v }, { _id: 1 });
        if (doc) return true;
        return false;
      },
      message: 'No customer was found for {VALUE}',
    },
  },
  tagIds: [
    {
      type: Schema.Types.ObjectId,
      validate: {
        async validator(v) {
          const doc = await connection.model('tag').findOne({ _id: v }, { _id: 1 });
          if (doc) return true;
          return false;
        },
        message: 'No tag was found for {VALUE}',
      },
    },
  ],
});

schema.plugin(urlParamsPlugin);

schema.index({ 'values.original': 1 }, { unique: true });
schema.index({ customerId: 1 });
schema.index({ resolvedHostId: 1 });
schema.index({ tagIds: 1 });

schema.pre('save', async function updateDeploymentUrls() {
  const fields = ['customerId', 'tagIds', 'linkType'];
  const shouldUpdate = fields.some((field) => this.isModified(field));
  if (!shouldUpdate) return;

  const run = async () => {
    const $set = {
      customerId: this.customerId || null,
      linkType: this.linkType,
      tagIds: this.tagIds,
    };
    await connection.model('omeda-email-deployment-url').updateMany({ 'url._id': this.id }, { $set });
  };

  // run update but do not await
  run().catch(newrelic.noticeError.bind(newrelic));
});

module.exports = schema;
