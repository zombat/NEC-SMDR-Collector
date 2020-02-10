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
	 getDeviceName: (deviceExtension, callback) => {
		 mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(`Device Information`).findOne( { "_id" : deviceExtension }, (err, document) => {
				console.log(document);
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else {
					callback(document);		
				}		
			});
		});
	 },
	
	getNotifyInfo: (callback) => {
		mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(`Notification Settings`).find({}).toArray((err, documents) => {
					assert.equal(null, err);
					callback(documents);		
				});
		});
	},
	
	serverStatus: (callback) => { 
		try {
			mongoClient( (err, client) => { 
			if(err){
				callback(false);
			} else {
				client.db(process.env.MONGO_DATABASE).admin().serverStatus(function(err, status) {
					if(err){
						console.log(err);
						console.log(`Did you create the MongoDB user correctly?`);
					} else if(status.ok){
						callback(true);
					} else {
						callback(false);
					}
					client.close();
				});
			}
			});
		} catch {
			callback(false);
		}
	},
	 
	insertSMDRRecord: (smdrRecord, callback) => {
		smdrRecord[`_id`] = smdrRecord.RawSMDR.replace(/\s/g,``);
		mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).insertOne( smdrRecord, (err, response) => {
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else {
					callback(response.result);		
				}		
			});
		});
	},
	
	updateSMDRRecord: (smdrRecord, callback) => {
		mongoClient(function(err, client){
			var id = smdrRecord.RawSMDR.replace(/\s/g,``);
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).updateOne( { '_id' : id }, { '$set' : smdrRecord }, (err, response) => {
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else {
					callback(response.result);		
				}		
			});
		});
	},
	
	getRecords: ( skipAmount, callback) => {
		mongoClient(function(err, client){
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find({}).skip(skipAmount).toArray( (err, documents) => {
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else {
					callback(documents);		
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