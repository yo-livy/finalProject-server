import { getUserById, register, login, createTransaction, getTransactionForUser, getTransactionByUserByStock, updateUserCash } from "../models/users.js";
import bcrypt from 'bcrypt';
import axios from 'axios';
import jwt from 'jsonwebtoken';


export const _register = async (req, res) => {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password + "", salt);

    try {
        const row = await register(username, hash );
        res.status(200).json(row);
    } catch (error) {
        console.log(error);
        res.status(404).json({msg: 'User already exists'});
    }
}

export const _login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const row = await login(username);
        if(row.length === 0) return res.status(400).json({msg:'User not found'});
        const match = await bcrypt.compare(password + "", row[0].password);
        if(!match) return res.status(400).json({msg:'Password is inccorect'});

        const userPayload = {
            id: row[0].id,
            username: row[0].username
        };
        
        const token = jwt.sign(userPayload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '1h' });
        res.status(200).json({ token, user: userPayload });

    } catch (error) {
        console.log(error);
        res.status(404).json({msg: 'Some error occured'});
    }
}


export const _createTransaction = async (req, res) => {
    try {
        const newTransaction = await createTransaction(req.body);
        res.status(200).json(newTransaction);
    } catch (error) {
        console.log(error);
        res.status(404).json({msg:error.message});
    }
}

export const _getTransactionForUser = async (req, res) => {
    try {
        const transaction = await getTransactionForUser(req.params.userID)
    } catch (error) {
        console.log(error);
        res.status(404).json({msg:error.message});
    }
}

export const _portfolio = async (req, res) => {
    const { userid } = req.params;
    if (!userid) {
        return res.status(400).json({ msg: 'User ID is missing' });
    }
    try {
        const user = await getUserById(userid);
        const transactions = await getTransactionForUser(userid);

        let userStocks = [];
        transactions.forEach((item) => {
            let stockObject = userStocks.find(stock => stock.symbol === item.stockid);

            if (!stockObject) {
                stockObject = { symbol: item.stockid, quantity: 0 };
                userStocks.push(stockObject);
            }

            if (item.transactiontype === 'BUY'){
                stockObject.quantity += item.quantity;
            } else {
                stockObject.quantity -= item.quantity;
            }

            userStocks = userStocks.filter(item => item.quantity !== 0);
        });

        const fetchStockPrice = async (symbol) => {
            let stockCurrentPrice = null;
            console.log('Refresh current price')
            const options = {
                method: 'GET',
                url: 'https://twelve-data1.p.rapidapi.com/price',
                params: {
                    symbol: symbol,
                    format: 'json',
                },
                headers: {
                    'X-RapidAPI-Key': process.env.ACCESS_KEY_RAPID,
                    'X-RapidAPI-Host': 'twelve-data1.p.rapidapi.com'
                }
            };
            try {
                const response = await axios.request(options);
                stockCurrentPrice = parseFloat(response.data.price);
                return stockCurrentPrice;
            } catch (error) {
                console.error(error);
                return 0; // Return 0 if the price couldn't be fetched
            }
        };

        const fetchPrices = userStocks.map(async item => {
            const price = await fetchStockPrice(item.symbol);
            const stockValue = price * item.quantity;
            return stockValue;
        });
        
        const stockValues = await Promise.all(fetchPrices);
        
        const portfolioValue = stockValues.reduce((acc, currValue) => acc + currValue, 0);

        res.json({ user, transactions, userStocks, portfolioValue });

    } catch (error) {
        console.log(error);
        res.status(404).json({msg:error.message});
    }
}

export const _buy = async (req, res) => {
    try {
        console.log(req.body)
        const {userid, symbol, quantity, price} = req.body
        const user = await getUserById(userid);
        console.log(user.cash)
        
        if (quantity * price > user.cash) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }


        const newCash = parseFloat(user.cash) - quantity * price;
        await updateUserCash(userid, newCash);

        const newTrx = await createTransaction({ userid, stockid: symbol, price, quantity, transactiontype: 'BUY' });
        console.log(newTrx);
        console.log(newCash);
        res.status(200).json(newTrx);

    } catch (error) {
       console.log(error);
       res.status(500).json({msg: 'Server error on BUY'});
    }
}

export const _sell = async (req, res) => {
    try {
        const { userid, symbol, quantity, price } = req.body
        const user = await getUserById(userid);
        console.log(user.cash)

        const userStockTransactions = await getTransactionByUserByStock(userid, symbol);
        const userStockQuantity = userStockTransactions.reduce((total, transaction) => total + (transaction.transactiontype === 'BUY' ? transaction.quantity : -transaction.quantity), 0);

        if (quantity > userStockQuantity) {
            return res.status(400).json({ message: 'Insufficient stocks' });
        }

        const newCash = parseFloat(user.cash) + quantity * price;
        await updateUserCash(userid, newCash);

        const newTrx = await createTransaction({ userid, stockid:symbol, price, quantity, transactiontype: 'SELL' });
        console.log(newTrx);
        console.log(newCash);
        res.status(200).json(newTrx);

    } catch (error) {
       console.log(error);
       res.status(500).json({msg: 'Server error on SELL'});
    }
}

