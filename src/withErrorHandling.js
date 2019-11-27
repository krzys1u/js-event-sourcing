const ClientError = require('./clientError');

function withErrorHandling(fn) {
  return async function(req, res) {
    try {
      await fn(req.body);
      res.status(204).send();
    } catch (e) {
      if (e instanceof ClientError) {
        return res.status(400).json({error: e.message});
      }
      console.log(e);
      res.status(500).send();
    }
  };
}

module.exports = withErrorHandling