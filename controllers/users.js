import { 
    getUserById,
    register,
    login,
    createTransaction,
    getTransactionForUser,
    getTransactionByUserByStock,
    updateUserCash,
    getCurrentPortfolioValueForDate, 
    updatePortfolioValueForDate, 
    insertNewPortfolioValueForDate,
    getDailyPortfolioValues
 } from "../models/users.js";
import bcrypt from 'bcrypt';
import axios from 'axios';
import jwt from 'jsonwebtoken';


const fetchStockPrice = async (symbol) => {
    let stockCurrentPrice = null;
    console.log('Refresh current price');
    const options = {
        method: 'GET',
        url: `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.ACCESS_KEY_TWELVE}`
    };
    try {
        const response = await axios.request(options);
        console.log(`Fetching price from 12 ${symbol}...`);
        stockCurrentPrice = parseFloat(response.data.price);
        return stockCurrentPrice;
    } catch (error) {
        console.error(error);
        return 0; // Return 0 if the price couldn't be fetched
    }
};


export const computeUserPortfolio = async (userid) => {
    const user = await getUserById(userid);
    const transactions = await getTransactionForUser(userid);

    let userStocks = [];
    transactions.forEach((item) => {
        let stockObject = userStocks.find(stock => stock.symbol === item.stockid);

        if (!stockObject) {
            stockObject = { exchange: item.exchange, name: item.company_name, symbol: item.stockid, quantity: 0, price: 0, stockValue: 0 };
            userStocks.push(stockObject);
        }

        if (item.transactiontype === 'BUY') {
            stockObject.quantity += item.quantity;
            stockObject.totalCost += item.quantity * item.price;
        } else {
            stockObject.quantity -= item.quantity;
            stockObject.totalCost -= item.quantity * item.price;
        }

        userStocks = userStocks.filter(item => item.quantity !== 0);
    });

    const stockValues = await Promise.all(
        userStocks.map(async item => {
            item.price = await fetchStockPrice(item.symbol);
            item.stockValue = item.price * item.quantity;
            return item;
        })
    );
    
    const portfolioValue = stockValues.reduce((acc, currValue) => acc + currValue.stockValue, 0);
    
    return { user, transactions, userStocks, portfolioValue };
}

export const _portfolio = async (req, res) => {
    const { userid } = req.params;
    if (!userid) {
        return res.status(400).json({ msg: 'User ID is missing' });
    }
    try {
        const { user, transactions, userStocks, portfolioValue } = await computeUserPortfolio(userid);

        const percentCash = (parseFloat(user.cash) / (parseFloat(user.cash) + parseFloat(portfolioValue))) * 100;

        res.json({ user, transactions, userStocks, portfolioValue, percentCash });
    } catch (error) {
        console.log(error);
        res.status(404).json({msg:error.message});
    }
}

export const computeAndStoreDailyPortfolio = async (userId) => {
    console.log('computeAndStoreDailyPortfolio is called...');
    try {
        const { user, portfolioValue } = await computeUserPortfolio(userId);
        const dailyValue = portfolioValue + Number(user.cash);

        const existingRecord = await getCurrentPortfolioValueForDate(userId, new Date());
        const currentDate = new Date();
        const currentTime = currentDate.toTimeString().split(' ')[0];

        if (existingRecord) {
            await updatePortfolioValueForDate(userId, currentDate, dailyValue, currentTime);
        } else {
            await insertNewPortfolioValueForDate(userId, currentDate, dailyValue, currentTime);
        }
    } catch (error) {
        console.error(`Error storing daily portfolio for user ${userId}:`, error);
    }
}


//Daily Porftolio 

// export const computeAndStoreDailyPortfolio = async (userId) => {

//     console.log('computeAndStoreDailyPortfolio is called...')

//     const fetchStockPrice = async (symbol) => {
//         let stockCurrentPrice = null;
//         console.log('Refresh current price')
//         const options = {
//             method: 'GET',
//             url: `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.ACCESS_KEY_TWELVE}`
//         };
//         try {
//             const response = await axios.request(options);
//             console.log(`Fetching price from 12 ${symbol}...`);
//             stockCurrentPrice = parseFloat(response.data.price);
//             return stockCurrentPrice;
//         } catch (error) {
//             console.error(error);
//             return 0; // Return 0 if the price couldn't be fetched
//         }
//     };
    

//     try {
//         const transactions = await getTransactionForUser(userId);
//         const user = await getUserById(userId);

//         let currentPortfolio = {
//             cash: Number(user.cash),
//             stocks: {}
//         };
//         console.log('Cash', currentPortfolio.cash)

//         transactions.forEach(trx => {
//             // const price = Number(trx.price);
//             const quantity = Number(trx.quantity);
            
//             if (trx.transactiontype === 'BUY') {
//                 if (!currentPortfolio.stocks[trx.stockid]) {
//                     currentPortfolio.stocks[trx.stockid] = {
//                         quantity: 0,
//                         // totalCost: 0
//                     };
//                 }
//                 currentPortfolio.stocks[trx.stockid].quantity += quantity;
//                 // currentPortfolio.stocks[trx.stockid].totalCost += price * quantity;
//             } else { // SELL
//                 if (!currentPortfolio.stocks[trx.stockid]) {
//                     console.error(`Attempting to sell stock ${trx.stockid} which isn't in the portfolio.`);
//                     return;  // Skip this iteration of the loop
//                 }
//                 currentPortfolio.stocks[trx.stockid].quantity -= quantity;
//                 // currentPortfolio.stocks[trx.stockid].totalCost -= price * quantity;
//             }
//         });

//         let dailyValue = Number(currentPortfolio.cash);

//         for (let stockId in currentPortfolio.stocks) {
//             let stockPriceToday = 0;
//             stockPriceToday = await fetchStockPrice(stockId);
//             dailyValue += Number(stockPriceToday * currentPortfolio.stocks[stockId].quantity);
//         }

//         // Check if a record for today already exists
//         const existingRecord = await getCurrentPortfolioValueForDate(userId, new Date());
//         const currentDate = new Date();
//         const currentTime = currentDate.toTimeString().split(' ')[0];

//         if (existingRecord) {
//             await updatePortfolioValueForDate(userId, currentDate, dailyValue, currentTime);
//         } else {
//             await insertNewPortfolioValueForDate(userId, currentDate, dailyValue, currentTime);
//         }

//     } catch (error) {
//         console.error(`Error storing daily portfolio for user ${userId}:`, error);
//     }
// }


export const getPortfolioChartData = async (req, res) => {
    const { userId } = req.params;

    try {
        const portfolioValues = await getDailyPortfolioValues(userId);
        res.status(200).json(portfolioValues);
    } catch (error) {
        console.error("Error fetching daily portfolio data:", error);
        res.status(500).json({msg: 'Server error while fetching portfolio data'});
    }
}


// Initial controllers


export const _register = async (req, res) => {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password + "", salt);

    try {
        const row = await register(username, hash );
        
        const userPayload = {
            id: row[0].id,
            username: row[0].username
        };

        const currentDate = new Date();
        const currentTime = currentDate.toTimeString().split(' ')[0];

        await insertNewPortfolioValueForDate(userPayload.id, currentDate, row[0].cash, currentTime);
        
        const token = jwt.sign(userPayload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '12h' });
        res.status(200).json({ token, user: userPayload });
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
        await computeAndStoreDailyPortfolio(row[0].id);

        const userPayload = {
            id: row[0].id,
            username: row[0].username
        };
        
        const token = jwt.sign(userPayload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '12h' });
        res.status(200).json({ token, user: userPayload });

    } catch (error) {
        console.log(error);
        res.status(404).json({msg: 'Some error occured'});
    }
}


export const _createTransaction = async (req, res) => {
    try {
        const newTransaction = await createTransaction(req.body);

        await computeAndStoreDailyPortfolio(req.body.userid);

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

// export const _portfolio = async (req, res) => {
//     const { userid } = req.params;
//     if (!userid) {
//         return res.status(400).json({ msg: 'User ID is missing' });
//     }
//     try {
//         const user = await getUserById(userid);
//         const transactions = await getTransactionForUser(userid);

//         let userStocks = [];
//         transactions.forEach((item) => {
//             let stockObject = userStocks.find(stock => stock.symbol === item.stockid);

//             if (!stockObject) {
//                 stockObject = { exchange: item.exchange, name: item.company_name, symbol: item.stockid, quantity: 0, price: 0, stockValue: 0 };
//                 userStocks.push(stockObject);
//             }

//             if (item.transactiontype === 'BUY'){
//                 stockObject.quantity += item.quantity;
//                 stockObject.totalCost += item.quantity * item.price;
//             } else {
//                 stockObject.quantity -= item.quantity;
//                 stockObject.totalCost -= item.quantity * item.price;
//             }

//             userStocks = userStocks.filter(item => item.quantity !== 0);
//         });

//         const fetchStockPrice = async (symbol) => {
//             let stockCurrentPrice = null;
//             console.log(`Refresh current price ${symbol}`)
//             const options = {
//                 method: 'GET',
//                 url: `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.ACCESS_KEY_TWELVE}`
//             };
//             try {
//                 const response = await axios.request(options);
//                 stockCurrentPrice = parseFloat(response.data.price);
//                 return stockCurrentPrice;
//             } catch (error) {
//                 console.error(error);
//                 return 0; // Return 0 if the price couldn't be fetched
//             }
//         };

//         const fetchPrices = userStocks.map(async item => {
//             item.price = await fetchStockPrice(item.symbol);
//             item.stockValue = item.price * item.quantity;
//             return item;
//         });
        
//         const stockValues = await Promise.all(fetchPrices);
        
//         const portfolioValue = stockValues.reduce((acc, currValue) => acc + currValue.stockValue, 0);

//         const percentCash = (parseFloat(user.cash) / (parseFloat(user.cash) + parseFloat(portfolioValue))) * 100;

//         res.json({ user, transactions, userStocks, portfolioValue, percentCash });

//     } catch (error) {
//         console.log(error);
//         res.status(404).json({msg:error.message});
//     }
// }

export const _buy = async (req, res) => {
    try {
        const {userid, company_name, symbol, quantity, price, exchange} = req.body
        const user = await getUserById(userid);
        
        if (quantity * price > user.cash) {
            return res.status(400).json({ message: 'Sorry ☝️'});
        }
        if (quantity <= 0) {
            return res.status(400).json({ message: 'Please input amount' });
        }

        const newCash = parseFloat(user.cash) - quantity * price;
        await updateUserCash(userid, newCash);

        const newTrx = await createTransaction({ userid, company_name, stockid: symbol, price, quantity, transactiontype: 'BUY', exchange });
        
        res.status(200).json(newTrx);

    } catch (error) {
       console.log(error);
       res.status(500).json({msg: 'Server error on BUY'});
    }
}

export const _sell = async (req, res) => {
    try {
        const { userid, company_name, symbol, quantity, price, exchange } = req.body
        const user = await getUserById(userid);

        const userStockTransactions = await getTransactionByUserByStock(userid, symbol);
        const userStockQuantity = userStockTransactions.reduce((total, transaction) => total + (transaction.transactiontype === 'BUY' ? transaction.quantity : -transaction.quantity), 0);

        if (quantity > userStockQuantity) {
            return res.status(400).json({ message: 'Sorry ☝️' });
        }

        if (quantity <= 0) {
            return res.status(400).json({ message: 'Please input amount' });
        }

        const newCash = parseFloat(user.cash) + quantity * price;
        await updateUserCash(userid, newCash);

        const newTrx = await createTransaction({ userid, company_name, stockid:symbol, price, quantity, transactiontype: 'SELL', exchange });

        res.status(200).json(newTrx);

    } catch (error) {
       console.log(error);
       res.status(500).json({msg: 'Server error on SELL'});
    }
}

