
module.exports = function(recreateFrom) {
  const store = {}

  async function save(card) {
    const oldEvents = store[card.uuid()] || [];
    store[card.uuid()] = [...oldEvents, ...card.pendingEvents()];

    card.flushEvents();
  }

  async function load(card_id) {
    return recreateFrom(card_id, store[card_id]);
  }

  return {
    save,
    load
  }
}