import express from 'express';
import { _register, _login, _portfolio } from '../controllers/users.js';

const uRouter = express.Router();

uRouter.post('/register', _register);
uRouter.post('/login', _login);
uRouter.get('/portfolio/:userid', _portfolio);

export default uRouter;