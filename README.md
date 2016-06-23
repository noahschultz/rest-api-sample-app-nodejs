# Rest API Sample app in Node.js

## Overview

This is a simple pizza store app that allows you to explore the features provided by PayPal's REST APIs. Specfically, you can learn how to
	
   * Save a credit card with paypal for future payments.
   * Make a payment using a saved credit card id.
   * Make a payment using paypal as the payment method. 

## Prerequisites

   * Node V0.8+
   * MongoDB server
   
## Setting up the app

   * Run `npm install` at the root folder to download dependencies.
   * Make sure Mongo server is running. After following [instructions to install](http://docs.mongodb.org/manual/installation/), you can start it by sudo mongod which starts at localhost:27017 with default configurations. The app creates a database called `paypal_pizza` by default.
   * Run `node app.js` to start the application.
   * Navigate to http://localhost:3000/ in your favourite browser.

## Configuration

   Please see `config.json` in the root folder if you want to change the default application / mongo settings.
   
## References 

   * Github repository for Node.js REST API SDK - https://github.com/paypal/rest-api-sdk-nodejs
