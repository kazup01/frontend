import dotenv from 'dotenv';
dotenv.config();
import { GraphQLClient } from 'graphql-request';
import { uniqBy } from 'lodash';
const graphqlServerUrl = `${process.env.API_URL}/graphql?api_key=${process.env.API_KEY}`;
console.log(">>> connecting to ", graphqlServerUrl);
const client = new GraphQLClient(graphqlServerUrl, { headers: {} })

export async function fetchCollective(collectiveSlug) {
  const query = `
  query Collective($collectiveSlug: String!) {
    Collective(slug:$collectiveSlug) {
      id
      slug
      image
      currency
      data
      stats {
        balance
        backers {
          all
        }
        yearlyBudget
      }
    }
  }
  `;

  const result = await client.request(query, { collectiveSlug });
  return result.Collective;
}

export async function fetchCollectiveImage(collectiveSlug) {
  const query = `
  query Collective($collectiveSlug: String!) {
    Collective(slug:$collectiveSlug) {
      id
      image
    }
  }
  `;  

  const result = await client.request(query, { collectiveSlug });    
  return result.Collective;
}

export async function fetchMembersStats(params) {
  const { backerType, tierSlug } = params;
  let query, processResult;

  if (backerType) {
    query = `
    query Collective($collectiveSlug: String!) {
      Collective(slug:$collectiveSlug) {
        stats {
          backers {
            all
            users
            organizations
          }
        }
      }
    }
    `;
    processResult = (res) => {
      const count = (backerType.match(/sponsor/)) ? res.Collective.stats.backers.organizations : res.Collective.stats.backers.users;
      return {
        name: backerType,
        count
      }
    }
  } else if (tierSlug) {
    query = `
    query Collective($collectiveSlug: String!, $tierSlug: String) {
      Collective(slug:$collectiveSlug) {
        tiers(slug: $tierSlug) {
          slug
          name
          stats {
            totalDistinctOrders
          }
        }
      }
    }
    `;
    processResult = (res) => {
      return {
        count: res.Collective.tiers[0].stats.totalDistinctOrders,
        slug: res.Collective.tiers[0].slug,
        name: res.Collective.tiers[0].name
      }
    }
  }
  try {
    const result = await client.request(query, params);
    const count = processResult(result);
    return count;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchMembers({ collectiveSlug, tierSlug, backerType }, options = {}) {
  let query, processResult, type;
  if (backerType === 'contributors') {
    query = `
    query Collective($collectiveSlug: String!) {
      Collective(slug:$collectiveSlug) {
        id
        data
      }
    }
    `;
    processResult = (res) => {
      const users = res.Collective.data.githubContributors;
      return Object.keys(users).map(username => {
        const commits = users[username]
        return {
          slug: username,
          type: 'USER',
          image: `https://avatars.githubusercontent.com/${username}?s=96`,
          website: `https://github.com/${username}`,
          stats: { c: commits }
        }
      });
    }
  } else if (backerType) {
    type = backerType.match(/sponsor/i) ? 'ORGANIZATION' : 'USER';
    query = `
    query allMembers($collectiveSlug: String!, $type: String!) {
      allMembers(collectiveSlug: $collectiveSlug, type: $type, orderBy: "totalDonations") {
        id
        createdAt
        member {
          id
          type
          slug
          image
          website
          twitterHandle
        }
      }
    }
    `;
    processResult = (res) => uniqBy(res.allMembers.map(m => m.member), m => m.id);
  } else if (tierSlug) {
    query = `
    query Collective($collectiveSlug: String!, $tierSlug: String!) {
      Collective(slug:$collectiveSlug) {
        tiers(slug: $tierSlug) {
          orders {
            id
            createdAt
            fromCollective {
              id
              type
              slug
              image
              website
              twitterHandle
            }
          }
        }
      }
    }
    `;
    processResult = (res) => uniqBy(res.Collective.tiers[0].orders.map(o => o.fromCollective), m => m.id);
  }

  const result = await (options.client || client).request(query, { collectiveSlug, tierSlug, type });
  const members = processResult(result);
  return members;
}