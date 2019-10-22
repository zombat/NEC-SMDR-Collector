/*
	Mongo functions.
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
		mongoClient = require(`./mongoClient.js`);
 
 module.exports = {
	 
	serverStatus: (callback) => {
		try {
			mongoClient( (err, client) => { 
			if(err){
				callback(false);
			} else {
				client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).findOne( (err, response) => {
					if(response){
						callback(true);
					} else {
						callback(false);
					}
				});
			}
			});
		} catch {
			callback(false);
		}
	},
	 
	insertSMDRRecord: (smdrRecord, callback) => {
		smdrRecord[`_id`] = smdrRecord.RawSMDR;
		mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).insertOne( smdrRecord, (err, response) => {
				//
				if(err){
					
				}
				if(response == null) {
					callback(`Not inserted`);
				} else {
					callback(response.result);		
				}		
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