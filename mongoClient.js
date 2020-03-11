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
		mongoClient = require(`mongodb`).MongoClient;

var mongoDB = {};

function connect(callback){
	if(process.env.MONGO_USER != `` && process.env.MONGO_PASSWORD != ``){
		 var mongoURL = process.env.MONGO_URL.replace(/<username>/, process.env.MONGO_USER)
		 mongoURL = mongoURL.replace(/<password>/, process.env.MONGO_PASSWORD)
	} else {
		  var mongoURL = process.env.MONGO_URL.replace(/<username>:<password>@/, process.env.MONGO_USER)
	}
    mongoClient.connect(mongoURL, { 'useNewUrlParser': true, 'useUnifiedTopology': true }, (err, db) => {
        mongoDB = db;
        callback();
    });
}
function get(){
    return mongoDB;
}

function close(){
    mongoDB.close();
}

module.exports = {
    connect,
    get,
    close
};