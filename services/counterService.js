const Counter = require('../models/Counter');
const { formatComplaintId } = require('../utils/helpers');

// Atomically takes the next number from the counter -> CMP-0001, CMP-0002, ...
async function nextComplaintId() {
  for (let attempt = 0; ; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'complaint' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      return formatComplaintId(counter.seq);
    } catch (err) {
      // two very first complaints raced to create the counter: retry the $inc
      if (err.code === 11000 && attempt < 3) continue;
      throw err;
    }
  }
}

// Make sure the counter is never behind IDs that already exist
async function syncCounter(maxExisting) {
  await Counter.updateOne({ _id: 'complaint' }, { $max: { seq: maxExisting } }, { upsert: true });
}

module.exports = { nextComplaintId, syncCounter };
