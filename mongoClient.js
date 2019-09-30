/*
	Mongo connection information
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