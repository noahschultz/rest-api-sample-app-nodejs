/* Copyright 2013 PayPal */
"use strict";

var db = require('../lib/db')();
var paypal = require('paypal-rest-sdk');
var uuid = require('node-uuid');
var config = {};
// Index page
exports.index = function (req, res) {
	res.locals.session = req.session;
	var error = req.flash('error');
	var message = error.length > 0 ? error[0].message : error;
	res.render('index', {message: message});
};

// Authentication middleware
exports.auth = function (req, res, next) {
	if (req.session.authenticated) {
        next();
    } else {
        res.redirect('signin');
    }
};

exports.signup = function (req, res) {
	res.locals.session = req.session;
	res.render('sign_up', {});
};

exports.completesignup = function (req, res) {
	res.locals.session = req.session;
	var user = req.body.user;
	var userCard = user.credit_card;

	if (user.password !== user.password_confirmation) {
		res.render('sign_up', {message: [{desc: "Passwords do not match", type: "error"}]});
	} else {
		//TODO: Add card validation		
		var card = {type: userCard.type, number: userCard.number, cvv2: userCard.cvv2, expire_month: userCard.expire_month, expire_year: userCard.expire_year };

		paypal.credit_card.create(card, {}, function (err, card) {
			var cardId = (err) ? "" : card.id;
			db.createUser(user.email, user.password, cardId, function (dbErr, response) {
				if (dbErr) {
					res.render('sign_up', {message: [{desc: dbErr.message, type: "error"}]});
				} else {
					req.session.authenticated = true;
					req.session.email = user.email;
					if (err && (userCard.type !== '' || userCard.number !== '')) {
						console.log("card creation error: " + JSON.stringify(err.error.details));
						req.flash('error', {message: [{desc: "You have been signed up but we had trouble saving your credit card.", type: "error"}]});
					} else {
						req.flash('error', {message: [{desc: "You have been signed up successfully", type: "info"}]});
					}
					res.redirect('');
				}
			});
		});
	}
};


exports.signin = function (req, res) {
	res.locals.session = req.session;
	var error = req.flash('error');
	var message = error.length > 0 ? error[0].message : error;
	res.render('sign_in', {message: message});
};


exports.dologin = function (req, res) {
	res.locals.session = req.session;

	var user = req.body.user;
	db.authenticateUser(user.email, user.password, function (err, response) {
		if (err) {
			req.flash('error', { message : [{desc: err.message, type: "error"}]});
			res.redirect('signin');
		} else {
			req.session.authenticated = true;
			req.session.email = user.email;
			res.render('index', {});
		}
	});
};

exports.signout = function (req, res) {
	res.locals.session = req.session;
	req.session.authenticated = false;
	req.session.email = '';
	req.flash('error', { message : [{desc: "You have been signed out.", type: "info"}]});
	res.redirect('/');
};


exports.profile = function (req, res) {
	res.locals.session = req.session;
	db.getUser(req.session.email, function (err, user) {
		if (err || !user) {
			console.log(err);
			res.render('profile', { message: [{desc: "Could not retrieve profile information", type: "error"}]});
		} else {
			if (!user.card) {
				res.render('profile', {user: user});
			} else {
				paypal.credit_card.get(user.card, {}, function (err, card) {
					if (err) {
						console.log(err);
						res.render('profile', {user: user, message: [{desc: "Could not retrieve card information", type: "error"}]});
					} else {
						res.render('profile', {user: user, card: card});
					}
				});
			}
		}
	});
};

exports.updateprofile = function (req, res) {
	res.locals.session = req.session;
	var userData = req.body.user,
		cardData = userData.credit_card,
		data = {},
		newPassword,
		newCard;

	db.authenticateUser(req.session.email, userData.current_password, function (authErr, authRes) {
		db.getUser(req.session.email, function (userErr, savedUser) {
			paypal.credit_card.get(savedUser.card, {}, function (cardErr, card) {

				data.user = (userErr) ? {} : savedUser;
				data.card = (cardErr) ? {} : card;
				if (authErr) {
					data.message = [{ desc: "Your current password is incorrect", type: "error"}];
					res.render('profile', data);
				} else {
					if (userData.password !== '') {
						if (userData.password !== userData.password_confirmation) {
							data.message = [{ desc: "Your passwords do not match", type: "error"}];
							res.render('profile', data);
						} else {
							newPassword = userData.password;
						}
					}
					if (cardData.type !== '' || cardData.number !== '') {
						card = {type: cardData.type, number: cardData.number, cvv2: cardData.cvv2, expire_month: cardData.expire_month, expire_year: cardData.expire_year };
						paypal.credit_card.create(card, {}, function (err, card) {
							if (err) {
								console.log("card creation error: " + JSON.stringify(err.error.details));
								data.message = [{ desc: "Error saving card information: " + err.message, type: "error"}];
								if (newPassword !== null) {
									data.message.push({ desc: "Your password has not been updated.", type: "block"});
								}
								res.render('profile', data);
							} else {
								newCard = card.id;
								var messages;
								db.updateUser(userData.email, newPassword, newCard, function (err, user) {
									if (err) {
										messages = [{ desc: "Error updating profile: " + err, type: "error"}];
									} else {
										data.card = card;
										data.user = user;
										messages = [{ desc: "Your profile has been updated", type: "info"}];
									}
									data.message = messages;
									res.render('profile', data);
								});
							}
						});
					} else {
						db.updateUser(userData.email, newPassword, newCard, function (err, user) {
							if (err) {
								data.message = [{ desc: "Error updating profile: " + err, type: "error"}];
							} else {
								data.user = user;
								data.message = [{ desc: "Your profile has been updated", type: "info"}];
							}
							res.render('profile', data);
						});
					}
				}
			});
		});
	});
};

exports.orderconfirm = function (req, res) {
    res.locals.session = req.session;
    var amount = req.query.orderAmount,
        desc   = req.query.orderDescription;
    req.session.amount = amount;
    req.session.desc = desc;

	db.getUser(req.session.email, function (err, user) {
		var data = {'amount' : amount, 'desc' : desc};
		console.log(user.card);
		if (!err && (user.card !== undefined && user.card !== '')) {
			data.credit_card = 'true';
		}
		res.render('order_confirm', data);
	});
};

exports.order = function (req, res) {

	res.locals.session = req.session;
    var order_id = uuid.v4();

    if (req.query.order_payment_method === 'credit_card')
    {
        var payment = {
	        "intent": "sale",
	        "payer": {
	            "payment_method": "credit_card",
	            "funding_instruments": [{
	                "credit_card_token": {}
	            }]
	        },
	        "transactions": [{
	            "amount": {
	                "currency": "USD"
	            },
	            "description": "This is the payment description."
	        }]
	    };

		db.getUser(req.session.email, function (err, user) {
			if (err || !user) {
				console.log(err);
				res.render('order_detail', { message: [{desc: "Could not retrieve user information", type: "error"}]});
			} else {
				payment.payer.funding_instruments[0].credit_card_token.credit_card_id = user.card;
				payment.transactions[0].amount.total = req.query.order_amount;
				payment.transactions[0].description = req.session.desc;
				paypal.payment.create(payment, {}, function (err, resp) {
					if (err) {
                        console.log(err);
                        res.render('order_detail', { message: [{desc: "Payment API call failed", type: "error"}]});
					}
					if (resp) {
					    db.insertOrder(order_id, req.session.email, resp.id, resp.state, req.session.amount, req.session.desc, resp.create_time, function (err, order) {
							if (err || !order) {
								console.log(err);
								res.render('order_detail', { message: [{desc: "Could not save order details", type: "error"}]});
							} else {
								db.getOrders(req.session.email, function (err, orderList) {
									console.log(orderList);
									res.render('order_detail', {orders : orderList, message: [{desc: "Order placed successfully.", type: "info"}]});
								});
							}
						});
					}
				});
			}
		});
	} else if (req.query.order_payment_method === 'paypal') {
		var paypalPayment = {
	        "intent": "sale",
	        "payer": {
	            "payment_method": "paypal"
	        },
	        "redirect_urls": {},
	        "transactions": [{
		        "amount": {
			        "currency": "USD"
		        }
	        }]
	    };

		console.log(config);
	    paypalPayment.transactions[0].amount.total = req.query.order_amount;
	    paypalPayment.redirect_urls.return_url = "http://localhost:" + (config.port ? config.port : 3000) + "/orderExecute?order_id=" + order_id;
	    paypalPayment.redirect_urls.cancel_url = "http://localhost:" + (config.port ? config.port : 3000) + "/?status=cancel&order_id=" + order_id;
	    paypalPayment.transactions[0].description = req.session.desc;
	    paypal.payment.create(paypalPayment, {}, function (err, resp) {
		    if (err) {
		        res.render('order_detail', { message: [{desc: "Payment API call failed", type: "error"}]});
		    }

			if (resp) {
				var now = (new Date()).toISOString().replace(/\.[\d]{3}Z$/, 'Z ');
				db.insertOrder(order_id, req.session.email, resp.id, resp.state, req.session.amount, req.session.desc, now, function (err, order) {
					if (err || !order) {
						console.log(err);
						res.render('order_detail', { message: [{desc: "Could not save order details", type: "error"}]});
					} else {
						var link = resp.links;
						for (var i = 0; i < link.length; i++) {
							if (link[i].rel === 'approval_url') {
								res.redirect(link[i].href);
							}
						}
					}
				});
			}
		});
	}
};

exports.orderExecute = function (req, res) {
    res.locals.session = req.session;
    db.getOrder(req.query.order_id, function (err, order) {
        var payer = { payer_id : req.query.PayerID };
        paypal.payment.execute(order.payment_id, payer, {}, function (err, resp) {
            if (err) {
                console.log(err);
				res.render('order_detail', { message: [{desc: "execute payment API failed", type: "error"}]});
            }
            if (resp) {
                db.updateOrder(req.query.order_id, resp.state, resp.create_time, function (err, updated) {
                    if (err) {
	                    console.log(err);
	                    res.render('order_detail', { message: [{desc: "Could not update order information", type: "error"}]});
                    } else {
                        console.log(updated);
                        db.getOrders(req.session.email, function (err, orderList) {
                            res.render('order_detail', {'orders' : orderList, message: [{desc: "Order placed successfully.", type: "info"}]});
                        });
                    }
                });
            }
        });
    });
};

exports.orderList = function (req, res) {
    res.locals.session = req.session;
	db.getOrders(req.session.email, function (err, orderList) {
		if (err) {
			console.log(err);
			res.render('order_detail', { message: [{desc: "Could not retrieve order details", type: "error"}]});
		} else {
			res.render('order_detail', {
				'orders' : orderList
			});
		}
	});
};

exports.init = function (c) {
	config = c;
	paypal.configure(c.api);
	db.configure(c.mongo);
};
