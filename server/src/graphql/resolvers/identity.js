const { Pagination, TypeAhead, paginationResolvers } = require('../pagination');
const Identity = require('../../mongodb/models/identity');
// const LineItem = require('../../models/line-item');

const { isArray } = Array;

module.exports = {
  /**
   *
   */
  IdentityConnection: paginationResolvers.connection,

  /**
   *
   */
  Identity: {
    /**
     *
     */
    inactiveCustomers: ((identity, _, { loaders }) => {
      const { inactiveCustomerIds } = identity;
      if (!isArray(inactiveCustomerIds) || !inactiveCustomerIds.length) return [];
      return loaders.customer.loadMany(inactiveCustomerIds);
    }),

    /**
     *
     */
    // inactiveCampaigns: ((identity, _, { loaders }) => {
    //   const { inactiveCampaignIds } = identity;
    //   if (!isArray(inactiveCampaignIds) || !inactiveCampaignIds.length) return [];
    //   return loaders.campaign.loadMany(inactiveCampaignIds);
    // }),
    inactiveCampaigns: () => [],

    /**
     *
     */
    // inactiveLineItems: ((identity) => {
    //   const { inactiveLineItemIds } = identity;
    //   if (!isArray(inactiveLineItemIds) || !inactiveLineItemIds.length) return [];
    //   return LineItem.find({ _id: { $in: inactiveLineItemIds } });
    // }),
    inactiveLineItems: () => [],

    /**
     *
     */
    domainExcluded: async (identity, _, { loaders }) => {
      const doc = await loaders.excludedEmailDomains.load(identity.emailDomain);
      if (!doc) return false;
      return doc.domain === identity.emailDomain;
    },
  },

  /**
   *
   */
  Query: {
    /**
     *
     */
    identity: async (root, { input }, { auth }) => {
      auth.check();
      const { id } = input;
      const record = await Identity.findById(id);
      if (!record) throw new Error(`No identity record found for ID ${id}.`);
      return record;
    },

    /**
     *
     */
    allIdentities: (root, { pagination, sort }, { auth }) => {
      auth.check();
      return new Pagination(Identity, { pagination, sort });
    },

    /**
     *
     */
    searchIdentities: (root, { pagination, search, options }, { auth }) => {
      auth.check();
      const { field, phrase } = search;
      const instance = new TypeAhead(field, phrase, {}, options);
      return instance.paginate(Identity, pagination);
    },
  },

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    identityActivation: async (root, { input }, { auth }) => {
      auth.check();
      const { identityId, active } = input;
      const identity = await Identity.findById(identityId);
      if (!identity) throw new Error(`No identity found for ID '${identityId}'`);
      identity.inactive = !active;
      return identity.save();
    },

    /**
     *
     */
    identityCustomerActivation: async (root, { input }, { auth }) => {
      auth.check();
      const { identityId, active, customerId } = input;
      const identity = await Identity.findById(identityId);
      if (!identity) throw new Error(`No identity found for ID '${identityId}'`);
      if (!active) {
        identity.inactiveCustomerIds.push(customerId);
      } else {
        const inactiveCustomerIds = identity.inactiveCustomerIds.filter((cid) => `${cid}` !== `${customerId}`);
        identity.inactiveCustomerIds = inactiveCustomerIds;
      }
      return identity.save();
    },

    /**
     *
     */
    identityCampaignActivation: async (root, { input }, { auth }) => {
      auth.check();
      const { identityId, active, campaignId } = input;
      const identity = await Identity.findById(identityId);
      if (!identity) throw new Error(`No identity found for ID '${identityId}'`);
      if (!active) {
        identity.inactiveCampaignIds.push(campaignId);
      } else {
        const inactiveCampaignIds = identity.inactiveCampaignIds.filter((cid) => `${cid}` !== `${campaignId}`);
        identity.inactiveCampaignIds = inactiveCampaignIds;
      }
      return identity.save();
    },

    /**
     *
     */
    identityLineItemActivation: async (root, { input }, { auth }) => {
      auth.check();
      const { identityId, active, lineItemId } = input;
      const identity = await Identity.findById(identityId);
      if (!identity) throw new Error(`No identity found for ID '${identityId}'`);

      let inactiveLineItemIds = isArray(identity.inactiveLineItemIds)
        ? identity.inactiveLineItemIds : [];

      if (!active) {
        inactiveLineItemIds.push(lineItemId);
      } else {
        const filtered = inactiveLineItemIds.filter((cid) => `${cid}` !== `${lineItemId}`);
        inactiveLineItemIds = filtered;
      }
      identity.inactiveLineItemIds = inactiveLineItemIds;
      return identity.save();
    },
  },
};
