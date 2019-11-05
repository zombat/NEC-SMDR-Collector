/*
	Notify Functions
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
const 	physicalNumber = process.env.USE_PHYSICAL_NUMBER;
		dbFunctions = require(`./mongo-db.js`),
		nodemailer = require(`nodemailer`),
		transporter = nodemailer.createTransport({
			host: process.env.SMTP_SERVER_HOST,
			port: process.env.SMTP_SERVER_PORT,
			requireTLS: process.env.SMTP_SERVER_TLS,
			secure: process.env.SMTP_SERVER_SMTP_SERVER_SECURE,
			auth: {
				user: process.env.SMTP_SERVER_USER, 
				pass: process.env.SMTP_SERVER_PASSWORD
			},
			tls: {
				rejectUnauthorized : process.env.SMTP_SERVER_REJECT_CERTS
			}
			}),
		fromString = `"` + process.env.SMTP_SERVER_USER_FRIENDLY + `" <` + process.env.SMTP_SERVER_USER + `>` ;
var 	searchQuery = {},
		queryTest = true;
 
 module.exports = {
	processNotification: (smdrObject, callback) => {
		dbFunctions.getNotifyInfo( (documents) => {
				if(documents != null){
					documents.forEach( (document) => {
						if(document.hasOwnProperty(`Enabled`) && document.Enabled){
							var emailContent = ``;
							var emailSubject = `Call Notification: ` + document[`Rule Name`];
							if(document.hasOwnProperty(`Email HTML`)){
								var emailContentType = `html`;
							} else if(document.hasOwnProperty(`Email Text`)){
								var emailContentType = `text`;
							}
							var notify = false;
							if(physicalNumber && smdrObject.CallingPartyInformation.PhysicalNumber.hasOwnProperty(`CallingPartyTenant`)){
								var tenant = parseInt(smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant) || false;
								var callingNumber = parseInt(smdrObject.CallingPartyInformation.PhysicalNumber.CallingNumber) || false;
								var calledNumber = parseInt(smdrObject.CalledPartyInformation.PhysicalNumber.CalledNumber) || false;
								if(smdrObject.OutgoingTrunk.hasOwnProperty(`PhysicalOutgoingRouteNumber`) && smdrObject.OutgoingTrunk.hasOwnProperty(`TrunkNumber`)){
									var outRoute = parseInt(smdrObject.OutgoingTrunk.PhysicalOutgoingRouteNumber);
									var outTrunk = parseInt(smdrObject.OutgoingTrunk.TrunkNumber);
								} else {
									var outRoute = false;
									var outTrunk = false;
								}
								if(smdrObject.IncomingTrunk.hasOwnProperty(`PhysicalIncomingRouteNumber`) && smdrObject.IncomingTrunk.hasOwnProperty(`TrunkNumber`)){
									var inRoute = parseInt(smdrObject.IncomingTrunk.PhysicalIncomingRouteNumber);
									var inTrunk = parseInt(smdrObject.IncomingTrunk.TrunkNumber);
								} else {
									var inRoute = false;
									var inTrunk = false;
								}
							} else {
								var tenant = parseInt(smdrObject.CallingPartyInformation.TelephoneNumber.CallingPartyTenant)  || 0;
								var callingNumber = parseInt(smdrObject.CallingPartyInformation.TelephoneNumber.CallingNumber) || false;
								var calledNumber = parseInt(smdrObject.CalledPartyInformation.TelephoneNumber.CalledNumber) || false;
							}
							if(callingNumber){
								if(emailContentType == `text`){
									emailContent += `Calling Station: ` + callingNumber + `\n`;
								} else {
									emailContent += `<p>Calling Station: ` + callingNumber + `</p>`;
								}
							}
							
							if(document.hasOwnProperty(`Tenant`)){
								if(document.Tenant == tenant){
									notify = true;				
									if(emailContentType == `text`){
										emailContent += `Tenant Number: ` + tenant + `\n`;
									} else {
										emailContent += `<p>Tenant Number: ` + tenant + `</p>`;
									}
								} else {
									notify = false;
								}
							}
							if(document.hasOwnProperty(`MAID`)){
								if(smdrObject.MAID.hasOwnProperty(`CallingPartyMAID`)){
									notify = true;		
									if(emailContentType == `text`){
										emailContent += `Message Area ID: ` + smdrObject.MAID.CallingPartyMAID + `\n`;
									} else {
										emailContent += `<p>Message Area ID: ` + smdrObject.MAID.CallingPartyMAID + `</p>`;
									}
								} else {
									notify = false;
								}	
							}
							if(document.hasOwnProperty(`Dialed Number`)){
								if(smdrObject.DialCode.hasOwnProperty(`DialCode`) && document[`Dialed Number`] ==  smdrObject.DialCode.DialCode){
									notify = true;	
									if(emailContentType == `text`){
										emailContent += `Dialed Number: ` + smdrObject.DialCode.DialCode + `\n`;
									} else {
										emailContent += `<p>Dialed Number: ` + smdrObject.DialCode.DialCode + `</p>`;
									}
									if(outRoute && outTrunk){
										if(emailContentType == `text`){
											emailContent += `Route : ` + outRoute + `\n`;
											emailContent += `Trunk : ` + outTrunk + `\n`;
										} else {
											emailContent += `<p>Route: ` + outRoute + `</p>`;
											emailContent += `<p>Trunk: ` + outTrunk + `</p>`;
										}
									}
								} else {
									notify = false;
								}			
							}
							if(document.hasOwnProperty(`Calling Station`)){
								if(document[`Calling Station`] ==  callingNumber){
									notify = true;
									if(outRoute && outTrunk){
										if(emailContentType == `text`){
											emailContent += `Route : ` + outRoute + `\n`;
											emailContent += `Trunk : ` + outTrunk + `\n`;
										} else {
											emailContent += `<p>Route: ` + outRoute + `</p>`;
											emailContent += `<p>Trunk: ` + outTrunk + `</p>`;
										}
									}
									if(calledNumber){				
										if(emailContentType == `text`){
											emailContent += `Called Station: ` + calledNumber + `\n`;
										} else {
											emailContent += `<p>Called Station: ` + calledNumber + `</p>`;
										}
									}
									if(smdrObject.DialCode.hasOwnProperty(`DialCode`)){
										if(emailContentType == `text`){
											emailContent += `Dialed Number: ` + smdrObject.DialCode.DialCode + `\n`;
										} else {
											emailContent += `<p>Dialed Number: ` + smdrObject.DialCode.DialCode + `</p>`;
										}
									}
								} else {
									notify = false;
								}
							}
							if(document.hasOwnProperty(`Called Station`)){		
								if(document[`Called Station`] == calledNumber){
									dbFunctions.getDeviceName(document[`Called Station`], (response) => {
										console.log(response);
									});
									notify = true;
									if(emailContentType == `text`){
										emailContent += `Called Station: ` + calledNumber + `\n`;
										if(inRoute && inTrunk){
											emailContent += `Route : ` + inRoute + `\n`;
											emailContent += `Trunk : ` + inTrunk + `\n`
										}			
									} else {
										emailContent += `<p>Called Station: ` + calledNumber + `</p>`;
										if(inRoute && inTrunk){
											emailContent += `<p>Route: ` + inRoute + `</p>`;
											emailContent += `<p>Trunk: ` + inTrunk + `</p>`;
										}
									}
									if(smdrObject.CallingStationNumber.hasOwnProperty(`CallingPartyNumber`)){
										if(emailContentType == `text`){
											emailContent += `Calling Number: ` + smdrObject.CallingStationNumber.CallingPartyNumber + `\n`;
										} else {
											emailContent += `<p>Calling Number: ` + smdrObject.CallingStationNumber.CallingPartyNumber + `</p>`;
										}
									}									
								} else {
									notify = false;
								}
							}
							if(document.hasOwnProperty(`Route`)){
								if(document.Route == outRoute){
									notify = true;
									if(emailContentType == `text`){
										emailContent += `Route: ` + outRoute + `\n`;
									} else {
										emailContent += `<p>Route: ` + outRoute + `</p>`;
									}
								} else {
									notify = false;
								}
							}
							if(document.hasOwnProperty(`Trunk`)){
								if(document.Trunk == outTrunk){
									notify = true;
									if(emailContentType == `text`){
										emailContent += `Trunk: ` + outTrunk + `\n`;
									} else {
										emailContent += `<p>Trunk: ` + outTrunk + `</p>`;
									}
								} else {
									notify = false;
								}
							}
							if(emailContentType == `html`){
								emailContent += document[`Email HTML`];
							} else if(emailContentType == `text` && document.hasOwnProperty(`Email Text`)) {
								document[`Email Text`].forEach( (contentLine) => { 
									emailContent += contentLine + `\n`;
								});
							}
							if(notify && typeof(document[`Notify List`]) == `object`){
								console.log(emailContent);
								if(document.hasOwnProperty(`Notify List`) && emailContentType != undefined){
									document[`Notify List`].forEach( (emailAddress) => {
										module.exports.sendMail(emailAddress, emailSubject, emailContentType, emailContent, (emailResponse) => {
											console.log(emailResponse);
										});
									});
								}
								callback(document[`Rule Name`]);
							} else {
								callback(null);
							}
						}		
					});
				}
			});
	},
	
	sendMail: (emailTo, emailSubject, emailContentType, emailContent, callback) => {
		var emailParameters = {
			from: fromString,
			to: emailTo, 
			subject: emailSubject
			};
		if(emailContentType == `text`){
			emailParameters.text = emailContent
		} else if(emailContentType == `html`) {
			emailParameters.html = emailContent
		}	 
		if(emailTo.length){
			transporter.sendMail(emailParameters, (err, mailResponse) => {
				if(err){
					callback(err)
				} else {
					callback(mailResponse);
				}
			});
		}
	}
 
 };
