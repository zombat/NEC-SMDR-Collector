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
		helperFunctions = require(`./helper-functions.js`),
		smdrConnection = {
			'ipAddress': process.env.NEC_SMDR_IP_ADDRESS,
			'port': process.env.NEC_SMDR_PORT,
			'device': process.env.NEC_SMDR_DEVICE
		},
		dbFunctions = require(`./mongo-db.js`);
		
var		bufferArray = [];
		smdrPath = null,
		sendSMDRRequest = false,
		sendStatusMonitorRequest = false,
		continueInterval = true,
		reconnectClient = false,
		enableNotification = true,
		pauseCollection = false,
		// Set interval timers X * 1000 for # of seconds
		intervalTimer = 5*1000;

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

if(process.env[2] !== undefined || process.env.GET_FILES ===`true`){
	intervalTimer = 240000;
}
if(process.env.LOGGING_LEVEL_1 == `true`){
	helperFunctions.logMessage(`out`, `MongoDB`, `Attempting to connect to MongoDB...`);
}
mongoClient.connect(() => {
	var clientSession = mongoClient.get();
	
	if(clientSession != undefined && clientSession.hasOwnProperty(`topology`)){
	if(process.env.LOGGING_LEVEL_1 == `true`){
		helperFunctions.logMessage(`other`, `MongoDB`, clientSession.topology.s.state);
	}
	} else {
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`notify`, `MongoDB`, `Error connect to MongoDB`);
		}
	}

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

	const insertBuffers = (smdrRecord) => {
		if(process.env.SMDR_MUX_DEVICE_0 == `true`){
			dbFunctions.insertBufferRecord(0, smdrRecord, clientSession, (response) => {
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `Database Response (Device 0 Buffer)`, JSON.stringify(response));
				}
			});
		}
		if(process.env.SMDR_MUX_DEVICE_1 == `true`){
			dbFunctions.insertBufferRecord(1, smdrRecord, clientSession, (response) => {
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `Database Response (Device 1 Buffer)`, JSON.stringify(response));
				}
			});
		}
		if(process.env.SMDR_MUX_DEVICE_2 == `true`){
			dbFunctions.insertBufferRecord(2, smdrRecord, clientSession, (response) => {
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `Database Response (Device 2 Buffer)`, JSON.stringify(response));
				}
			});
		}
		if(process.env.SMDR_MUX_DEVICE_3 == `true`){
			dbFunctions.insertBufferRecord(3, smdrRecord, clientSession, (response) => {
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `Database Response (Device 3 Buffer)`, JSON.stringify(response));
				}
			});
		}
	}
			
	if(process.env.GET_FILES ===`true` && process.env.GET_NEAX ===`true`){
		// Check for misconfiguration.
		if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`notify`, `Configuration Error`, `Both GET_FILES and GET_NEAX cannot be true`);
		}
	}		
			
	const getFiles = (callback) => {
		// List SMDR files and parse.
		fs.readdir(`./Logs`, (err, files) => {
			let smdrFiles = files.filter((file) => {
				return path.extname(file).toLowerCase() == `.smdr`
			});
			if(smdrFiles.length){
				smdrFiles.forEach((file) => {
					parseFile(file, (data) => {
						helperFunctions.logMessage(`in`, `File Name`, file);
						data.forEach((smdrEntry) => {
							insertBuffers(smdrEntry);
							necSMDR.parseSMDR(smdrEntry, (smdrResponse) => {
								dbFunctions.insertSMDRRecord(smdrResponse, clientSession, (databaseResponse) => {
									if(process.env.LOGGING_LEVEL_1 == `true`){
										helperFunctions.logMessage(`other`, `SMDR String`, smdrEntry);
										helperFunctions.logMessage(`in`, `Database Response`, JSON.stringify(databaseResponse));
									}
									if(databaseResponse.hasOwnProperty(`name`)){
										if(databaseResponse.name == `MongoNetworkError`){
											counterTwo = data.length;
											if(process.env.LOGGING_LEVEL_1 == `true`){
												helperFunctions.logMessage(`notify`, `MongoDB`, `Mongo Network Error`);
											}
										} 
									} else {
										if(process.env.ENABLE_MONTHLY_STATS == `true`){
											dbFunctions.incrementCallCount(smdrResponse, clientSession, (statResult) => {	
												if(process.env.LOGGING_LEVEL_1 == `true`){
													helperFunctions.logMessage(`in`, `Stats`, statResult);
												}
											});
										}
									}
								});
								notify.processNotification(smdrResponse, clientSession, (notifyResponse) => {
									if(notifyResponse != null){
										if(process.env.LOGGING_LEVEL_1 == `true`){
											helperFunctions.logMessage(`notify`, `Notification Rule`, notifyResponse);
										}
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
		if(process.env.ENABLE_MONTHLY_STATS == `true`){
			dbFunctions.dropDatabase(`Device-Stats`, clientSession, (dropResult) => {
				if(process.env.LOGGING_LEVEL_4 == `true`){
					helperFunctions.logMessage(`notify`, `Database Drop`, JSON.stringify(dropResult));
				}
			});
		}
		var mongoCursor = clientSession.db(process.env.MONGO_DATABASE).collection(process.env.MONGO_COLLECTION).find( { RawSMDR : { $exists: true }} );
		var recordCount = mongoCursor.count();
		mongoCursor.batchSize(20);
		recordCount.then((recordCount) => {
			console.log(`Found ` + recordCount + ` records`);
			mongoCursor.forEach( (smdrRecord) => {
				necSMDR.parseSMDR(smdrRecord.RawSMDR, (smdrObject) => {
					dbFunctions.updateSMDRRecord(smdrObject, clientSession, (smdrResponse) => {
						if(process.env.LOGGING_LEVEL_1 == `true`){
							helperFunctions.logMessage(`in`, `Database Response`, JSON.stringify(smdrResponse));
						}
						if(process.env.ENABLE_MONTHLY_STATS == `true`){	
							dbFunctions.incrementCallCount(smdrObject, clientSession, (statResult) => {	
								if(process.env.LOGGING_LEVEL_1 == `true`){
									helperFunctions.logMessage(`in`, `Stats`, statResult);
								}
							});
						}
						recordCount--;
						if(recordCount == 0){
							callback();
						}
					});
				});
			});	
		});
	}
		
	client.on(`error`, (err) => {
		// Listen for errs from PBX.
		if (err.code === `ETIMEDOUT`){
			client.end;
		}
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`notify`, `Client`, `Client Error`, err);
		}
	});

	client.on(`ready`, () => {
		// Disable reconnection on client connection.
		reconnectClient = false;
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`other`, `Client`, `Client connected`);
		}
	});

	client.on(`data`, (data) => {
		// Process data from PBX.
		if (data.toString().substring(1, 2) === `2`) {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `SMDR Data`, data);
			}
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
							dbFunctions.insertSMDRRecord(smdrObject, clientSession, (response) => {
								if(process.env.LOGGING_LEVEL_1 == `true`){
									helperFunctions.logMessage(`in`, `Database Response`, JSON.stringify(response));
								}
								if(process.env.ENABLE_MONTHLY_STATS == `true` && databaseResponse.n == 1){
										dbFunctions.incrementCallCount(smdrResponse, clientSession, (result) => {
												//console.log(response);
										});
									}
							});
							notify.processNotification(smdrObject, (notifyResponse) => {
								if(notifyResponse != null){
									if(process.env.LOGGING_LEVEL_1 == `true`){
										helperFunctions.logMessage(`other`, `Notification Rule`, notifyResponse);
									}
								}
							});
						});
					});
				}
				necPBX.respondSMDR(client, `4`, smdrObject.DeviceNumber, smdrObject.SequenceNumber, (responseBuffer) => {
					if(process.env.LOGGING_LEVEL_1 == `true`){
						helperFunctions.logMessage(`out`, `Response`, responseBuffer);		
					}						
				});
			});
		} else if (data.toString().substring(1, 2) === `3`) {
			if (data.toString().length > 25) {
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `SMDR Data`, data);
				}
			} else {
				switch(data.toString().substring(9, 10)) {
					case `1`:
						if(process.env.LOGGING_LEVEL_1 == `true`){
							helperFunctions.logMessage(`in`, `Buffer Empty`, data);	
						}
						bufferArray = [];
						break;
					case `2`:
						if(process.env.LOGGING_LEVEL_1 == `true`){
							helperFunctions.logMessage(`in`, `Normal`, data);
						}							
						break;
					default:
						break;
				};
			}
			
		} else {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `Undefined Data`, data);	
			}
		}
	});

	client.on(`close`, () => {
		// Listen for connection close and destroy the connection.
		client.end();
		reconnectClient = true;
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`notify`, `Client`, `Client connection closed`);
		}
	});

	if(process.argv[2] == `--rebuildDatabase`){
		rebuildDatabase( null, () => {
			console.log(`Database rebuild complete`);
			process.exit(1);
		});
	} else if (process.argv[2] == `--populateHistoricData`) {
		if(process.argv[3] >= 0 && process.argv[3] <=3 ){
			dbFunctions.populateHistoricData(process.argv[3], clientSession, (response) => {
				//console.log(response);
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
		
		processLoop();
	}

	function processLoop(){
		// Main timer loop. 
		// Check for MongoDB connection
		if(server.listening){
		} else {
			if(process.env.SMDR_MUX_ENABLED == `true`){
				server.listen(60010, process.env.SMDR_MUX_LISTEN_ADDRESS);
			}
		}
		if(clientSession == undefined){
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`out`, `MongoDB`, `Attempting to connect to MongoDB...`);
			}
			mongoClient.connect(() => {
				clientSession = mongoClient.get();
			});
			setTimeout(processLoop, 36100);
		} else {
			dbFunctions.serverStatus(clientSession, (serverStatus) => {
				if(serverStatus){
					if(process.env.GET_FILES == `true` && !pauseCollection){
						getFiles( (cleanExit) => {
							if(cleanExit){
								if(process.env.LOGGING_LEVEL_1 == `true`){
									helperFunctions.logMessage(`in`, `SMDR Import`, `File import complete`);
								}
								process.exit(1);
							} else {
								processLoop();
							}
						});
					} else if(process.env.GET_NEAX == `true` && !pauseCollection){
						if(reconnectClient){
							necPBX.connectSMDR(`sv9500`, smdrConnection, client, (response) => {
								reconnectClient = false;
							});
						} else if(!continueInterval){
							clearInterval(intervalRequest);
						} else if(sendSMDRRequest){
							necPBX.sendSMDRRequest(smdrConnection, client, (smdrRequestBuffer) => {
								if(process.env.LOGGING_LEVEL_1 == `true`){
									helperFunctions.logMessage(`out`, `SMDR Request`, smdrRequestBuffer);
								}
							});
						} else{
							necPBX.sendStatusMonitor(smdrConnection, client, (statusMonitorBuffer) => {
								if(process.env.LOGGING_LEVEL_1 == `true`){
									helperFunctions.logMessage(`out`, `Status Monitor`, statusMonitorBuffer);
								}
							});
							sendSMDRRequest = true;
						}
					}
				} else {
					if(process.env.LOGGING_LEVEL_1 == `true`){
						helperFunctions.logMessage(`notify`, `MongoDB`, `Error connecting to MongoDB`);
					}
				}
			});
			setTimeout(processLoop, intervalTimer);
		}
		
	};

	if(process.env.GET_NEAX){
	reconnectClient = true;
	}


	// Server Area

	server.on(`close`, () => {
	  if(process.env.LOGGING_LEVEL_1 == `true`){
		helperFunctions.logMessage(`notify`, `MUX Server`, `Offline`);
	  }
	});

	server.on(`connection`, (socket) => {
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, socket.remoteAddress);
		}
		socket.setEncoding(`utf8`);

		socket.setTimeout(300000, () => {
		  if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`other`, `MUX Server - Error`, `Client connection timed out.`);
		  }
		});

		 
		socket.on(`data`, (data) => {
		  var stringOfData = data.toString(`hex`).substring(1, data.toString().length);
		  var device = `0x3` + stringOfData.substring(7,8);
		  
		  // Status monitor
		  if(stringOfData.substring(0,1) == `5`){
			 if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, `Status Monitor Received`);
				helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Buffer Empty`);
			 }
			  var statusMonitorBuffer = new Buffer.from([0x16, 0x33, 0x30, 0x30, 0x30, 0x30, 0x33, 0x30, device.toString(`hex`) , 0x30, 0x32]);
			  socket.write(statusMonitorBuffer);
		  }
		  
		  // SMDR request
		  else if(stringOfData.substring(0,1) == `1`){
			  if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, `SMDR Request Received`);
			  }
			  dbFunctions.getBufferRecords(stringOfData.substring(7,8), clientSession, (response) => {
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
					  if(process.env.LOGGING_LEVEL_1 == `true`){
						helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Sending SMDR`);
					  }				  
				  } else {
					  var statusMonitorBuffer = new Buffer.from([0x16, 0x33, 0x30, 0x30, 0x30, 0x30, 0x33, 0x30, device.toString(`hex`) , 0x30, 0x31]);
					  if(process.env.LOGGING_LEVEL_1 == `true`){
						helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Buffer Empty`);
					  }
				  }
				  socket.write(statusMonitorBuffer);
			  });
			  
			  // SMDR acknowledged
		  } else if(stringOfData.substring(0,1) == `4`){
			  if(stringOfData.substring(9,10) == ``){
				if(process.env.LOGGING_LEVEL_1 == `true`){
					helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, `SMDR data received and acknowledged.`);
				}
				  if(typeof sequenceTracker[device][parseInt(stringOfData.substring(8,9))] == `string`){
					  dbFunctions.deleteBufferRecord(stringOfData.substring(7,8), sequenceTracker[device][parseInt(stringOfData.substring(8,9))], clientSession, (response) => { 
					  });
				  } else {
					  sequenceTracker[device][parseInt(stringOfData.substring(8,9))].forEach( (eachID) => {
						  dbFunctions.deleteBufferRecord(stringOfData.substring(7,8), eachID, clientSession, (response) => { 
						  });
					  });
				  }	  	  
			  }
		  }
		  
		  // Link release
		  else if(stringOfData.substring(0,1) == `6`){
			 if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, `Link Release Request`);
				helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Acknowledging Link Release`);
				}
			  socket.end();
		  }
		  

		  var is_kernel_buffer_full = socket.write('Data ::' + data);
		  if(is_kernel_buffer_full){
			  if(process.env.LOGGING_LEVEL_2 == `true`){
				helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Buffer flushed`);
				}
		  }else{
			socket.pause();
		  }

		});
		
		socket.on(`error`,(err) => {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`notify`, `MUX Server - Socket Error`, err);
			}
		});
		socket.on(`drain`,() => {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`other`, `MUX Server`, `Buffer drained`);
			}
		  socket.resume();
		});

		socket.on(`timeout`, () => {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`notify`, `MUX Server - Socket Error`, `Socket timeout.`);
			}
		  socket.end();
		});

		socket.on(`end`, (data) => {
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`in`, `MUX Server - Client Connection`, `Disconnect requested.`);
			}
		});

		socket.on(`close`,(err) => {;
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`out`, `MUX Server - Client Connection`, `Disconnected.`);
		}
		  if(err){
			if(process.env.LOGGING_LEVEL_1 == `true`){
				helperFunctions.logMessage(`notify`, `MUX Server - Client Connection Error`, err);
			}
		  }
		}); 

		setTimeout( () => {
		  socket.destroy();
		}, 300000);

	});

	server.on(`error`, (err) => {
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`notify`, `MUX Server Error`, err);
		}
	});

	server.on(`listening`, () =>{
		if(process.env.LOGGING_LEVEL_1 == `true`){
			helperFunctions.logMessage(`other`, `MUX Server`, `Online`);
		}
	});

	checkDirectories();

});
