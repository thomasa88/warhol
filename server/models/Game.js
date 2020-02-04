const mongoose = require('mongoose');

const { generateHash } = require('../../util/helperFunctions');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  hash: { type: String, index: true },
  users: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  state: { type: String, enum: ['PRE_START', 'IN_PROGRESS', 'COMPLETE'], default: 'PRE_START' },
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'games', autoIndex: true, strict: false });

compiledSchema.pre('save', preSave);

const Game = {
  model: mongoose.model('Game', compiledSchema),
};


async function preSave(next) {
  if (!this.hash) {
    let existingGame;
    let hash;
    do {
      // keep generating hash if game with that hash already exists
      hash = generateHash();
      existingGame = await this.constructor.findOne({ hash });
    } while (existingGame);
    this.hash = hash;
  }
  next();
}

module.exports = Game;
