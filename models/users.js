import { db } from '../config/db.js';

export const getUserById = (id) => {
    return db('users').where({id}).first();
}

export const register = (username, password) => {
    return db('users')
    .insert({username, password})
    .returning(['id', 'username'])
}

export const login = (username) => {
    return db('users')
    .select('id', 'username', 'password', 'cash')
    .where({username})
}


export const createTransaction = (transaction) => {
    return db('transactions')
    .insert(transaction)
    .returning(['id', 'stockid', 'price', 'quantity', 'transactiontype', 'timestamp']);
}

export const getTransactionForUser = (userid) => {
    return db('transactions')
    .where({userid})
    .orderBy('timestamp', 'desc');
};

export const getTransactionByUserByStock = (userid, stockid) => {
    return db('transactions')
    .where({userid, stockid})
    .orderBy('timestamp', 'desc');
};

export const updateUserCash = (id, newCash) => {
    return db('users')
    .where({id})
    .update({cash: newCash});
}
