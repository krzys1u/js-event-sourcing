module.exports = (repository) => {
  return function withPersistence(fn) {
    return async (body) => {
      const c = await repository.load(body.uuid);
      fn(c, body);
      await repository.save(c);
    };
  }
}