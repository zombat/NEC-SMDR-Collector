 /*
	Module to conenct to buffer and respond to SMDR messages.
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
 
 module.exports = {
	 
	connectSMDR: (connectionType, smdrConnection, client, callback) => {
	// Connect to PBX for SMDR
		if(connectionType == `sv9500`){
			console.log(`Connecting to ` + connectionType + ` SMDR device ` + smdrConnection.device + ` at ` + smdrConnection.ipAddress + ` on port ` + smdrConnection.port);
			client.connect(smdrConnection.port, smdrConnection.ipAddress, (response) => { 
				
				callback(response);
			});
		}
	},
	
	sendSMDRRequest: (smdrConnection, client, callback) => {
	// Checks for SMD records at PBX.
	// Send SMDR_REQEST. Data Identifier 1 = Send billing data.
			var smdrRequestBuffer = new Buffer.from([0x16, 0x31, 0x30, 0x30, 0x30, 0x30, 0x32, 0x30, `0x3` + smdrConnection.device, 0x06]);
			// [Always 16, Identifier Kind, Data Length, Data Length, Data Length, Data Length , Data Length, Device Identifier , Device Identifier, Parity Byte]
			//       
            //                                                                                 ,---------------- DATA ----------------,
		client.write(smdrRequestBuffer);
		callback(smdrRequestBuffer);
	},
	
	respondSMDR: (client, identifierKind, deviceNumber, sequenceNumber, callback) => {
		if(identifierKind == `4`){
			var identifierKind = `0x34`;
		}
		
		switch(deviceNumber) {
			case `0`:
				deviceNumber = `0x30`;
				break;
			case `1`:
				deviceNumber = `0x31`;
				break;
			case `2`:
				deviceNumber = `0x32`;
				break;
			case `3`:
				deviceNumber = `0x33`;
				break;
		};
			switch(sequenceNumber) {
					case 0:
						var parityByte = `0x36`;
						sequenceNumber = `0x30`;
						break;
					case 1:
						var parityByte = `0x37`;
						sequenceNumber = `0x31`;
						break;
					case 2:
						var parityByte = `0x34`;
						sequenceNumber = `0x32`;
						break;
					case 3:
						var parityByte = `0x35`;
						sequenceNumber = `0x33`;
						break;
					case 4:
						var parityByte = `0x32`;
						sequenceNumber = `0x34`;
						break;
					case 5:
						var parityByte = `0x33`;
						sequenceNumber = `0x35`;
						break;
					case 6:
						var parityByte = `0x30`;
						sequenceNumber = `0x36`;
						break;
					case 7:
						var parityByte = `0x31`;
						sequenceNumber = `0x37`;
						break;
					case 8:
						var parityByte = `0x3E`;
						sequenceNumber = `0x38`;
						break;
					case 9:
						var parityByte = `0x3F`;
						sequenceNumber = `0x39`;
						break;
					default:
						break;
			};
		var bufferArray = [0x16, identifierKind, 0x30, 0x30, 0x30, 0x30, 0x34, 0x30, deviceNumber, sequenceNumber , 0x06, parityByte]
		var responseBuffer = new Buffer.from(bufferArray);
		client.write(responseBuffer);
		callback(responseBuffer);
	},
	
	sendStatusMonitor: (smdrConnection, client, callback) => {
	//	Send STATUS_MONITOR message to PBX. Data Identifier 5 = Heartbeat / Keep Alive.
	//	[Always 16, Identifier Kind, Data Length, Data Length, Data Length, Data Length , Data Length, Device Identifier , Device Identifier, 0x30 , 0x30 , 0x06, Parity Byte]
	//																								 ,-------------------------- DATA --------------------------,
	// var statusMonitorBuffer = new Buffer.from([0x16, 0x35, 0x30, 0x30, 0x30, 0x30, 0x35, 0x30, `0x3` + smdrConnection.device, 0x30, 0x30, 0x06, 0xF9]);
	switch(smdrConnection.device) {
		case 0:
			var parityByte = `0x06`;
			var device = `0x30`;
			break;
		case 1:
			var parityByte = `0x07`;
			var device = `0x31`;
			break;
		case 2:
			var parityByte = `0x34`;
			sequenceNumber = `0x32`;
			break;
		case 3:
			var parityByte = `0x35`;
			sequenceNumber = `0x33`;
			break;
	};
		var statusMonitorBuffer = new Buffer.from([0x16, 0x35, 0x30, 0x30, 0x30, 0x30, 0x35, 0x30, device, 0x30, 0x30, 0x06, 0x06]);
		client.write(statusMonitorBuffer);
		callback(statusMonitorBuffer);
	},
	
	sendDisconnectMessage: (smdrConnection, client) => {
		var connectionDisconnectBuffer = new Buffer.from([0x16, 0x36, 0x30, 0x30, 0x30, 0x30, 0x33, 0x30, `0x3` + smdrConnection.device, 0x06, 0x06]);
		console.log(`\n<= \n Connection Disconnect: `);
		console.log(connectionDisconnectBuffer);
		console.log(`<= \n`);
		
		client.write(connectionDisconnectBuffer);
	}
 
 }