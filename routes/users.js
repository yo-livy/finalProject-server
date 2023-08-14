import express from 'express';
import { _register, _login, _portfolio, getPortfolioChartData, computeAndStoreDailyPortfolio } from '../controllers/users.js';
import authenticateToken from '../middlewares/VerifyToken.js';

const uRouter = express.Router();

uRouter.get('/verify', authenticateToken, (req, res) => {
    res.json(req.user);
});
uRouter.post('/register', _register);
uRouter.post('/login', _login);
uRouter.get('/portfolio/:userid', authenticateToken, _portfolio);
uRouter.get('/daily_portfolio/:userId', getPortfolioChartData);

uRouter.post('/portfolio/compute', authenticateToken, async (req, res) => {
    const { userId } = req.body;
    await computeAndStoreDailyPortfolio(userId);
    res.send('Portfolio updated');
});


export default uRouter;