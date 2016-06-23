/* Copyright 2013 PayPal */
"use strict";

var mongo = require('mongoskin'),
	crypto = require('crypto');


module.exports = function (config) {

	var USERS_COLLECTION = 'users',
		ORDERS_COLLECTION = 'orders',
		salt = 'supersecretkey',
		db;

	function encryptPassword(password) {
		return crypto.createHmac('sha1', salt).update(password).digest('hex');
    }

	return {
		configure: function (config) {
			db = mongo.db((config ? config : 'mongodb://localhost:27017/paypal_pizza'), {w : 1});
		},
		createUser: function (emailId, password, cardId, callback) {
			db.collection(USERS_COLLECTION).count({email : emailId}, function (err, count) {
				if (err) {
					console.log("error creating user:" + err);
					callback(new Error(err));
				} else if (count !== 0) {
					console.log(emailId + " already exists");
					callback(new Error(emailId + " already exists"));
				} else {
					db.collection(USERS_COLLECTION).insert({email: emailId, password: encryptPassword(password), card: cardId}, function (err, result) {
					    if (err) {
							console.log("User insertion error: " + err);
							callback(new Error(err));
					    } else {
							callback(null, "User created");
					    }
					});
				}
			});
		},
		authenticateUser: function (emailId, password, callback) {
			db.collection(USERS_COLLECTION).count({email : emailId, password: encryptPassword(password)}, function (err, count) {
				if (err) {
					console.log("error authenticating user: " + err);
					callback(new Error(err));
				} else if (count === 0) {
					callback(new Error("emailid/password did not match"));
				} else {
					callback(null);
				}
			});
		},
		getUser: function (emailId, callback) {
			db.collection(USERS_COLLECTION).findOne({email : emailId}, function (err, user) {
				if (err) {
					console.log("error retrieving user:" + err);
					callback(new Error(err));
				} else {
					console.log(user);
					callback(null, user);
				}
			});
		},
		updateUser: function (emailId, password, cardId, callback) {
			var data = {};
			if (password !== undefined && password !== null) {
				data.password = encryptPassword(password);
			}
			if (cardId !== undefined && cardId !== null) {
				data.card = cardId;
			}
			db.collection(USERS_COLLECTION).update({email : emailId}, {$set: data}, function (err, result) {
				if (err) {
					console.log("error updating user:" + err);
					callback(new Error(err));
				} else {
					db.collection(USERS_COLLECTION).findOne({email: emailId}, function (err, user) {
						if (err) {
							console.log("error retrieving user:" + err);
							callback(new Error(err));
						} else {
							console.log(user);
							callback(null, user);
						}
					});
				}
			});
		},
		insertOrder: function (order_id, user_id, payment_id, state, amount, description, created_time, callback) {
            db.collection(ORDERS_COLLECTION).insert({order_id : order_id, user_id : user_id, payment_id : payment_id, state : state, amount : amount, description: description, created_time : created_time}, function (err, result) {
				if (err) {
					console.log("Order insertion error: " + err);
					callback(new Error(err));
				} else {
					callback(null, result);
				}
			});
		},
		updateOrder: function (order_id, state, created_time, callback) {
            db.collection(ORDERS_COLLECTION).update({order_id : order_id}, {$set : {created_time : created_time, state : state}}, function (err, update) {
                if (err) {
                    console.log("Order insertion error: " + err);
                    callback(new Error(err));
				}
                else {
                    console.log("Order insertion : " + update);
					callback(null, update);
				}
            });
		},
		getOrders: function (emailId, callback) {
			db.collection(ORDERS_COLLECTION).find({user_id : emailId}, {limit : 10, sort : [['created_time', -1]]}, function (err, orders) {
				if (err) {
					console.log("error retrieving order:" + err);
					callback(new Error(err));
				} else {
	                orders.toArray(function (err, orderItem) {
	                    console.log(" ... " + orderItem);
	                    callback(err, orderItem);
					});
                }
            });
		},
        getOrder: function (order_id, callback) {
	        db.collection(ORDERS_COLLECTION).findOne({order_id : order_id}, function (err, order) {
				if (err) {
					console.log("error retrieving order:" + err);
					callback(new Error(err));
				} else {
					console.log(order);
					callback(null, order);
				}
            });
		}
	};
};