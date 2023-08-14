import { db } from "../config/db.js";

export const getUserById = (id) => {
  return db("users").where({ id }).first();
};

export const register = (username, password) => {
  return db("users")
    .insert({ username, password })
    .returning(["id", "username", "cash"]);
};

export const login = (username) => {
  return db("users")
    .select("id", "username", "password", "cash")
    .where({ username });
};

export const createTransaction = (transaction) => {
  return db("transactions")
    .insert(transaction)
    .returning([
      "id",
      "company_name",
      "stockid",
      "price",
      "quantity",
      "transactiontype",
      "timestamp",
      "exchange",
    ]);
};

export const getTransactionForUser = (userid) => {
  return db("transactions").where({ userid }).orderBy("timestamp", "desc");
};

export const getTransactionByUserByStock = (userid, stockid) => {
  return db("transactions")
    .where({ userid, stockid })
    .orderBy("timestamp", "desc");
};

export const updateUserCash = (id, newCash) => {
  return db("users").where({ id }).update({ cash: newCash });
};


// Daily Portfolio

export const getCurrentPortfolioValueForDate = async (userId, date) => {
  const existingRecord = await db("daily_portfolio")
    .where({
      user_id: userId,
      date,
    })
    .first();
  return existingRecord;
};

export const updatePortfolioValueForDate = async (userId, date, value, time) => {
  return await db("daily_portfolio")
    .where({
      user_id: userId,
      date,
    })
    .update({
      value,
      time
    });
};

export const insertNewPortfolioValueForDate = async (userId, date, value, time) => {
  return await db("daily_portfolio").insert({
    user_id: userId,
    date,
    value,
    time
  });
};

export const getDailyPortfolioValues = (userId) => {
  return db("daily_portfolio")
    .select("date", "value", "time")
    .where({ user_id: userId })
    .orderBy("date", "asc");
};
