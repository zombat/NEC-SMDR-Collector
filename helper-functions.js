/*
		Helper functions
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

const fs = require(`fs`);

 module.exports = {
	 padZero: (input) => {
		// Pad digits with 0 if needed and returns two-digit format.
		if(input < 10){
			input = `0` + input;
			return(input);
		} else {
			return(input);
		}
	},

	theDate: (returnType) => {
		// Returns date or data/time.
		var dateFnc = new Date();
		var date = dateFnc.getFullYear() + `-` + (dateFnc.getMonth() + 1) + `-` + dateFnc.getDate();
		var time = dateFnc.getHours() + `:` + module.exports.padZero(dateFnc.getMinutes()) + `:` + module.exports.padZero(dateFnc.getSeconds());
		var dateTime = date + ` - ` + time;
		if(returnType == `date`){
			return date;
		} else if(returnType == `dateTime`){
		return dateTime;
		}
	},
	
	logFile: (message, fileName) => {
		// Append information to a log file.
		fs.appendFile(`./Logs/` + fileName, message + `\n`, `utf8`, (err) => {
		});
	},
	
	logMessage: (direction, message, data, fileName) => {
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
			module.exports.logFile(module.exports.theDate(`dateTime`) + `\t:` + theMessage, module.exports.theDate(`date`) + `.log`);
		}
	}
	
 }
