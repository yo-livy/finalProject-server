import express from 'express';
import { _register, _login, _portfolio } from '../controllers/users.js';
import authenticateToken from '../middlewares/VerifyToken.js';

const uRouter = express.Router();

uRouter.get('/verify', authenticateToken, (req, res) => {
    res.json(req.user);
});
uRouter.post('/register', _register);
uRouter.post('/login', _login);
uRouter.get('/portfolio/:userid', authenticateToken, _portfolio);


export default uRouter;