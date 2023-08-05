import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import uRouter from './routes/users.js';
import tRouter from './routes/transactions.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.urlencoded({extended:true}))
app.use(express.json())



app.listen(process.env.PORT || 3001, () => {
    console.log(`Server listening on ${process.env.PORT || 3001}`);
  });

app.use(uRouter);
app.use(tRouter);

