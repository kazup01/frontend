import React from 'react';
import PropTypes from 'prop-types';
import withIntl from '../lib/withIntl';
import Header from '../components/Header';
import Body from '../components/Body';
import Footer from '../components/Footer';
import CollectiveCover from '../components/CollectiveCover';
import TierCard from '../components/TierCard';
import NotificationBar from '../components/NotificationBar';
import MembersWithData from '../components/MembersWithData';
import { addCreateOrderMutation } from '../graphql/mutations';
import Markdown from 'react-markdown';
import { get } from 'lodash';
import { Router } from '../server/pages';
import MenuBar from './MenuBar';
import HashLink from 'react-scrollchor';
import { FormattedMessage, defineMessages } from 'react-intl';
import CollectivesWithData from './CollectivesWithData';
import ExpensesWithData from './ExpensesWithData';
import EventsWithData from './EventsWithData';
import TransactionsWithData from './TransactionsWithData';
import { Button } from 'react-bootstrap';
import { Link } from '../server/pages';
import Currency from './Currency';

const defaultBackgroundImage = '/static/images/defaultBackgroundImage.png';

class Collective extends React.Component {

  static propTypes = {
    collective: PropTypes.object.isRequired,
    LoggedInUser: PropTypes.object
  }

  constructor(props) {
    super(props);
    this.collective = this.props.collective; // pre-loaded by SSR
    console.log(">>> this.collective", this.collective, props);
    this.updateOrder = this.updateOrder.bind(this);
    this.resetOrder = this.resetOrder.bind(this);

    this.state = {
      view: 'default',
      order: {},
      api: { status: 'idle' },
    };

    this.messages = defineMessages({      
      'collective.created': { id: 'collective.created', defaultMessage: `Your collective has been created with success.`},
      'collective.created.description': { id: 'collective.created.description', defaultMessage: `While you are waiting for approval from your host ({host}), you can already customize your collective, file expenses and even create events.`},
      'collective.donate': { id: 'collective.donate', defaultMessage: `donate`},
      'collective.since': { id: 'usercollective.since', defaultMessage: `Established in {year}`},
      'collective.members.admin.title': { id: 'collective.members.admin.title', defaultMessage: `{n} {n, plural, one {core contributor} other {core contributors}}`},
      'collective.members.member.title': { id: 'collective.members.member.title', defaultMessage: `{n} {n, plural, one {member} other {members}}`},
      'collective.members.backer.title': { id: 'collective.members.backer.title', defaultMessage: `{n} {n, plural, one {backer} other {backers}}`},
      'collective.members.fundraiser.title': { id: 'collective.members.fundraiser.title', defaultMessage: `{n} {n, plural, one {fundraiser} other {fundraisers}}`},
      'collective.members.follower.title': { id: 'collective.members.follower.title', defaultMessage: `{n} {n, plural, one {follower} other {followers}}`},
      'collective.menu.host': { id: 'collective.menu.host', defaultMessage: `contributing to {n} {n, plural, one {collective} other {collectives}}`},
      'collective.menu.admin': { id: 'collective.menu.admin', defaultMessage: `contributing to {n} {n, plural, one {collective} other {collectives}}`},
      'collective.menu.member': { id: 'collective.menu.member', defaultMessage: `member of {n} {n, plural, one {collective} other {collectives}}`},
      'collective.menu.backer': { id: 'collective.menu.backer', defaultMessage: `backing {n} {n, plural, one {collective} other {collectives}}`},
      'collective.menu.fundraiser': { id: 'collective.menu.fundraiser', defaultMessage: `raised money for {n} {n, plural, one {collective} other {collectives}}`},
      'collective.menu.follower': { id: 'collective.menu.follower', defaultMessage: `following {n} {n, plural, one {collective} other {collectives}}`},
    });
  }

  componentDidMount() {
    window.oc = { collective: this.collective }; // for easy debugging
  }

  async createOrder(order) {
    order.tier = order.tier || {};
    const OrderInputType = {
      ... order,
      collective: { slug: this.collective.slug },
      tier: { id: order.tier.id }
    };

    this.setState( { status: 'loading' });
    try {
      await this.props.createOrder(OrderInputType);
      this.setState( { status: 'idle' });
    } catch (err) {
      console.error(">>> createOrder error: ", err);
      throw new Error(err.graphQLErrors[0].message);
    }
  }

  error(msg) {
    this.setState( {status: 'error', error: msg });
    setTimeout(() => {
      this.setState( { status: 'idle', error: null });
    }, 5000);
  }

  updateOrder(tier) {
    const order = {
      tier: { id: tier.id },
      quantity: tier.quantity,
      totalAmount: (tier.quantity || 1) * tier.amount,
      interval: tier.interval
    }
    this.setState({ order });
    // if (typeof window !== "undefined") {
    //   window.state = this.state;
    // }
  }

  resetOrder() {
    this.setState({ order: {} });
  }

  render() {
    const { intl, LoggedInUser, query } = this.props;
    const donateParams = { collectiveSlug: this.collective.slug, verb: 'donate' };
    if (query.referral) {
      donateParams.referral = query.referral;
    }
    const backersHash = this.collective.stats.backers.organizations > 0 ? '#organizations' : '#backers';
    const actions = [
      {
        className: 'whiteblue',
        component: <HashLink to={backersHash}>
              <FormattedMessage
                id="collective.stats.backers.users"
                defaultMessage="{n} {n, plural, one {backer} other {backers}}"
                values={{ n: this.collective.stats.backers.users }}
                />
              { this.collective.stats.backers.organizations > 0 &&
                <div>
                  <FormattedMessage
                    id="collective.stats.backers.organizations"
                    defaultMessage="{n} {n, plural, one {organization} other {organizations}}"
                    values={{ n: this.collective.stats.backers.organizations}}
                    />
                </div>
              }
          </HashLink>
      },
      {
        className: 'whiteblue',
        component: <HashLink to={`#budget`}>
            <FormattedMessage
              id="collective.budget"
              defaultMessage="budget"
              />
          </HashLink>
      },
      {
        className: 'blue',
        component: <Link route={'donate'} params={donateParams}>
            <a><b>{intl.formatMessage(this.messages['collective.donate']).toUpperCase()}</b></a>
          </Link>
      }
    ];

    if (LoggedInUser && LoggedInUser.canEditCollective(this.collective)) {
      actions.push({
        className: 'whiteblue small',
        component: <a href={`/${this.collective.slug}/edit`}>EDIT COLLECTIVE</a>
      });
    }

    const backgroundImage = this.collective.backgroundImage || get(this.collective,'parentCollective.backgroundImage') || defaultBackgroundImage;

    const notification = {};
    if (get(query, 'status') === 'collectiveCreated') {
      notification.title = intl.formatMessage(this.messages['collective.created']);
      notification.description = intl.formatMessage(this.messages['collective.created.description'], { host: this.collective.host.name });
    }

    return (
      <div className="CollectivePage">
        <style jsx>{`
          .sidebar {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .longDescription {
            margin-top: 3rem;
          }
          .tier {
            text-align: center;
            font-size: 1.4rem;
          }
          section {
            clear: both;
            max-width: 900px;
            margin: 0 auto;
          }
          .columns {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: space-around;
          }
          .columns .col {
            max-width: 400px;
            width: 100%;
          }
          .columns .actions {
            text-align: center;
          }
          .columns .actions :global(button) {
            margin: 0.5rem;
          }
          .cardsList {
            display: flex;
            flex-wrap: wrap;
            flex-direction: row;
            justify-content: center;
          }
          .balance {
            text-align: center;
          }
          .balance label {
            margin: 0 0.5rem;
            font-weight: 500;
          }
          @media(min-width: 600px) {
            .sidebar {
              float: right;
              margin: 3rem;
            }
          }
        `}</style>

        <Header
          title={this.collective.name}
          description={this.collective.description || this.collective.longDescription}
          twitterHandle={this.collective.twitterHandle || get(this.collective.parentCollective, 'twitterHandle')}
          image={this.collective.image || get(this.collective.parentCollective, 'image') || backgroundImage}
          className={this.state.status}
          LoggedInUser={this.props.LoggedInUser}
          href={`/${this.collective.slug}`}
          />

        <Body>

          <div className="CollectivePage">

            <NotificationBar
              status={this.state.status}
              title={notification.title}
              description={notification.description}
              error={this.state.error}
              />

            <CollectiveCover
              collective={this.collective}
              style={get(this.collective, 'settings.style.hero.cover') || get(this.collective.parentCollective, 'settings.style.hero.cover')}
              cta={<HashLink to={`#contribute`}><FormattedMessage id="collective.contribute" defaultMessage="contribute" /></HashLink>}
              />

            <MenuBar
              info={intl.formatMessage(this.messages['collective.since'], { year: (new Date(this.collective.createdAt)).getFullYear() })}
              actions={actions}
              />

            <div>

              <section id="about">
                <div className="sidebar tiers" id="contribute">
                  { this.collective.tiers.map(tier => (
                    <TierCard
                      collective={this.collective}
                      tier={tier}
                      referral={query.referral}
                      />
                  ))}
                </div>

                <div className="content" >
                  <div className="longDescription" >
                    <Markdown source={this.collective.longDescription || this.collective.description || ''} />
                  </div>
                  <div id="events">
                    <h1><FormattedMessage id="collective.events.title" defaultMessage="Events" /></h1>
                    <EventsWithData collectiveSlug={this.collective.slug} />
                  </div>
                </div>
              </section>

              { this.collective.stats.collectives > 0 &&
                <section id="hosting">
                  <h1>
                    <FormattedMessage
                      id="collective"
                      values={{ n: this.collective.stats.collectives }}
                      defaultMessage={`{n} {n, plural, one {collective} other {collectives}}`}
                      />
                  </h1>
                  <div className="cardsList">
                    <CollectivesWithData
                      ParentCollectiveId={this.collective.id}
                      orderBy="balance"
                      orderDirection="DESC"
                      limit={20}
                      />
                  </div>
                </section>
              }

              { this.collective.stats.backers.organizations > 0 &&
                <section id="organizations" className="tier">
                  <h1>
                    <FormattedMessage
                      id="collective.section.backers.organizations.title"
                      values={{ n: this.collective.stats.backers.organizations, collective: this.collective.name }}
                      defaultMessage={`{n} {n, plural, one {organization is} other {organizations are}} supporting {collective}`}
                      />
                  </h1>
                  <MembersWithData
                    collective={this.collective}
                    type="ORGANIZATION"
                    LoggedInUser={LoggedInUser}
                    role='BACKER'
                    limit={100}
                    />
                </section>
              }

              { this.collective.stats.backers.users > 0 &&
                <section id="backers" className="tier">
                  <h1>
                    <FormattedMessage
                      id="collective.section.backers.users.title"
                      values={{ n: this.collective.stats.backers.users, collective: this.collective.name }}
                      defaultMessage={`{n} {n, plural, one {person is} other {people are}} supporting {collective}`}
                      />
                  </h1>
                  <MembersWithData
                    collective={this.collective}
                    LoggedInUser={LoggedInUser}
                    type="USER"
                    role='BACKER'
                    limit={100}
                    orderBy="totalDonations"
                    />
                </section>
              }

              <section id="budget">
                <h1><FormattedMessage id="collective.budget.title" defaultMessage="Budget" /></h1>
                <div className="balance">
                  <label><FormattedMessage id="collective.stats.balance.title" defaultMessage="Available balance:" /></label>
                  <Currency value={this.collective.stats.balance} currency={this.collective.currency} />
                </div>
                <div className="columns">
                  <div id="expenses" className="col">
                    <h2>
                      <FormattedMessage
                        id="collective.expenses.title"
                        values={{ n: this.collective.stats.expenses.all }}
                        defaultMessage={`{n, plural, one {Latest expense} other {Latest expenses}}`}
                        />
                    </h2>
                    <ExpensesWithData
                      collective={this.collective}
                      LoggedInUser={LoggedInUser}
                      compact={true}
                      limit={5}
                      />
                    <div className="actions">
                      <Button className="ViewAllExpensesBtn" bsStyle="default" onClick={() => Router.pushRoute(`/${this.collective.slug}/expenses`)}><FormattedMessage id="expenses.viewAll" defaultMessage="View All Expenses" /></Button>
                      <Button className="SubmitExpenseBtn" bsStyle="default" onClick={() => Router.pushRoute(`/${this.collective.slug}/expenses/new`)}><FormattedMessage id="expenses.submit" defaultMessage="Submit an Expense" /></Button>
                    </div>
                  </div>

                  <div id="transactions" className="col">
                    <h2>
                      <FormattedMessage
                        id="collective.transactions.title"
                        values={{ n: this.collective.stats.transactions }}
                        defaultMessage={`{n, plural, one {Latest transaction} other {Latest transactions}}`}
                        />
                    </h2>
                    <TransactionsWithData
                      collective={this.collective}
                      LoggedInUser={LoggedInUser}
                      limit={5}
                      />
                      <div className="actions">
                      <Button className="ViewAllTransactionsBtn" bsStyle="default" onClick={() => Router.pushRoute(`/${this.collective.slug}/transactions`)}><FormattedMessage id="transactions.viewAll" defaultMessage="View All Transactions" /></Button>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </Body>
        <Footer />
      </div>
    )
  }
}

export default addCreateOrderMutation(withIntl(Collective));
