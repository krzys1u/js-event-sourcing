const express = require('express');
const now  = function() { return new Date(); };
const {card, recreateFrom} = require('./card')(now);
const withErrorHandling = require('./withErrorHandling');
const withPersistenceFactory = require('./withPersistence');

module.exports = async function() {
  const app = express();

  const initStore = require('./es');
  const es = await initStore();
  const repository = require('./mongoCardRepository')(recreateFrom, es);

  const withPersistence = withPersistenceFactory(repository);

  const withErrorHandllingAndPeristence = (fn) => {
    return withErrorHandling(withPersistence(fn))
  }

  app.use(express.json());

  function setLimit(c, body) {
      c.assignLimit(body.amount);
  }

  function withdraw(c, body) {
      c.withdraw(body.amount);
  }

  function repayment(c, body) {
      c.repay(body.amount);
  }

  function paginationLink({skip, limit, results}) {
    const prevLink = skip > 0 ? `</events?skip=${Math.max(0, skip - limit)}&limit=${limit}>; rel="prev"` : "";
    const nextLink = results === limit ? `</events?skip=${skip + limit}&limit=${limit}>; rel="next"` : "";

    return [prevLink, nextLink].filter(x => x).join("; ");
  }

  app.post('/limit', withErrorHandllingAndPeristence(setLimit));
  app.post('/withdrawal', withErrorHandllingAndPeristence(withdraw));
  app.post('/repayment', withErrorHandllingAndPeristence(repayment));

  app.get('/limit/:uuid', async function (req, res) {
    const c = await repository.load(req.params.uuid);
    res.json({uuid: c.uuid(), limit: c.availableLimit()});
  });

  app.get('/events', async function (req, res) {
    const skip = Number(req.query.skip) || 0;
    const limit = Math.min(Number(req.query.limit) || 10, 10);
    const events = await repository.loadEvents({skip, limit});

    res.header("Link", paginationLink({skip, limit, results: events.length}));

    res.json(events);
  });

  app.close = function() {
    return es.close();
  };

  return app;
};
