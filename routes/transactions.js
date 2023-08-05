import express from 'express';
import { _createTransaction, _getTransactionForUser, _buy, _sell } from '../controllers/users.js';

const tRouter = express.Router();

tRouter.post('/trx', _createTransaction);
tRouter.get('/trx/:userId', _getTransactionForUser);
tRouter.post('/buy', _buy);
tRouter.post('/sell', _sell);


export default tRouter;