/*
	Database functions.
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
		helperFunctions = require(`./helper-functions.js`);
 
 module.exports = {
	 dropDatabase: (databaseName, clientSession, callback) => {
		 clientSession.db(databaseName).dropDatabase( (err, result) => {
			 callback(result);
		 });
	 },
	 
	 getDeviceName: (deviceExtension, clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(`Device Information`).findOne( { "_id" : deviceExtension }, (err, document) => {
			console.log(document);
			if(err && err.hasOwnProperty(`errmsg`)){
				callback(err.errmsg);
			} else {
				callback(document);		
			}		
		});
	 },
	
	getNotifyInfo: (clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(`Notification Settings`).find({}).toArray((err, documents) => {
				assert.equal(null, err);
				callback(documents);		
		});
	},
	
	serverStatus: (clientSession, callback) => { 
		clientSession.db(process.env.MONGO_DATABASE).admin().serverStatus((err, status) => {
			if(err){
				console.log(err);
				console.log(`Did you create the MongoDB user correctly?`);
				process.exit(1);
			} else if(status.ok){
				callback(true);
			} else {
				callback(false);
			}
		});
	},
	 
	insertSMDRRecord: (smdrRecord, clientSession, callback) => {
		smdrRecord[`_id`] = smdrRecord.RawSMDR.replace(/\s/g,``);
		clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).insertOne( smdrRecord, (err, response) => {
			if(err && err.hasOwnProperty(`errmsg`)){
				callback(err.errmsg);
			} else if(response != undefined) {
				callback(response.result);		
			} else {
				callback(err);
			}
		});
	},
	
	incrementCallCount: (smdrRecord, clientSession, callback) => {
		if(process.env.LOGGING_LEVEL_5 == `true`){
			helperFunctions.logMessage(`other`, `SMDR Record - Stats Function`, JSON.stringify(smdrRecord));
		}
		if(smdrRecord.RecordTypeCode == `KA` || smdrRecord.RecordTypeCode == `KH` || smdrRecord.RecordTypeCode == `KK`){
			if(process.env.LOGGING_LEVEL_4 == `true`){
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, `KA/KH/KK - Outbound Record incrementCallCount`);
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, JSON.stringify(smdrRecord.CallingPartyInformation) );
			}
			var callingNumber = ``;
			if(smdrRecord.CallingPartyInformation.PhysicalNumber.hasOwnProperty(`CallingNumber`)){
				callingNumber = smdrRecord.CallingPartyInformation.PhysicalNumber.CallingNumber;
			}
			if(process.env.USE_PHYSICAL_NUMBER == `false` && smdrRecord.CallingPartyInformation.TelephoneNumber.hasOwnProperty(`LogicalNumber`)){
				callingNumber = smdrRecord.CallingPartyInformation.TelephoneNumber.LogicalNumber;
			}
			if(callingNumber != `` && callingNumber != null && callingNumber != undefined){
			helperFunctions.logMessage(`out`, `Stat Update`, `Updating outbound stats for extension: ` + callingNumber);
				clientSession.db(`Device-Stats`).collection(`Monthly-Counts-` + smdrRecord.CallTime.End.Year + `-` + smdrRecord.CallTime.End.Month).updateOne( { 'StationNumber' : callingNumber }, { '$inc': { 'OutboundCalls': 1 } }, { 'upsert' : true }, (err, response) => { 
				});
			}
		} else if(smdrRecord.RecordTypeCode == `KE` || smdrRecord.RecordTypeCode == `KI` || smdrRecord.RecordTypeCode == `KL`){
			if(process.env.LOGGING_LEVEL_4 == `true`){
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, `KE/KI/KL - Inbound Record incrementCallCount`);
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, JSON.stringify(smdrRecord.CalledPartyInformation) );
			}
			var calledNumber = ``;
			if(smdrRecord.CalledPartyInformation.PhysicalNumber.hasOwnProperty(`CalledNumber`)){
				calledNumber = smdrRecord.CalledPartyInformation.PhysicalNumber.CalledNumber;
			}
			if(process.env.USE_PHYSICAL_NUMBER == `false` && smdrRecord.CallingPartyInformation.TelephoneNumber.hasOwnProperty(`LogicalNumber`)){
				calledNumber = smdrRecord.CallingPartyInformation.TelephoneNumber.LogicalNumber;
			}
			if(calledNumber != ``){
				helperFunctions.logMessage(`out`, `Stat Update`, `Updating inbound stats for extension: ` + calledNumber);
				clientSession.db(`Device-Stats`).collection(`Monthly-Counts-` + smdrRecord.CallTime.End.Year + `-` + smdrRecord.CallTime.End.Month).updateOne( { 'StationNumber' : calledNumber }, { '$inc': { 'InboundCalls': 1 } }, { 'upsert' : true }, (err, response) => { 
				});
			}
		} else if(smdrRecord.RecordTypeCode == `KB` || smdrRecord.RecordTypeCode == `KJ` || smdrRecord.RecordTypeCode == `KM`){
			if(process.env.LOGGING_LEVEL_4 == `true`){
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, `KB/KJ/KM - Station-to-Station Record incrementCallCount`);
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, JSON.stringify(smdrRecord.CalledPartyInformation) );
				helperFunctions.logMessage(`other`, `LEVEL 4 Log`, JSON.stringify(smdrRecord.CallingPartyInformation) );
			}
			var callingNumber = ``;
			if(smdrRecord.CallingPartyInformation.PhysicalNumber.hasOwnProperty(`CallingNumber`)){
				callingNumber = smdrRecord.CallingPartyInformation.PhysicalNumber.CallingNumber;
			}
			if(process.env.USE_PHYSICAL_NUMBER == `false` && smdrRecord.CallingPartyInformation.TelephoneNumber.hasOwnProperty(`LogicalNumber`)){
				callingNumber = smdrRecord.CallingPartyInformation.TelephoneNumber.LogicalNumber;
			}
			if(callingNumber != `` && callingNumber != null){
				clientSession.db(`Device-Stats`).collection(`Monthly-Counts-` + smdrRecord.CallTime.End.Year + `-` + smdrRecord.CallTime.End.Month).updateOne( { 'StationNumber' : callingNumber }, { '$inc': { 'StationToStationCalls': 1 } }, { 'upsert' : true }, (err, response) => { 
				});
			}
			var calledNumber = ``;
			if(smdrRecord.CalledPartyInformation.PhysicalNumber.hasOwnProperty(`CalledNumber`)){
				calledNumber = smdrRecord.CalledPartyInformation.PhysicalNumber.CalledNumber;
			}
			if(process.env.USE_PHYSICAL_NUMBER == `false` && smdrRecord.CallingPartyInformation.TelephoneNumber.hasOwnProperty(`LogicalNumber`)){
				calledNumber = smdrRecord.CallingPartyInformation.TelephoneNumber.LogicalNumber;
			}
			
			helperFunctions.logMessage(`out`, `Stat Update`, `Updating station-to-station stats for extensions: ` + callingNumber + ` and ` + calledNumber);
			if(calledNumber != `` && calledNumber != null){
				clientSession.db(`Device-Stats`).collection(`Monthly-Counts-` + smdrRecord.CallTime.End.Year + `-` + smdrRecord.CallTime.End.Month).updateOne( { 'StationNumber' : calledNumber }, { '$inc': { 'StationToStationCalls': 1 } }, { 'upsert' : true }, (err, response) => { 
				});
			}
		}
	},
	
	insertBufferRecord: (deviceNumber, rawSMDR, clientSession, callback) => {
		var id = rawSMDR.replace(/\s/g,``);
		clientSession.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).insertOne( { '_id' : id, 'RawSMDR' : rawSMDR }, (err, response) => {
			if(err && err.hasOwnProperty(`errmsg`)){
				callback(err.errmsg);
			} else if(response != undefined) {
				callback(response.result);		
			} else {
				callback(err);
			}
		});
	},
	
	getBufferRecords: (deviceNumber, clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).find({}).limit(64).toArray((err, response) => {
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
	},
	
	getBufferRecord: (deviceNumber, clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).findOne({}, { '_id': 0 }, (err, response) => {
			callback(response);
		});
	},
	
	deleteBufferRecord: (deviceNumber, id, clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).deleteOne({ '_id' : id }, (err, response) => {
			callback(response);
		});
	},
	
	populateHistoricData: (deviceNumber, clientSession, callback) => {
		var mongoCursor = clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find( { RawSMDR : { $exists: true }});
		var recordCount = mongoCursor.count();
		mongoCursor.batchSize(20);
		recordCount.then((recordCount) => {
			console.log(`Found ` + recordCount + ` records for device ` + deviceNumber + ` buffer`);
			mongoCursor.forEach( (smdrRecord) => {
				bufferRecord = {
					'_id' : smdrRecord._id,
					'RawSMDR': smdrRecord.RawSMDR
				};
				clientSession.db(process.env.MONGO_DATABASE).collection(`SMDR-Buffer-Device-` + deviceNumber).insertOne( bufferRecord, (err, response) => {
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
	},
	
	updateSMDRRecord: (smdrRecord, clientSession, callback) => {
		var id = smdrRecord.RawSMDR.replace(/\s/g,``);
		clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).updateOne( { '_id' : id }, { '$set' : smdrRecord }, (err, response) => {
			if(err && err.hasOwnProperty(`errmsg`)){
				callback(err.errmsg);
			} else {
				callback(response.result);		
			}		
		});
	},
	
	getRecords: ( skipAmount, clientSession, callback) => {
		clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find({}).skip(skipAmount).toArray( (err, documents) => {
			if(err && err.hasOwnProperty(`errmsg`)){
				callback(err.errmsg);
			} else {
				callback(documents);		
			}		
		});
	},
	
	createDates: (smdrRecord, clientSession, callback) => {
		var dateString = smdrRecord.CallTime.Start.Year + `-` + smdrRecord.CallTime.Start.Month + `-` + smdrRecord.CallTime.Start.Day + `T` + smdrRecord.CallTime.Start.Hour + `:` + smdrRecord.CallTime.Start.Minute + `:` + smdrRecord.CallTime.Start.Second + `:` + smdrRecord.CallTime.Start.Millisecond;
		clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).updateOne( { '_id': smdrRecord.RawSMDR }, { $set: { $dateFromString: {'dateString': dateString } } }, (err, response) => {
			assert.equal(null, err);
			callback(response);		
		});
	}
	
 }