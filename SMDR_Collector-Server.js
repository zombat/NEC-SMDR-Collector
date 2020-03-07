/*
		Node.js based SMDR collector for NEAX formatted SMDR that uploads data to MongoDB
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
const	net = require(`net`),
		client = new net.Socket(),
		server = new net.createServer(),
		mongoClient = require(`./mongoClient.js`),
		records = [],
		buffer = require(`buffer`),
		path = require(`path`),
		fs = require(`fs`),
		necSMDR = require(`./parse-nec-smdr.js`),
		necPBX = require(`./nec-pbx-client.js`),
		notify = require(`./notify-fnc.js`),
		smdrConnection = {
			'ipAddress': process.env.NEC_SMDR_IP_ADDRESS,
			'port': process.env.NEC_SMDR_PORT,
			'device': process.env.NEC_SMDR_DEVICE
		},
		dbFunctions = require(`./mongo-db.js`),
		// Set interval timers X * 1000 for # of seconds
			intervalTimer = 5*1000;
var		bufferArray = [];
		smdrPath = null,
		sendSMDRRequest = false,
		sendStatusMonitorRequest = false,
		continueInterval = true,
		reconnectClient = false,
		enableNotification = true;
		pauseCollection = false;

var sequenceTracker = {
	'0x30': { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '' },
	'0x31': { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '' },
	'0x32': { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '' },
	'0x33': { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '' }
};

var currentSequenceNumber = {
	'0': 0,
	'1': 0,
	'2': 0,
	'3': 0
};

const check911 = (smdrObject, callback) => {
	
}

const checkDirectories = () => {
	// Check for pre-existing log directory and create if needed.
	try {
		if (fs.existsSync(`./Logs`)) {
		} else {
			fs.mkdir(`./Logs`, function(err, response){
				if(err){
					console.log(err);
				} else {
					console.log(`Created Directory: ./Logs`);
					if(process.env.VERBOSE_LOG){
						logFile(theDate(`dateTime`) + `\t:\tCreated Directory: ./Logs`, theDate(`date`) + `.log`);
					}	
				}
			});
		}
	} catch(err) {
		console.err(err)
	}
}

const logFile = (message, fileName) => {
	// Append information to a log file.
	fs.appendFile(`./Logs/` + fileName, message + `\n`, `utf8`, (err) => {
	});
};


const logMessage = (direction, message, data, fileName) => {
	// Log information to console, file, or both.
	if(direction == `in`){
		var direction = `=>`;
	} else if(direction == `out`){
		var direction = `<=`;
	} else if(direction == `other`){
		var direction = `--`;
	} else if(direction == `notify`){
		var direction = `!!`;
	}
	var theMessage = `\t` + direction + `\t` + message + `:\t` + data;
	if(process.env.VERBOSE_CONSOLE ===`true`){
		console.log(theMessage);
	}
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`) + `\t:` + theMessage, theDate(`date`) + `.log`);
	}
};
const insertBuffers = (smdrRecord) => {
	if(process.env.SMDR_MUX_DEVICE_0 == `true`){
		dbFunctions.insertBufferRecord(0, smdrRecord, (response) => {
			logMessage(`in`, `Database Response (Device 0 Buffer)`, JSON.stringify(response));
		});
	}
	if(process.env.SMDR_MUX_DEVICE_1 == `true`){
		dbFunctions.insertBufferRecord(1, smdrRecord, (response) => {
			logMessage(`in`, `Database Response (Device 1 Buffer)`, JSON.stringify(response));
		});
	}
	if(process.env.SMDR_MUX_DEVICE_2 == `true`){
		dbFunctions.insertBufferRecord(2, smdrRecord, (response) => {
			logMessage(`in`, `Database Response (Device 2 Buffer)`, JSON.stringify(response));
		});
	}
	if(process.env.SMDR_MUX_DEVICE_3 == `true`){
		dbFunctions.insertBufferRecord(3, smdrRecord, (response) => {
			logMessage(`in`, `Database Response (Device 3 Buffer)`, JSON.stringify(response));
		});
	}
}

const padZero = (input) => {
	// Pad digits with 0 if needed and returns two-digit format.
	if(input < 10){
		input = `0` + input;
		return(input);
	} else {
		return(input);
	}
}

const theDate = (returnType) => {
	// Returns date or data/time.
	var dateFnc = new Date();
	var date = dateFnc.getFullYear() + `-` + (dateFnc.getMonth() + 1) + `-` + dateFnc.getDate();
	var time = dateFnc.getHours() + `:` + padZero(dateFnc.getMinutes()) + `:` + padZero(dateFnc.getSeconds());
	var dateTime = date + ` - ` + time;
	if(returnType == `date`){
		return date;
	} else if(returnType == `dateTime`){
	return dateTime;
	}
};
		
if(process.env.GET_FILES ===`true` && process.env.GET_NEAX ===`true`){
	// Check for misconfiguration.
	logMessage(`other`, `Configuration Error`, `Both GET_FILES and GET_NEAX cannot be true`);
}		
		
const getFiles = () => {
	// List SMDR files and parse.
	fs.readdir(`./Logs`, (err, files) => {
		let smdrFiles = files.filter((file) => {
			return path.extname(file).toLowerCase() == `.smdr`
		});
		if(smdrFiles.length){
			smdrFiles.forEach((file) => {
				parseFile(file, (data) => {
					logMessage(`in`, `File Name`, file);
					data.forEach((smdrEntry) => {
						insertBuffers(smdrEntry);
						necSMDR.parseSMDR(smdrEntry, (response) => {
							dbFunctions.insertSMDRRecord(response, (response) => {
								logMessage(`other`, `SMDR String`, smdrEntry);
								logMessage(`in`, `Database Response`, JSON.stringify(response));
							});
							notify.processNotification(response, (notifyResponse) => {
								if(notifyResponse != null){
									logMessage(`notify`, `Notification Rule`, notifyResponse);
								}
							});
						});
					});
				});
			});
		} else {
			console.log(`No files found...`);
		}
	});		
}

const parseFile = (fileName, callback) => {
	// Convert to array of strings, drop empty elements, and return.
	fs.readFile(`./Logs` + `/` + fileName, (err, data) => {
		if (err) throw err;
		let fileData = data.toString().split(`\n`);
		for(var i=0; i<fileData.length;i++){
			if(!fileData[i].length){
				fileData.splice(i,1)
			}
		}
		callback(fileData);
	});
}

const rebuildDatabase = ( options , callback) => {
	mongoClient(function(err, client){
		var mongoCursor = 	client.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find( { RawSMDR : { $exists: true }} );
		var recordCount = mongoCursor.count();
		mongoCursor.batchSize(20);
		recordCount.then((recordCount) => {
			console.log(`Found ` + recordCount + ` records`);
			mongoCursor.forEach( (smdrRecord) => {
				necSMDR.parseSMDR(smdrRecord.RawSMDR, (smdrObject) => {
					dbFunctions.updateSMDRRecord(smdrObject, (response) => {
						logMessage(`in`, `Database Response`, JSON.stringify(response));
						recordCount--;
						if(recordCount == 0){
							callback();
						}
					});
				});
			});	
		});
	});
}
	
client.on(`error`, (err) => {
	// Listen for errs from PBX.
    if (err.code === `ETIMEDOUT`){
        console.log(`Connection timed out.`);
        client.exit;
    }
	logMessage(`other`, `Client`, `Client Error`, err);
});

client.on(`ready`, () => {
	// Disable reconnection on client connection.
	console.log(`Client connected`);
	reconnectClient = false;
	logMessage(`other`, `Client`, `Client connected`);
});

client.on(`data`, (data) => {
	// Process data from PBX.
	if (data.toString().substring(1, 2) === `2`) {
		logMessage(`in`, `SMDR Data`, data);
		var hexData = data.toString(`hex`);
		var cdrData = []; 
		var smdrObject = {
			'RawData': data,
			'Synchronization': data.toString().substring(0,2),
			'IdentifierKind': data.toString().substring(6,7),
			'LengthHex': hexData.substring(4,14),
			'LengthDec': parseInt(data.toString().substring(2,7)),
			'DeviceNumberHex': hexData.substring(14,18),
			'DeviceNumber': hexData.substring(17,18),
			'SequenceNumber': parseInt(data.toString().substring(9,10)),
			'Record': data.toString().substring(8,data.length), 
			'ParityByte': hexData.substring(hexData.length-2,hexData.length)
		};
		
		cdrData.push(smdrObject);
		cdrData.forEach(function(record){
			if(data.toString().substring(1, 2) ===  `2`){
				bufferArray = smdrObject.Record.substring(2,smdrObject.Record.length).replace(/\u0000/g).split(``);
				if(bufferArray.indexOf(`undefined`)){
					bufferArray.splice(bufferArray.indexOf(`undefined`), 1);
				}
				bufferArray.forEach((smdrRecord) => {
					logFile(smdrRecord, theDate(`date`) + `.smdr`);
					insertBuffers(smdrRecord);
					necSMDR.parseSMDR(smdrRecord, (smdrObject) => {
						dbFunctions.insertSMDRRecord(smdrObject, (response) => {
							logMessage(`in`, `Database Response`, JSON.stringify(response));
						});
						notify.processNotification(smdrObject, (notifyResponse) => {
							if(notifyResponse != null){
								logMessage(`notify`, `Notification Rule`, notifyResponse);
							}
						});
					});
				});
			}
			necPBX.respondSMDR(client, `4`, smdrObject.DeviceNumber, smdrObject.SequenceNumber, (responseBuffer) => {
				logMessage(`out`, `Response`, responseBuffer);				
			});
		});
	} else if (data.toString().substring(1, 2) === `3`) {
		if (data.toString().length > 25) {
			logMessage(`in`, `SMDR Data`, data);
		} else {
			switch(data.toString().substring(9, 10)) {
				case `1`:
					logMessage(`in`, `Buffer Empty`, data);	
					bufferArray = [];
					break;
				case `2`:
					logMessage(`in`, `Normal`, data);	
					break;
				default:
					break;
			};
		}
		
	} else {
		logMessage(`in`, `Undefined Data`, data);	
	}
});

client.on(`close`, () => {
	// Listen for connection close and destroy the connection.
	client.destroy();
	reconnectClient = true;
	console.log(`Client connection closed`);
	logMessage(`other`, `Client`, `Client connection closed`);
});

if(process.argv[2] == `--rebuildDatabase`){
	rebuildDatabase( null, () => {
		console.log(`Database rebuild complete`);
		process.exit(1);
	});
} else if (process.argv[2] == `--populateHistoricData`) {
	if(process.argv[3] == 1){
		dbFunctions.populateHistoricData(1, (response) => {
			console.log(response);
		});
	} else {
		console.log(`No SMDR device number specified.`);
	}
} else if (process.argv[2]) {
		console.log(`Optional flags are:`);
		console.log(`\t--rebuildDatabase\t: This will upgrade existing database entries to the latest schema.`);
		console.log(`\t--populateHistoricData [0-3] \t: This will populate SMDR buffers with historic data for the specified device number.`);
		process.exit(1);
} else {
	var intervalRequest = setInterval( () => {
		// Main timer loop. 
		// Check for MongoDB connection
		
		if(server.listening){
			
		} else {
			if(process.env.SMDR_MUX_ENABLED == `true`){
				server.listen(60010);
			}
		}
		dbFunctions.serverStatus( (serverStatus) => {
			if(serverStatus){
				if(process.env.GET_FILES == `true` && !pauseCollection){
					getFiles();
					 clearInterval(intervalRequest);
				} else if(process.env.GET_NEAX == `true` && !pauseCollection){
					if(reconnectClient){
						necPBX.connectSMDR(`sv9500`, smdrConnection, client, (response) => {
							reconnectClient = false;
						});
					} else if(!continueInterval){
						clearInterval(intervalRequest);
					} else if(sendSMDRRequest){
						necPBX.sendSMDRRequest(smdrConnection, client, (smdrRequestBuffer) => {
							logMessage(`out`, `SMDR Request`, smdrRequestBuffer);
						});
					} else{
						necPBX.sendStatusMonitor(smdrConnection, client, (statusMonitorBuffer) => {
							logMessage(`out`, `Status Monitor`, statusMonitorBuffer);
						});
						sendSMDRRequest = true;
					}
				}
			} else {
				logMessage(`other`, `MongoDB`, `Error connecting to MongoDB`);
			}
		});
	}, intervalTimer);
}

if(process.env.GET_NEAX){
reconnectClient = true;
}


// Server Area

server.on(`close`, () => {
  logMessage(`other`, `MUX Server`, `Offline`);
});

// emitted when new client connects
server.on('connection', (socket) => {
	logMessage(`in`, `MUX Server - Client Connection`, socket.remoteAddress);
	socket.setEncoding(`utf8`);

	socket.setTimeout(300000, () => {
	  logMessage(`other`, `MUX Server - Error`, `Client connection timed out.`);
	});

	 
	socket.on(`data`, (data) => {
	  var stringOfData = data.toString(`hex`).substring(1, data.toString().length);
	  var device = `0x3` + stringOfData.substring(7,8);
	  
	  // Status monitor
	  if(stringOfData.substring(0,1) == `5`){
		  logMessage(`in`, `MUX Server - Client Connection`, `Status Monitor Received`);
		  logMessage(`out`, `MUX Server - Client Connection`, `Buffer Empty`);
		  var statusMonitorBuffer = new Buffer.from([0x16, 0x33, 0x30, 0x30, 0x30, 0x30, 0x33, 0x30, device.toString(`hex`) , 0x30, 0x32]);
		  socket.write(statusMonitorBuffer);
	  }
	  
	  // SMDR request
	  else if(stringOfData.substring(0,1) == `1`){
		  logMessage(`in`, `MUX Server - Client Connection`, `SMDR Request Received`);
		  dbFunctions.getBufferRecords(stringOfData.substring(7,8), (response) => {
			  if(response != null) {
				  var smdrHex = [0x16, 0x32];
				  var length = response.RawSMDR.length+3;
				  length = length.toString();
				  var tempArray = [];
				  for (var n = 0, l = length.length; n < l; n ++) {
					var hex = Number(length.charCodeAt(n)).toString(16);
					tempArray.push(hex);;
				  }
				  while(tempArray.length < 5){
					tempArray.unshift((`0`).charCodeAt().toString(16));
				  }
				  tempArray.forEach((hexData) => {
					  smdrHex.push(`0x` + hexData);
				  });
				  
				  smdrHex.push(0x30);
				  smdrHex.push(device);
				  smdrHex.push(`0x3` + currentSequenceNumber[stringOfData.substring(7,8)]);
				  
				  if(response.hasOwnProperty(`IdArray`)){
					sequenceTracker[device][currentSequenceNumber[stringOfData.substring(7,8)]] = [];
					response.IdArray.forEach((eachID) => {
						sequenceTracker[device][currentSequenceNumber[stringOfData.substring(7,8)]].push(eachID);
					});
				  } else {
					sequenceTracker[device][currentSequenceNumber[stringOfData.substring(7,8)]] = response._id;
				  }				  
				  currentSequenceNumber[stringOfData.substring(7,8)]++;
				  if(currentSequenceNumber[stringOfData.substring(7,8)] > 9){
					  currentSequenceNumber[stringOfData.substring(7,8)] = 0;
				  }
				  for (var n = 0, l = response.RawSMDR.length; n < l; n ++) {
					  smdrHex.push(response.RawSMDR.charCodeAt(n));				
				  }
				  smdrHex.push(0xFE);
				  var statusMonitorBuffer = new Buffer.from(smdrHex);
				  logMessage(`out`, `MUX Server - Client Connection`, `Sending SMDR`);				  
			  } else {
				  var statusMonitorBuffer = new Buffer.from([0x16, 0x33, 0x30, 0x30, 0x30, 0x30, 0x33, 0x30, device.toString(`hex`) , 0x30, 0x31]);
				  logMessage(`out`, `MUX Server - Client Connection`, `Buffer Empty`);
			  }
			  socket.write(statusMonitorBuffer);
		  });
		  
		  // SMDR acknowledged
	  } else if(stringOfData.substring(0,1) == `4`){
		  if(stringOfData.substring(9,10) == ``){
			  logMessage(`in`, `MUX Server - Client Connection`, `SMDR data received and acknowledged.`);
			  if(typeof sequenceTracker[device][parseInt(stringOfData.substring(8,9))] == `string`){
				  dbFunctions.deleteBufferRecord(stringOfData.substring(7,8), sequenceTracker[device][parseInt(stringOfData.substring(8,9))], (response) => { 
				  });
			  } else {
				  sequenceTracker[device][parseInt(stringOfData.substring(8,9))].forEach( (eachID) => {
					  dbFunctions.deleteBufferRecord(stringOfData.substring(7,8), eachID, (response) => { 
					  });
				  });
			  }	  	  
		  }
	  }
	  
	  // Link release
	  else if(stringOfData.substring(0,1) == `6`){
		  logMessage(`in`, `MUX Server - Client Connection`, `Link Release Request`);
		  logMessage(`out`, `MUX Server - Client Connection`, `Acknowledging Link Release`);
		  socket.end();
	  }
	  

	  //echo data
	  var is_kernel_buffer_full = socket.write('Data ::' + data);
	  if(is_kernel_buffer_full){
		  logMessage(`out`, `MUX Server - Client Connection`, `Buffer flushed`);
	  }else{
		socket.pause();
	  }

	});
	
	socket.on(`error`,(err) => {
	  logMessage(`other`, `MUX Server - Socket Error`, err);
	});
	socket.on(`drain`,() => {
	  logMessage(`other`, `MUX Server`, `Buffer drained`);
	  socket.resume();
	});

	socket.on(`timeout`, () => {
	 logMessage(`other`, `MUX Server - Socket Error`, `Socket timeout.`);
	  socket.end();
	});

	socket.on(`end`, (data) => {
		 logMessage(`in`, `MUX Server - Client Connection`, `Disconnect requested.`);
	});

	socket.on(`close`,(err) => {;
		logMessage(`out`, `MUX Server - Client Connection`, `Disconnected.`);
	  if(err){
		logMessage(`other`, `MUX Server - Client Connection Error`, err);
	  }
	}); 

	setTimeout( () => {
	  socket.destroy();
	}, 300000);

});

server.on(`error`, (err) => {
	logMessage(`other`, `MUX Server Error`, err);
});

server.on(`listening`, () =>{
  logMessage(`other`, `MUX Server`, `Online`);
});

checkDirectories();