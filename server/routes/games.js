const express = require('express');
const debug = require('debug');
const db = require('../models');

const { getDrawingsForGame } = require('../lib/Drawings');
const { getFromCache } = require('../../util/redisClient');
const { downloadDrawing } = require('../drawingStore');
const { asyncForEach } = require('../../util/helperFunctions');

const log = debug('warhol:games');
const logError = debug('warhol:games:error');

const gameRouter = express.Router();


gameRouter.get('/:hash', getGame);
gameRouter.post('/', createGame);
gameRouter.get('/', getGames);

// GET /api/games/:hash
async function getGame(req, res) {
  const { hash } = req.params;
  log(`GET /api/games/${hash}`);
  try {
    const game = await db.Game.model.findOne({ hash })
      .populate({
        path: 'gameChains',
        populate: {
          path: 'gameSteps',
          populate: { path: 'user' },
        },
      });
    if (game) {
      const drawingMap = await getDrawingsForGame(game.hash);
      const userSubmittedMap = JSON.parse(await getFromCache(`game:${hash}:user-submitted-map`));
      res.status(200).send({
        success: true,
        game,
        drawingMap,
        userSubmittedMap,
      });
    } else {
      res.status(400).send({ success: false });
    }
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}

// POST /api/games
async function createGame(req, res) {
  log('POST /api/games');
  try {
    const game = new db.Game.model();
    await game.save();
    res.status(200).send({ success: true, game });
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}

// GET /api/games
async function getGames(req, res) {
  log('GET /api/games');
  try {
    let { skip, limit } = req.query;
    if (!skip) skip = 0;
    if (!limit) limit = 8;
    const games = await db.Game.model.find(
      { state: 'COMPLETE' },
      {},
    )
      .sort({ endTime: -1 })
      .limit(limit)
      .skip(skip)
      .populate({
        path: 'gameChains',
        populate: {
          path: 'gameSteps',
          populate: 'drawing',
        },
      });
    if (games) {
      await asyncForEach(games, async (game) => {
        const firstDrawingFileName = game.gameChains[0].gameSteps[0].drawing.cloudFileName;
        try {
          const drawData = await downloadDrawing(firstDrawingFileName);
          // eslint-disable-next-line no-param-reassign
          game.thumbnail = drawData;
        } catch (err) {
          // eslint-disable-next-line no-param-reassign
          game.thumbnail = null;
        }
      });
      res.send({ success: true, games });
    } else {
      res.send({ success: false });
    }
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}
module.exports = gameRouter;
