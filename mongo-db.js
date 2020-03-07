/*
	Mongo s.
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
		 mongoClient((err, client) => {
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
		mongoClient((err, client) => {
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
				client.db(process.env.MONGO_DATABASE).admin().serverStatus((err, status) => {
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
		mongoClient((err, client) => {
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).insertOne( smdrRecord, (err, response) => {
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else if(response != undefined) {
					callback(response.result);		
				} else {
					callback(err);
				}
			});
		});
	},
	
	insertBufferRecord: (deviceNumber, rawSMDR, callback) => {
		mongoClient((err, client) => {
			var id = rawSMDR.replace(/\s/g,``);
			client.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).insertOne( { '_id' : id, 'RawSMDR' : rawSMDR }, (err, response) => {
				if(err && err.hasOwnProperty(`errmsg`)){
					callback(err.errmsg);
				} else if(response != undefined) {
					callback(response.result);		
				} else {
					callback(err);
				}
			});
		});
	},
	
	getBufferRecords: (deviceNumber, callback) => {
		mongoClient((err, client) => { 
			client.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).find({}).limit(64).toArray((err, response) => {
				if(!err && response.length){
					var stringOfData = {
						'RawSMDR' : '',
						'IdArray' : []
					};
					response.forEach((record) => {
						stringOfData.RawSMDR += record.RawSMDR;
						stringOfData.IdArray.push(record._id);
					});
					callback(stringOfData);
				} else {
					callback(null);
				}
			});
		});
	},
	
	getBufferRecord: (deviceNumber, callback) => {
		mongoClient((err, client) => { 
			client.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).findOne({}, { '_id': 0 }, (err, response) => {
				callback(response);
			});
		});
	},
	
	deleteBufferRecord: (deviceNumber, id, callback) => {
		mongoClient((err, client) => { 
			client.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).deleteOne({ '_id' : id }, (err, response) => {
				callback(response);
			});
		});
	},
	
	populateHistoricData: (deviceNumber, callback) => {
		mongoClient((err, client) => {
			var mongoCursor = 	client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find( { RawSMDR : { $exists: true }});
			var recordCount = mongoCursor.count();
			mongoCursor.batchSize(20);
			recordCount.then((recordCount) => {
				console.log(`Found ` + recordCount + ` records for device ` + deviceNumber + ` buffer`);
				mongoCursor.forEach( (smdrRecord) => {
					bufferRecord = {
						'_id' : smdrRecord._id,
						'RawSMDR': smdrRecord.RawSMDR
					};
					client.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).insertOne( bufferRecord, (err, response) => {
						if(err && err.hasOwnProperty(`errmsg`)){
							callback(err.errmsg);
						} else if(response != undefined) {
							callback(response.result);		
						} else {
							callback(err);
						}
						recordCount--;
						if(recordCount == 0){
							callback(`Buffer data ready`);
						}
					});
				});
			});	
		});
	},
	
	updateSMDRRecord: (smdrRecord, callback) => {
		mongoClient((err, client) => {
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
		mongoClient((err, client) => {
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
		mongoClient((err, client) => {
			var dateString = smdrRecord.CallTime.Start.Year + `-` + smdrRecord.CallTime.Start.Month + `-` + smdrRecord.CallTime.Start.Day + `T` + smdrRecord.CallTime.Start.Hour + `:` + smdrRecord.CallTime.Start.Minute + `:` + smdrRecord.CallTime.Start.Second + `:` + smdrRecord.CallTime.Start.Millisecond;
			client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).updateOne( { '_id': smdrRecord.RawSMDR }, { $set: { $dateFromString: {'dateString': dateString } } }, (err, response) => {
				assert.equal(null, err);
				callback(response);		
			});
		});
	}
	
 }