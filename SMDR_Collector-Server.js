require(`dotenv`).config();
const	net = require(`net`),
		client = new net.Socket(),
		nodemailer = require(`nodemailer`),
		records = [],
		buffer = require(`buffer`),
		path = require(`path`),
		fs = require(`fs`),
		necSMDR = require(`./parse-nec-smdr.js`),
		necPBX = require(`./nec-pbx.js`),
		smdrConnection = {
			'ipAddress': process.env.NEC_SMDR_IP_ADDRESS,
			'port': process.env.NEC_SMDR_PORT,
			'device': process.env.NEC_SMDR_DEVICE
		};
		dbFunctions = require(`./mongo-db.js`),
		// Set interval timers X * 1000 for # of seconds
			intervalTimer = 5*1000;
var		bufferArray = [];
		smdrPath = null,
		sendSMDRRequest = false;
		sendStatusMonitorRequest = false;
		continueInterval = true;
		reconnectClient = false;

const logFile = (message, fileName) => {
	fs.appendFile(`./Logs/` + fileName, message + `\n`, `utf8`, (err) => {
	});
};

const theDate = (returnType) => {
	var dateFnc = new Date();
	var date = dateFnc.getFullYear() + `-` + (dateFnc.getMonth() + 1) + `-` + dateFnc.getDate();
	var seconds = dateFnc.getSeconds();
	if(seconds < 10){
		seconds = `0` + seconds;		
	}
	var time = dateFnc.getHours() + `:` + dateFnc.getMinutes() + `:` + seconds;
	var dateTime = date + ` - ` + time;
	if(returnType == `date`){
		return date;
	} else if(returnType == `dateTime`){
		
	return dateTime;
	}
};
		
if(process.env.GET_FILES ===`true` && process.env.GET_NEAX ===`true`){
	console.log(`\n -- Configuration Error:`);
	console.log(`\t Both GET_FILES and GET_NEAX cannot be true.`);
	console.log(`\t Check .env file.`);
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`), theDate(`date`) + `.log`);
		logFile(`\t -- Configuration Error:`, theDate(`date`) + `.log`);
		logFile(`\t Both GET_FILES and GET_NEAX cannot be true.`, theDate(`date`) + `.log`);
		logFile(`\t Check .env file.`, theDate(`date`) + `.log`);
	}
	return 1;
}		
		
const getFiles = () => {
	// ` list of smdr files in directory
	fs.readdir(smdrPath, (err, files) => {
		let smdrFiles = files.filter((file) => {
			return path.extname(file).toLowerCase() == `.smdr`
		});
		if(smdrFiles.length){
			console.log(smdrFiles);
			smdrFiles.forEach((file) => {
				parseFile(file, (data) => {
					console.log(file);
					data.forEach((smdrEntry) => {
						necSMDR.parseSMDR(smdrEntry, (result) => {
							//console.log(result);
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
	fs.readFile(smdrPath + `/` + fileName, (err, data) => {
		if (err) throw err;
		let fileData = data.toString().split(``);
		for(var i=0; i<fileData.length;i++){
			if(!fileData[i].length){
				fileData.splice(i,1)
			}
		}
		callback(fileData);
	});
}
	
client.on(`error`, (err) => {
	// Listen for errs from PBX.
    if (err.code === `ETIMEDOUT`){
        console.log(`Connection timed out.`);
        client.exit;
    }
    console.log(`Error:`);
    console.log(err);
    console.log();
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`) + `\t:\t--\tClient Error:\t` + err, theDate(`date`) + `.log`);
	}
});

client.on(`ready`, () => {
	console.log(`Client connected`);
	reconnectClient = false;
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`) + `\t:\t--\tClient connected`, theDate(`date`) + `.log`);
	}
});

client.on(`data`, (data) => {
	// Check to see if proper connection is made.
	if (data.toString().substring(1, 2) === `2`) {
		if(process.env.VERBOSE_CONSOLE ===`true`){
			console.log(`\t=>\tSMDR Data:\t` + data);
		}
		if(process.env.VERBOSE_LOG){
			logFile(theDate(`dateTime`) + `\t:\t=>\tSMDR Data:\t` + data, theDate(`date`) + `.log`);
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
			'SequenceNumber': parseInt(data.toString().substring(8,10)),
			'Record': data.toString().substring(8,data.length), 
			'ParityByte': hexData.substring(hexData.length-2,hexData.length)
		};
		
		if(process.env.VERBOSE_CONSOLE ===`true`){
			//console.log(`Expected Lenght: ` + smdrObject.LengthDec);
			//console.log(`SMDR Record: ` + smdrObject.Record);
			//console.log(`Record Length: ` + smdrObject.Record.length);
			//console.log(`Sequence Number: `  + smdrObject.SequenceNumber);
			//console.log(`Identifier Kind: ` + smdrObject.IdentifierKind);
			//console.log(`Device Number: ` + smdrObject.DeviceNumber);
		}
		if(process.env.VERBOSE_LOG){
			//logFile(theDate(`dateTime`), theDate(`date`) + `.log`);
			//console.log(`\t Expected Lenght: ` + smdrObject.LengthDec);
			//console.log(`\t SMDR Record: ` + smdrObject.Record);
			//console.log(`\t Record Length: ` + smdrObject.Record.length);
			//console.log(`\t Sequence Number: `  + smdrObject.SequenceNumber);
			//console.log(`\t Identifier Kind: ` + smdrObject.IdentifierKind);
			//console.log(`\t Device Number: ` + smdrObject.DeviceNumber);
		}
		
		cdrData.push(smdrObject);
		cdrData.forEach(function(record){
			if(data.toString().substring(1, 2) ===  `2`){
				bufferArray = smdrObject.Record.substring(2,smdrObject.Record.length).replace(/\u0000/g).split(``);
				if(bufferArray.indexOf(`undefined`)){
					bufferArray.splice(bufferArray.indexOf(`undefined`), 1);
				}
				bufferArray.forEach((smdrRecord) => {
					logFile(smdrRecord, theDate(`date`) + `.smdr`);
					necSMDR.parseSMDR(smdrRecord, (smdrObject) => {
						dbFunctions.insertSMDRRecord(smdrObject, (response) => {
						});
					});
				});
			}
			necPBX.respondSMDR(client, `4`, smdrObject.DeviceNumber, smdrObject.SequenceNumber, (responseBuffer) => {
				if(process.env.VERBOSE_CONSOLE ===`true`){
					console.log(`\t<=\tResponse:\t` + responseBuffer);
				}
				if(process.env.VERBOSE_LOG ===`true`){
					logFile(theDate(`dateTime`) + `\t:\t<=\tResponse:\t` + responseBuffer, theDate(`date`) + `.log`);
				}
				
			});
		});
	} else if (data.toString().substring(1, 2) === `3`) {
		if (data.toString().length > 25) {
			if(process.env.VERBOSE_CONSOLE ===`true`){
				console.log(`\t=>\tSMDR Data:\t` + data);
			}
			if(process.env.VERBOSE_LOG){
				logFile(theDate(`dateTime`) + `\t:\t=>\tSMDR Data:\t` + data, theDate(`date`) + `.log`);
			}
		} else {
			switch(data.toString().substring(9, 10)) {
				case `1`:
					if(process.env.VERBOSE_CONSOLE ===`true`){
						console.log(`\t=>\tBuffer Empty:\t` + data);
					}
					if(process.env.VERBOSE_LOG){
						logFile(theDate(`dateTime`) + `\t:\t=>\tBuffer Empty:\t` + data, theDate(`date`) + `.log`);
					}
					bufferArray = [];
					break;
				case `2`:
					if(process.env.VERBOSE_CONSOLE ===`true`){
						console.log(`\t=>\tNormal:\t` + data);
					}
					if(process.env.VERBOSE_LOG){
						logFile(theDate(`dateTime`) + `\t:\t=>\tNormal:\t` + data, theDate(`date`) + `.log`);
					}
					break;
				default:
					break;
			};
		}
		
	} else {
		if(process.env.VERBOSE_CONSOLE ===`true`){
			console.log(`\t=>\tUndefined Data:` + data);
		}
		if(process.env.VERBOSE_LOG){
			logFile(theDate(`dateTime`) + `\t:\t=>\tUndefined Data:` + dat, theDate(`date`) + `.log`);
		}
	}
});

client.on(`close`, () => {
	// Listen for connection close and destroy the connection.
	client.destroy();
	reconnectClient = true;
	console.log(`tClient connection closed`);
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`) + `\t: \t--\tClient connection closed`, theDate(`date`) + `.log`);
	}
});

var intervalRequest = setInterval( () => {
	if(reconnectClient){
		necPBX.connectSMDR(`sv9500`, smdrConnection, client, (response) => {
			
		});
	} else if(!continueInterval){
		clearInterval(intervalRequest);
	} else if(sendSMDRRequest){
		necPBX.sendSMDRRequest(smdrConnection, client, (smdrRequestBuffer) => {
			if(process.env.VERBOSE_CONSOLE ===`true`){
				console.log(`\t<=\tSMDR Request:\t` + smdrRequestBuffer);
			}
			if(process.env.VERBOSE_LOG){
				logFile(theDate(`dateTime`) + `\t:\t<=\tSMDR Request:\t` + smdrRequestBuffer, theDate(`date`) + `.log`);
			}
		});
	} else{
		necPBX.sendStatusMonitor(smdrConnection, client, (statusMonitorBuffer) => {
			if(process.env.VERBOSE_CONSOLE ===`true`){
				console.log(`\t<=\tStatus Monitor:\t` + statusMonitorBuffer);
			}
			if(process.env.VERBOSE_LOG){
				logFile(theDate(`dateTime`) + `\t:\t<=\tStatus Monitor:\t` +  statusMonitorBuffer, theDate(`date`) + `.log`);
			}
		});
		sendSMDRRequest = true;
	}
}, intervalTimer);



if(process.env.GET_FILES){
		// Collect files from directory
	if(process.argv.indexOf(`--smdrfile`) != -1){
		if(process.argv.indexOf(`--pathname`) != -1 && typeof process.argv[process.argv.indexOf(`--pathname`)+1] == `string`){
			smdrPath = path.join(__dirname, process.argv[process.argv.indexOf(`--pathname`)+1]);
		} else {
			smdrPath = path.join(__dirname, `SMDR_Data`);
		}
		// Check if path exists
		try {
			if (fs.existsSync(smdrPath)) {
				console.log(smdrPath);
			} else {
				if(process.argv.indexOf(`--forcedir`) != -1){
					fs.mkdir(smdrPath, function(err, response){
						if(err){
							console.log(err);
						} else {
							console.log(`Created Directory: ` + smdrPath);
						}
					});
				} else {
					console.log(`Path does not exist.`);
					console.log(`Create directory or use the --forcedir flag.`);
				}	
			}
			getFiles();
			setInterval(getFiles,intervalTimer);
		} catch(err) {
			console.err(err)
		}		
	}
}

if(process.env.GET_NEAX){
reconnectClient = true;
}
