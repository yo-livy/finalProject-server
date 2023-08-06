import express from 'express';
import { _createTransaction, _getTransactionForUser, _buy, _sell } from '../controllers/users.js';
import authenticateToken from '../middlewares/VerifyToken.js';

const tRouter = express.Router();

tRouter.post('/trx', authenticateToken, _createTransaction);
tRouter.get('/trx/:userId', authenticateToken, _getTransactionForUser);
tRouter.post('/buy', authenticateToken, _buy);
tRouter.post('/sell', authenticateToken, _sell);


export default tRouter;