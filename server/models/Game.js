const mongoose = require('mongoose');

const { generateHash } = require('../../util/helperFunctions');

const { ObjectId } = mongoose.Schema.Types;

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  hash: {
    type: String,
    index: {
      unique: true,
      collation: {
        locale: 'en',
        strength: 2,
      },
    },
  },
  users: { type: [{ type: ObjectId, ref: 'User' }], default: [] }, // current people in the game
  playersWaiting: { type: [{ type: ObjectId, ref: 'User' }], default: [] }, // people waiting for next game
  players: { type: [{ type: ObjectId, ref: 'User', default: [] }] }, // all people that were in game
  views: { type: [{ type: ObjectId, ref: 'User' }], default: [] }, // unique
  host: { type: ObjectId, ref: 'User' },
  state: { type: String, enum: ['PRE_START', 'WORD_CHOICE', 'IN_PROGRESS', 'COMPLETE'], default: 'PRE_START' },
  round: { type: Number, default: 0 },
  rounds: Number,
  capacity: { type: Number, default: 12 }, // probably wont even need capacity so just in case
  gameChains: [{ type: ObjectId, ref: 'GameChain' }],
  startTime: Date,
  endTime: Date,
  thumbnail: Object,
  nextGame: { type: ObjectId, ref: 'Game' },
  isPublic: { type: Boolean, default: false },
  config: {
    chooseFirstWord: { type: Boolean, default: false },
    guessTimeLimit: { type: Number, default: 20 },
    drawTimeLimit: { type: Number, default: 45 },
  },
};

const compiledSchema = new mongoose.Schema(schema, {
  collection: 'games',
  autoIndex: true,
  strict: false,
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
});

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
