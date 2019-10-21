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
		direction = `=>`;
	} else if(direction == `out`){
		direction = `<=`;
	} else if(direction == `equal`){
		direction = `--`;
	}
	var theMessage = `\t` + direction + `\t` + message + `:\t` + data;
	if(process.env.VERBOSE_CONSOLE ===`true`){
		console.log(theMessage);
	}
	if(process.env.VERBOSE_LOG){
		logFile(theDate(`dateTime`) + `\t:` + theMessage, theDate(`date`) + `.log`);
	}
};

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
						necSMDR.parseSMDR(smdrEntry, (response) => {
							dbFunctions.insertSMDRRecord(response, (response) => {
								logMessage(`other`, `SMDR String`, smdrEntry);
								logMessage(`in`, `Database Response`, JSON.stringify(response));
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
	
client.on(`error`, (err) => {
	// Listen for errs from PBX.
    if (err.code === `ETIMEDOUT`){
        console.log(`Connection timed out.`);
        client.exit;
    }
	logMessage(`equal`, `Client`, `Client Error`, err);
});

client.on(`ready`, () => {
	// Disable reconnection on client connection.
	console.log(`Client connected`);
	reconnectClient = false;
	logMessage(`equal`, `Client`, `Client connected`);
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
					necSMDR.parseSMDR(smdrRecord, (smdrObject) => {
						dbFunctions.insertSMDRRecord(smdrObject, (response) => {
							logMessage(`in`, `Database Response`, JSON.stringify(response));
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
	logMessage(`equal`, `Client`, `Client connection closed`);
});

var intervalRequest = setInterval( () => {
	// Main timer loop. 
	if(process.env.GET_FILES == `true`){
		getFiles();
		 clearInterval(intervalRequest);
	} else if(process.env.GET_NEAX == `true`){
		if(reconnectClient){
			necPBX.connectSMDR(`sv9500`, smdrConnection, client, (response) => {
				reconnectClient = false;
			});
		} else if(!continueInterval){
			clearInterval(intervalRequest);
		} else if(sendSMDRRequest){
			necPBX.sendSMDRRequest(smdrConnection, client, (smdrRequestBuffer) => {
				logMessage(`in`, `SMDR Request`, smdrRequestBuffer);
			});
		} else{
			necPBX.sendStatusMonitor(smdrConnection, client, (statusMonitorBuffer) => {
				logMessage(`in`, `Status Monitor`, statusMonitorBuffer);
			});
			sendSMDRRequest = true;
		}
	}
}, intervalTimer);

if(process.env.GET_NEAX){
reconnectClient = true;
}

checkDirectories();
