/*
	Mongo functions.
*/
require(`dotenv`).config();
const	assert = require(`assert`),
		mongoClient = require(`./mongoClient.js`);
 
 module.exports = {
	insertSMDRRecord: (smdrRecord, callback) => {
		smdrRecord[`_id`] = smdrRecord.RawSMDR;
		mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).insertOne( smdrRecord, (err, response) => {
				//assert.equal(null, err);
				callback(response);						
			});
		});
	},
	
	createDates: (smdrRecord, callback) => {
		mongoClient(function(err, client){
			var dateString = smdrRecord.CallTime.Start.Year + `-` + smdrRecord.CallTime.Start.Month + `-` + smdrRecord.CallTime.Start.Day + `T` + smdrRecord.CallTime.Start.Hour + `:` + smdrRecord.CallTime.Start.Minute + `:` + smdrRecord.CallTime.Start.Second + `:` + smdrRecord.CallTime.Start.Millisecond;
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).updateOne( { '_id': smdrRecord.RawSMDR }, { $set: { $dateFromString: {'dateString': dateString } } }, (err, response) => {
				assert.equal(null, err);
				callback(response);		
			});
		});
	}
	
 }