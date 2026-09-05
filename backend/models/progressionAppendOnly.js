'use strict';

function applyAppendOnlyGuards(schema, label) {
  const reject = function rejectMutation(next) { next(new Error(`${label} are append-only`)); };
  for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndReplace']) {
    schema.pre(operation, reject);
  }
  schema.pre('save', function rejectExistingSave(next) {
    if (!this.isNew) return next(new Error(`${label} are append-only`));
    return next();
  });
}

module.exports = { applyAppendOnlyGuards };
