 /*
	Module to parse SMDR messages.
*/

 module.exports = {
	 
	parseSMDR:(rawSMDR, callback) => {
		var smdrObject = {
			'AccountCode': {},
			'AlternateRoutingInformationIncomingRouteNumber': {
				'Used': {},
				'FirstSelected': {}
				},
			'AuthorizationCode': {},
			'CalledPartyInformation': {
				'PhysicalNumber': {},
				'TelephoneNumber': {}
				},
			'CallingPartyInformation': {
				'PhysicalNumber': {},
				'TelephoneNumber': {}
				},
			'CallingStationNumber': {},
			'CallTime': {
				'Start': {},
				'End': {},
				'Duration': {}
				},
			'ConditionCodes': {
				'ConditionB': {},
				'ConditionC': {},
				'ConditionD': {}
				},
			'ConvertedNumber': {},
			'DepartmentCode': {},
			'DialCode': {},
			'DialedNumber': {},
			'IncomingTrunk': {},
			'MAID': {},
			'OfficeCodeInformation': {},
			'OutgoingTrunk':{},
			'IncomingTrunk': {},
			'RawSMDR': rawSMDR,
			'RecordTypeCode': rawSMDR.substring(3,5),
			'TrunkCallReceived': {
				'CallStart': {} 
				}					
		};
		switch(rawSMDR.substring(3,5)) {
				case `KJ`:
					smdrObject.RecordType = `Station-to-Station Extended Format`;
					module.exports.parseKJ(smdrObject);
					break;
				case `KK`:
					smdrObject.RecordType = `Outgoing Flexible Format`;
					module.exports.parseKK(smdrObject, (smdrObject) => {
						delete smdrObject.ProcessingSMDR;
						callback(smdrObject);
					});
					break;
				case `KL`:
					smdrObject.RecordType= `Incoming Flexible Format`;
					module.exports.parseKL(smdrObject, (smdrObject) => {
						delete smdrObject.ProcessingSMDR;
						callback(smdrObject);
					});
					break;
				case `KM`:
					smdrObject.RecordType = `Station-to-Station Flexible Format`;
					module.exports.parseKM(smdrObject, (smdrObject) => {
						delete smdrObject.ProcessingSMDR;
						callback(smdrObject);
					});
					break;
				default:
					break;
			}	
	},
	 
	 parseKJ: (smdrObject) => {
	/*
		RECORD – STATION-TO-STATION EXTENDED FORMAT
	*/
	
	// Calling Party Information
	// Only in 1000 & 2000 (RDS) Feature Packages. 3000 (RDS) and above, fields are blank.
	smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyID = smdrObject.RawSMDR.substring(11,12);
		// 0 = PBX/CTX (DID) station 
		// 1 = Attendant Console
	smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant = smdrObject.RawSMDR.substring(12,14);
	smdrObject.CallingPartyInformation.PhysicalNumber.CallingNumber = smdrObject.RawSMDR.substring(14,19).replace(/\s/,``);
		// Information shown in Calling Number fields depends on the Calling Party Identification. 
		// When character 011 is: 0 – Station number is shown 1 – Attendant number is shown
	
	// Calling Party Information
	// This is for 3000 (RDS) Series Feature Package and higher.
	//smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyID = smdrObject.RawSMDR.substring(11,12);
	if(smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant == `00`){
		smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant = smdrObject.RawSMDR.substring(50,53);
	}
	
	//smdrObject.CallingPartyInformation.PhysicalNumber.CallingNumber = smdrObject.RawSMDR.substring(14,19).replace(/\s/,``);

	
	// Call Start Time
	// For Station-To-Station this time begins when called party answers.
	smdrObject.CallTime.Start.Month = parseInt(smdrObject.RawSMDR.substring(20,22));
	smdrObject.CallTime.Start.Day = parseInt(smdrObject.RawSMDR.substring(22,24));
	smdrObject.CallTime.Start.Hour = parseInt(smdrObject.RawSMDR.substring(24,26));
	smdrObject.CallTime.Start.Minute = parseInt(smdrObject.RawSMDR.substring(26,28));
	smdrObject.CallTime.Start.Second = parseInt(smdrObject.RawSMDR.substring(28,30));
		
	// Call End Time
	smdrObject.CallTime.End.Month = parseInt(smdrObject.RawSMDR.substring(30,32));
	smdrObject.CallTime.End.Day = parseInt(smdrObject.RawSMDR.substring(32,34));
	smdrObject.CallTime.End.Hour = parseInt(smdrObject.RawSMDR.substring(34,36));
	smdrObject.CallTime.End.Minute = parseInt(smdrObject.RawSMDR.substring(36,38));
	smdrObject.CallTime.End.Second = parseInt(smdrObject.RawSMDR.substring(38,40));
	
	// Account Code
	smdrObject.AccountCode.AccountCode = smdrObject.RawSMDR.substring(40,50);
	
	// Condition Codes
	smdrObject.ConditionCodes.ConditionCodeOne = smdrObject.RawSMDR.substring(53,54);
		// Example: Station-A calls Station-B, talks for 10 minutes then transfers outside to Station-C. The SMDR record will show Condition 1. (Note: ASYD System 1 Index 33 will effect who is billed on a transfer)
	smdrObject.ConditionCodes.ConditionCodeTwo = smdrObject.RawSMDR.substring(54,55);
		// Set to ‘0’
	smdrObject.ConditionCodes.ConditionCodeThree = smdrObject.RawSMDR.substring(55,56);
	
	// Route Advance
	// Normally Blank
	// smdrObject.RawSMDR.substring(56,62);
	}, 
	 
	 
	callDuration: (smdrObject, callback) => {
		smdrObject.CallTime.Start.TimeStamp = new Date(smdrObject.CallTime.Start.Year, smdrObject.CallTime.Start.Month, smdrObject.CallTime.Start.Day, smdrObject.CallTime.Start.Hour, smdrObject.CallTime.Start.Minute, smdrObject.CallTime.Start.Second, smdrObject.CallTime.Start.Millisecond);		
		smdrObject.CallTime.End.TimeStamp = new Date(smdrObject.CallTime.End.Year, smdrObject.CallTime.End.Month, smdrObject.CallTime.End.Day, smdrObject.CallTime.End.Hour, smdrObject.CallTime.End.Minute, smdrObject.CallTime.End.Second, smdrObject.CallTime.End.Millisecond);		
		smdrObject.CallTime.Duration.Milliseconds = smdrObject.CallTime.End.TimeStamp - smdrObject.CallTime.Start.TimeStamp;	
		callback(smdrObject);
	},
	
	// SMDR Flexible Format Functions
	
	getCPIType: (inputCode) => {
		switch(inputCode) {
			case `0`:
				return(`PBX/CTX (DID) station`);
				break;
			case `1`:
				return(`Attendant Console`);
				break;
			case `2`:
				return(`Incoming Trunk`);
				break;
			default:
				return(`Unexpected Value`);
				break;
		}
	},
	
	getConditionCodeType: (conditionNumber, inputCode) => {
		switch (true) {
			case ((conditionNumber == `0`) && (inputCode === `0`)) :
				return(`No Condition`);
				break;
			case ((conditionNumber == `0`) && (inputCode === `1`)) :
				return(`Call was transferred`);
				break;	
			case ((conditionNumber == `0`) && (inputCode === `2`)) :
				return(`Billing is continued`);
				break;
			case ((conditionNumber == `0`) && (inputCode === `3`)) :
				return(`Call was transferred & Billing is continued`);
				break;
			case ((conditionNumber == `0`) && (inputCode === `4`)) :
				return(`Call was transferred to last called party`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `0`)) :
				return(`No Condition`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `1`)) :
				return(`by OG Queuing`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `2`)) :
				return(`by dialing with Account Code`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `3`)) :
				return(`by OG Queuing & dialing with Account Code`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `4`)) :
				return(`by Forward Outside`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `5`)) :
				return(`Not Used`);
				break;
			case ((conditionNumber == `1`) && (inputCode === `6`)) :
				return(`by Forward Outside & dialing with Account Code`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `0`)) :
				return(`No Condition`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `1`)) :
				return(`via Att Con`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `2`)) :
				return(`Direct (Alternate Routing)`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `3`)) :
				return(`via Att Con (Alternate Routing)`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `4`)) :
				return(`Direct (LCR Routing)`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `5`)) :
				return(`via Att Con (LCR Routing)`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `6`)) :
				return(`Direct (Called number = first 6 digits of Converted Number)`);
				break;
			case ((conditionNumber == `2`) && (inputCode === `7`)) :
				return(`via Att Con (Called number = first 6 digits of Converted Number)`);
				break;
			default:
				return(`Unexpected Value`);
				break;
		}	
	},
	
	getChargeInformation:(inputCode) => {
		switch(inputCode) {
			case `0`:
				return(`No Charge Information`);
				break;
			case `1`:
				return(`1 cent unit`);
				break;
			case `2`:
				return(`0.1 cent unit`);
				break;
			case `3`:
				return(`10 cent unit`);
				break;
			case `4`:
				return(`$1 unit`);
				break;
			case `5`:
				return(`$10 unit`);
				break;
			case `6`:
				return(`Calling Metering (4 digits)`);
				break;
			case `F`:
				return(`Charge Information Error`);
				break;
			default:
				return(`Unexpected Value`);
				break;
		}
	},
	
	getCPNaniID: (inputCode) => {
		switch(inputCode) {
			case `0`:
				return(`Unable to output`);
				break;
			case `1`:
				return(`Display`);
				break;
			case `2`:
				return(`Unable to Notify`);
				break;
			case `3`:
				return(`Out of Service (Out of Area)`);
				break;
			case `4`:
				return(`Public Telephone Origination`);
				break;
			default:
				return(`Unexpected Value`);
				break;
		}
	},		

	smdrSection01: (smdrObject, outgoingIncoming, callback) => {	
	// 01 Outgoing Trunk / Incoming Trunk information
		var variableCharacter = 0;
		if(outgoingIncoming == `outgoing`){
			if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `01`){
				smdrObject.OutgoingTrunk.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter+=2;
				smdrObject.OutgoingTrunk.KindofData = `Outgoing Trunk`;
				smdrObject.OutgoingTrunk.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter+=2;
				smdrObject.OutgoingTrunk.SeizedFusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.OutgoingTrunk.PhysicalOutgoingRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.OutgoingTrunk.TrunkNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.OutgoingTrunk.LogicalOutgoingRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
			}
		} else if(outgoingIncoming == `incoming`){
			if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `01`){
				smdrObject.IncomingTrunk.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter+=2;
				smdrObject.IncomingTrunk.KindofData = `Incoming Trunk`;
				smdrObject.IncomingTrunk.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter+=2;
				smdrObject.IncomingTrunk.SeizedFusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.IncomingTrunk.PhysicalOutgoingRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.IncomingTrunk.TrunkNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.IncomingTrunk.LogicalOutgoingRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter+=3;
				smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
			}
		}	
		callback(smdrObject);
	},

	smdrSection02: (smdrObject, callback) => {	
	// 02 Calling Party Information (Physical Number)
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `02`){
			smdrObject.CallingPartyInformation.PhysicalNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CallingPartyInformation.PhysicalNumber.KindofData = `Calling Party Information (Physical number)`;
			smdrObject.CallingPartyInformation.PhysicalNumber.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyIdentification = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter+=1;
			smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter+=3;
			smdrObject.CallingPartyInformation.PhysicalNumber.CallingNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+6).replace(/\s/,``);
			variableCharacter+=6;
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);	
	},

	smdrSection03: (smdrObject, callback) => {
	// 03 Calling Party Information (Telephone Number)
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `03`){
			smdrObject.CallingPartyInformation.TelephoneNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CallingPartyInformation.TelephoneNumber.KindofData = `Calling Party Number (Telephone Number or Logical Route)`;
			smdrObject.CallingPartyInformation.TelephoneNumber.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter+=2;
			smdrObject.CallingPartyInformation.TelephoneNumber.FusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			if(smdrObject.CallingPartyInformation.TelephoneNumber.LengthofData != 3){
				smdrObject.CallingPartyInformation.TelephoneNumber.FusionUserGroupNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter +=3;
				smdrObject.CallingPartyInformation.TelephoneNumber.LogicalNumber = smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+smdrObject.CallingPartyInformation.TelephoneNumber.LengthofData-6);
				variableCharacter += smdrObject.CallingPartyInformation.TelephoneNumber.LengthofData-6;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection04: (smdrObject, callback) => {
	// 04 Called Party Information (Physical Number)
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `04`){
			smdrObject.CalledPartyInformation.PhysicalNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CalledPartyInformation.PhysicalNumber.KindofData = `Called Party Information (Physical number)`;
			smdrObject.CalledPartyInformation.PhysicalNumber.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CalledPartyInformation.PhysicalNumber.CallingPartyIdentificationCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter+=1;
			smdrObject.CalledPartyInformation.PhysicalNumber.CallingPartyIdentification = module.exports.getCPIType(smdrObject.CalledPartyInformation.PhysicalNumber.CallingPartyIdentificationCode);
			smdrObject.CalledPartyInformation.PhysicalNumber.CallingPartyTenant = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter+=3;
			smdrObject.CalledPartyInformation.PhysicalNumber.CallingNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+6).replace(/\s/,``);
			variableCharacter+=6;	
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection05: (smdrObject, callback) => {
	// 05 Called Party Information (Telephone Number)
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `05`){
			smdrObject.CalledPartyInformation.TelephoneNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter+=2;
			smdrObject.CalledPartyInformation.TelephoneNumber.KindofData = `Called Party Number (Telephone Number or Logical Route)`;
			smdrObject.CalledPartyInformation.TelephoneNumber.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter+=2;
			smdrObject.CalledPartyInformation.TelephoneNumber.FusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			if(smdrObject.CalledPartyInformation.TelephoneNumber.LengthofData != 3){
				smdrObject.CalledPartyInformation.TelephoneNumber.FusionUserGroupNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter +=3;
				smdrObject.CalledPartyInformation.TelephoneNumber.LogicalNumber = smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+smdrObject.CalledPartyInformation.TelephoneNumber.LengthofData -6);
				variableCharacter += smdrObject.CalledPartyInformation.TelephoneNumber.LengthofData-6;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection06: (smdrObject, callback) => { 
	// 06 Call Start Time / Call End Time
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `06`){
			smdrObject.CallTime.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.CallTime.KindofData = `Call Start / End Time`;
			smdrObject.CallTime.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			
				// Call Start Time
				smdrObject.CallTime.Start.Year =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+4));
				variableCharacter +=4;
				smdrObject.CallTime.Start.Month =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.Start.Day =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.Start.Hour =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.Start.Minute =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.Start.Second =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.Start.Millisecond =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3));
				variableCharacter +=3;		
			
				// Call End Time
				smdrObject.CallTime.End.Year =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+4));
				variableCharacter +=4;
				smdrObject.CallTime.End.Month =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.End.Day =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.End.Hour =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.End.Minute =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.End.Second =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
				variableCharacter +=2;
				smdrObject.CallTime.End.Millisecond =  parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3));
				variableCharacter +=3;	
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection07: (smdrObject, callback) => { 
	// 07 Account Code
		var variableCharacter = 0;	
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `07`){	
			smdrObject.AccountCode.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.AccountCode.KindofData = `Account Code`;
			smdrObject.AccountCode.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			if(smdrObject.AccountCode.LengthofData > 1){
				smdrObject.AccountCode.AccountCode = smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+smdrObject.AccountCode.LengthofData-1);
				variableCharacter += smdrObject.AccountCode.LengthofData-1;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection08: (smdrObject, callback) => { 	
	// 08 Condition B Information
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `08`){	
			smdrObject.ConditionCodes.ConditionB.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.ConditionCodes.ConditionB.KindofData = `Condition ‘B’ Codes`;
			smdrObject.ConditionCodes.ConditionB.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.ConditionCodes.ConditionB.ConditionCodeZeroCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter +=1;
			smdrObject.ConditionCodes.ConditionB.ConditionCodeOneCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter +=1;
			smdrObject.ConditionCodes.ConditionB.ConditionCodeTwoCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter +=1;
			smdrObject.ConditionCodes.ConditionB.ConditionCodeZero = module.exports.getConditionCodeType( `0` , smdrObject.ConditionCodes.ConditionB.ConditionCodeZeroCode);
			smdrObject.ConditionCodes.ConditionB.ConditionCodeOne = module.exports.getConditionCodeType( `1` , smdrObject.ConditionCodes.ConditionB.ConditionCodeOneCode);
			smdrObject.ConditionCodes.ConditionB.ConditionCodeTwo = module.exports.getConditionCodeType( `2` , smdrObject.ConditionCodes.ConditionB.ConditionCodeTwoCode);
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection09: (smdrObject, callback) => { 	
	// 09 Alternate Routing Information / Incoming Route Number
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2) == `09`){	
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.KindofData = `Alternate Routing`;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.Used.FusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.Used.PhysicalRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.Used.LogicalRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.FirstSelected.FusionPointCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.FirstSelected.PhysicalRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.AlternateRoutingInformationIncomingRouteNumber.FirstSelected.LogicalRouteNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection10: (smdrObject, callback) => { 	
	// 10 Dial Code
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `10`){
			smdrObject.DialCode.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.DialCode.KindofData = `Dialed Number`;
			smdrObject.DialCode.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			smdrObject.DialCode.DialCode = smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+smdrObject.DialCode.LengthofData-1);
			variableCharacter += smdrObject.DialCode.LengthofData-1;
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);	
		}
		callback(smdrObject);
	},

	smdrSection11: (smdrObject, callback) => { 
	// 11 Office Code Information
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `11`){
			smdrObject.OfficeCodeInformation.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.OfficeCodeInformation.KindofData = `Office Code Information (May be omitted)`;
			smdrObject.OfficeCodeInformation.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.OfficeCodeInformation.OfficeCodeofCallingParty = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+4);
			variableCharacter +=4;
			smdrObject.OfficeCodeInformation.OfficeCodeofBillingProcessOffice = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+4);
			variableCharacter +=4;
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection12: (smdrObject, callback) => { 
	// 12 Authorization Code
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `12`){
			smdrObject.AuthorizationCode.KindofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.AuthorizationCode.KindofDataCode = `Authorization Code`;
			smdrObject.AuthorizationCode.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			if(smdrObject.AuthorizationCode.LengthofData != 1){
				smdrObject.AuthorizationCode.AuthorizationCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+smdrObject.AuthorizationCode.LengthofData-1);
				variableCharacter +=smdrObject.AuthorizationCode.LengthofData-1;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection13: (smdrObject, callback) => {
	// 13 Condition C Information & Billing Information / Call Metering Information
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `13`){
			smdrObject.ConditionCodes.ConditionC.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.ConditionCodes.ConditionC.KindofData = `Call Metering Info + Condition ‘C’ information`;
			smdrObject.ConditionCodes.ConditionC.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			if(smdrObject.ConditionCodes.ConditionC.LengthofData != 1){
				smdrObject.ConditionCodes.ConditionC.ChargeInformationCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
				variableCharacter +=1;
				smdrObject.ConditionCodes.ConditionC.ChargeInformation = module.exports.getChargeInformation(smdrObject.ConditionCodes.ConditionC.ChargeInformationCode);
				smdrObject.ConditionCodes.ConditionC.ChargeData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+smdrObject.ConditionCodes.ConditionC.LengthofData-1);
				variableCharacter +=smdrObject.ConditionCodes.ConditionC.LengthofData-1;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection14: (smdrObject, callback) => {
	//14 Condition D Information & Billing Notification AttCon Number
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `14`){
			smdrObject.ConditionCodes.ConditionD.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.ConditionCodes.ConditionD.KindofData = `Bill Notification Attendant Console + Condition ‘D’ Information`;
			smdrObject.ConditionCodes.ConditionD.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			smdrObject.ConditionCodes.ConditionD.BillNotififyByAttCon = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter +=1;
			if(smdrObject.ConditionCodes.ConditionD.LengthofData > 1){
				smdrObject.ConditionCodes.ConditionD.AttCon = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+smdrObject.ConditionCodes.ConditionD.LengthofData-1);
				variableCharacter +=smdrObject.ConditionCodes.ConditionD.LengthofData-1;
			}	
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection15: (smdrObject, callback) => {
	// 15 Department Code
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `15`){
			smdrObject.DepartmentCode.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.DepartmentCode.KindofData = `Department Code`;
			smdrObject.DepartmentCode.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.DepartmentCode.DepartmentCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
			variableCharacter +=3;
		smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection16: (smdrObject, callback) => {
	// 16 Calling Station Number / ANI
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `16`){
			smdrObject.CallingStationNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.CallingStationNumber.KindofData = `Calling Party Number / ANI`;
			smdrObject.CallingStationNumber.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			smdrObject.CallingStationNumber.CallingPartyNumberANIPresentIdentifierCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+1);
			variableCharacter +=1;
			smdrObject.CallingStationNumber.CallingPartyNumberANIPresentIdentifier = module.exports.getCPNaniID(smdrObject.CallingStationNumber.CallingPartyNumberANIPresentIdentifierCode);
			if(smdrObject.CallingStationNumber.LengthofData != 1){
				smdrObject.CallingStationNumber.CallingPartyNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+smdrObject.CallingStationNumber.LengthofData-1);
				variableCharacter +=smdrObject.CallingStationNumber.LengthofData-1;
			}
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection17: (smdrObject, callback) => {
	// 17 Converted Number
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `17`){
			smdrObject.ConvertedNumber.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.ConvertedNumber.KindofData = `Converted Number Included when ASYD index 34, bit 5 = 1`;
			smdrObject.ConvertedNumber.LengthofData = parseInt(smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2));
			variableCharacter +=2;
			smdrObject.ConvertedNumber.ConvertedNumber = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+smdrObject.ConvertedNumber.LengthofData);
			variableCharacter +=smdrObject.ConvertedNumber.LengthofData;
			
			
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection18: (smdrObject, callback) => {
	// 18 MA-ID (Multi Area ID) R15 software and above
		var variableCharacter = 0;
		if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `18`){ 
			smdrObject.MAID.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.MAID.KindofData = `18 Multi-Area ID (MA-ID) Included when ASYDL index 589, bit 0= 1`;
			smdrObject.MAID.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
			variableCharacter +=2;
			smdrObject.MAID.CallingPartyMAID = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+5);
			variableCharacter +=5;
			smdrObject.MAID.SeizedRouteMAID = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+5);
			variableCharacter +=5;
			smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
		}
		callback(smdrObject);
	},

	smdrSection19: (smdrObject, callback) => {
	// 19 Trunk Call Received Time R20 software and above
		var variableCharacter = 0;
			if(smdrObject.ProcessingSMDR.substring(variableCharacter, variableCharacter+2) == `19`){ 
				smdrObject.TrunkCallReceived.KindofDataCode = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.KindofData = `Trunk Call Received`;
				smdrObject.TrunkCallReceived.LengthofData = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Year = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+4);
				variableCharacter +=4;
				smdrObject.TrunkCallReceived.CallStart.Month = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Day = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Hour = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Minute = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Second = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+2);
				variableCharacter +=2;
				smdrObject.TrunkCallReceived.CallStart.Millisecond = smdrObject.ProcessingSMDR.substring(variableCharacter,variableCharacter+3);
				variableCharacter +=3;
				smdrObject.ProcessingSMDR = smdrObject.ProcessingSMDR.substring(variableCharacter,smdrObject.ProcessingSMDR.length);
			}
			callback(smdrObject);
	},

	parseKK: (smdrObject, callback) => {
	/*
		KK RECORD – OUTGOING FLEXIBLE FORMAT
	*/
		smdrObject.ProcessingSMDR = smdrObject.RawSMDR.substring(5, smdrObject.length)
		
		// 01 Outgoing Trunk / Incoming Trunk information
		module.exports.smdrSection01(smdrObject, `outgoing`, () => {
			
			// 02 Calling Party Information (Physical Number)
			module.exports.smdrSection02(smdrObject,  () => { 
			
				// 03† Calling Party Information (Telephone Number)
				module.exports.smdrSection03(smdrObject, () => { 
				
					// 06 Call Start Time / Call End Time
					module.exports.smdrSection06(smdrObject,  () => { 
					
						// 07† Account Code
						module.exports.smdrSection07(smdrObject,  () => { 
					
							// 08 Condition B Information
							module.exports.smdrSection08(smdrObject,  () => { 
				
								// 09 Alternate Routing Information / Incoming Route Number
								module.exports.smdrSection09(smdrObject,  () => { 
								
									// 10 Dial Code
									module.exports.smdrSection10(smdrObject,  () => { 
									
										// 11† Office Code Information
										module.exports.smdrSection11(smdrObject,  () => {
											
											// 12† Authorization Code
											module.exports.smdrSection12(smdrObject,  () => {
												
												// 13† Condition C Information & Billing Information / Call Metering Information
												module.exports.smdrSection13(smdrObject,  () => {
												
													// 14† Condition D Information & Billing Notification AttCon Number
													module.exports.smdrSection14(smdrObject,  () => {
		
														// 15† Department Code
														module.exports.smdrSection15(smdrObject,  () => {
		
															// 16 Calling Station Number
															module.exports.smdrSection16(smdrObject,  () => {
															
																// 17† Converted Number
																module.exports.smdrSection17(smdrObject,  () => {
															
																	// 18† MA-ID (Multi Area ID) R15 software and above
																	module.exports.smdrSection18(smdrObject,  () => {
																	});
																});		
															});			
														});			
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});	
		callback(smdrObject);
	},
	
	parseKL: (smdrObject, callback) => {
	/*
		KL RECORD – INCOMING FLEXIBLE FORMAT
	*/
		smdrObject.ProcessingSMDR = smdrObject.RawSMDR.substring(5, smdrObject.length)
		
		// 01 Outgoing Trunk / Incoming Trunk information
		module.exports.smdrSection01(smdrObject, `incoming`, () => {
		
			// 04 Called Party Information (Physical Number)
			module.exports.smdrSection04(smdrObject, () => {
				
				// 05† Called Party Information (Telephone Number)
				module.exports.smdrSection05(smdrObject, () => {
		
					// 06 Call Start Time / Call End Time
					module.exports.smdrSection06(smdrObject,  () => { 
		
						// 07† Account Code
						module.exports.smdrSection07(smdrObject,  () => { 
						
							// 08 Condition B Information
							module.exports.smdrSection08(smdrObject,  () => { 
				
								// 09 Alternate Routing Information / Incoming Route Number
								module.exports.smdrSection09(smdrObject,  () => { 
								
									// 10 Dial Code
									module.exports.smdrSection10(smdrObject,  () => { 
									
										// 11† Office Code Information
										module.exports.smdrSection11(smdrObject,  () => {
											
											// 12† Authorization Code
											module.exports.smdrSection12(smdrObject,  () => {
												
												// 13† Condition C Information & Billing Information / Call Metering Information
												module.exports.smdrSection13(smdrObject,  () => {
													
													// 16† Calling Station Number / ANI
													module.exports.smdrSection16(smdrObject,  () => {
														
														// 18† MA-ID (Multi Area ID) R15 software and above
														module.exports.smdrSection18(smdrObject,  () => {
															
															// 19† Trunk Call Received Time R20 software and above
															module.exports.smdrSection19(smdrObject,  () => {
																
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});	
		callback(smdrObject);
	},


	parseKM:(smdrObject, callback) => {
	/*
		KM RECORD – STATION-TO-STATION FLEXIBLE FORMAT
	*/
		smdrObject.ProcessingSMDR = smdrObject.RawSMDR.substring(5, smdrObject.length)
		// 02 Calling Party Information (Physical Number)
		module.exports.smdrSection02(smdrObject,  () => {
			
			// 03† Calling Party Information (Telephone Number)
			module.exports.smdrSection03(smdrObject, () => {
				
				// 04 Called Party Information (Physical Number)
				module.exports.smdrSection04(smdrObject, () => {
		
					// 05† Called Party Information (Telephone Number)
					module.exports.smdrSection05(smdrObject, () => {
		
						// 06 Call Start Time / Call End Time
						module.exports.smdrSection06(smdrObject, () => {
			
							// 07† Account Code
							module.exports.smdrSection07(smdrObject, () => {
		
								// 08 Condition B Information
								module.exports.smdrSection08(smdrObject, () => {
									
									// 10 Dialed Number
									module.exports.smdrSection10(smdrObject, () => {
		
										// 18† MA-ID (Multi Area ID) R15 software and above
										module.exports.smdrSection18(smdrObject, () => {
											
											// Call Duration
											module.exports.callDuration(smdrObject, () => {
											
											});
										});
									});
								});
							});
						});			
					});
				});
			});
		});
		callback(smdrObject);
	}	
	
	
	
 }