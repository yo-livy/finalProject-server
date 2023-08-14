import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import uRouter from './routes/users.js';
import tRouter from './routes/transactions.js';

import cron from 'node-cron';
import { db } from './config/db.js';
import { computeAndStoreDailyPortfolio } from './controllers/users.js';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.use(uRouter);
app.use(tRouter);

cron.schedule('0 0 * * *', async () => {
  const allUsers = await db("users").select();
  for(const user of allUsers) {
      await computeAndStoreDailyPortfolio(user.id);
  }
});


app.listen(process.env.PORT || 3001, () => {
    console.log(`Server listening on ${process.env.PORT || 3001}`);
  });



