/*
	Mongo connection information
*/

/*
		This program is free software. It comes without any warranty, and is offered “as-is”, without warranty. The software user accepts all liability for damages resulting in the use of this software.
		All trademarks are the property of their respective owners.
		No agreement has been made between any party to ensure support of this project. Any connectivity issues should be investigated with your authorized support representative.
		To the extent permitted by applicable law.

		GNU GENERAL PUBLIC LICENSE
        Version 3, 29 June 2007
		
		See LICENSE file for more information.
*/

require(`dotenv`).config();
const	assert = require(`assert`),
		mongo = require(`mongodb`).MongoClient;
var mongoUri = ``;

if (process.env.MONGO_PASSWORD && process.env.MONGO_USER){
	mongoUri = `mongodb://` + process.env.MONGO_USER + `:` + process.env.MONGO_PASSWORD + `@` + process.env.MONGO_URI;
} else {
	mongoUri = `mongodb://` + process.env.MONGO_URI;
}

		
module.exports = (callback) => {

    var mongoClient = require(`mongodb`).MongoClient;
    mongoClient.connect(mongoUri,{ useNewUrlParser: true, useUnifiedTopology: true }, callback);
	
};