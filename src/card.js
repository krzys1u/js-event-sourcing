const cardEventCreatorFactory = require('./eventsCreator');
const eventTrackerFactory = require('./eventTracker');

const ClientError = require('./clientError');

const {
  LIMIT_ASSIGNED,
  CARD_WITHDRAWN,
  CARD_REPAID,
} = require('./eventsTypes');

module.exports = function (now) {
  function card(card_id) {
    const id = card_id;

    let limit;
    let used = 0;

    const cardEventCreator = cardEventCreatorFactory(now, card_id);
    const eventTracker = eventTrackerFactory(apply);

    // invariant
    function limitAlreadyAssigned() {
      return limit != null;
    }

    function notEnoughMoney(amount) {
      return amount > availableLimit();
    }

    function availableLimit() {
      return limit - used;
    }

    function uuid() {
      return id;
    }

    function apply(event) {
      const {type, amount} = event;

      switch(type) {
        case LIMIT_ASSIGNED:
          limit = amount;
          break;
        case CARD_WITHDRAWN:
          used += amount;
          break;
        case CARD_REPAID:
          used -= amount
          break;
      }

      return this;
    }

    function assignLimit(amount) {
      if (limitAlreadyAssigned()) {
        throw new ClientError('Cannot assign limit for the second time');
      }

      eventTracker.applyWithRecord(cardEventCreator.limitAssigned(amount));
    }

    function withdraw(amount) {
      if (!limitAlreadyAssigned()) {
        throw new ClientError('No limit assigned');
      }
      if (notEnoughMoney(amount)) {
        throw new ClientError('Not enough money');
      }

      eventTracker.applyWithRecord(cardEventCreator.cardWithdrawn(amount));
    }

    function repay(amount) {
      eventTracker.applyWithRecord(cardEventCreator.cardRepaid(amount));
    }

    return {
      uuid,
      apply,
      assignLimit,
      availableLimit,
      repay,
      withdraw,
      pendingEvents: eventTracker.pendingEvents,
      flushEvents: eventTracker.flushEvents,
    };
  }

  function recreateFrom(card_id, events) {
    return events.reduce((newCard, event) => newCard.apply(event), card(card_id));
  }

  return {
    card,
    recreateFrom
  }
}