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
			requireTLS: true,
			secure: false,
			// secure: process.env.SMTP_SERVER_SECURITY,
			auth: {
				user: process.env.SMTP_SERVER_USER, 
				pass: process.env.SMTP_SERVER_PASSWORD
			},
			tls: {
				rejectUnauthorized : "false"
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
						var emailContent = ``;
						var emailSubject = `Call Notification: ` + document[`Rule Name`];
						if(document.hasOwnProperty(`Email HTML`)){
							var emailContentType = `html`;
						} else if(document.hasOwnProperty(`Email Text`)){
							var emailContentType = `text`;
						}
						var notify = false;
						if(physicalNumber && smdrObject.CallingPartyInformation.PhysicalNumber.hasOwnProperty(`CallingPartyTenant`)){
							var tenant = parseInt(smdrObject.CallingPartyInformation.PhysicalNumber.CallingPartyTenant);
							var callingNumber = parseInt(smdrObject.CallingPartyInformation.PhysicalNumber.CallingNumber);
							var calledNumber = parseInt(smdrObject.CalledPartyInformation.PhysicalNumber.CallingNumber);
							if(smdrObject.OutgoingTrunk.hasOwnProperty(`PhysicalOutgoingRouteNumber`) && smdrObject.OutgoingTrunk.hasOwnProperty(`TrunkNumber`)){
								var route = parseInt(smdrObject.OutgoingTrunk.PhysicalOutgoingRouteNumber);
								var trunk = parseInt(smdrObject.OutgoingTrunk.TrunkNumber);
							}
						} else {
							let tenant = parseInt(smdrObject.CallingPartyInformation.TelephoneNumber.CallingPartyTenant)  || 0;
							let callingNumber = parseInt(smdrObject.CallingPartyInformation.TelephoneNumber.CallingNumber);
							let calledNumber = parseInt(smdrObject.CalledPartyInformation.TelephoneNumber.CallingNumber);
						}
						emailContent += `Calling Number: ` + callingNumber + `\n`;
						if(document.hasOwnProperty(`Tenant`)){
							if(document.Tenant == tenant){
								notify = true;
								emailContent += `Tenant Number: ` + tenant + `\n`;
							} else {
								notify = false;
							}
						}
						if(document.hasOwnProperty(`MAID`)){
							
						}
						if(document.hasOwnProperty(`Dialed Number`)){
							if(smdrObject.DialCode.hasOwnProperty(`DialCode`) && document[`Dialed Number`] ==  smdrObject.DialCode.DialCode){
								notify = true;
								emailContent += `Dialed Number: ` + smdrObject.DialCode.DialCode + `\n`;
							} else {
								notify = false;
							}			
						}
						if(document.hasOwnProperty(`Calling Station`)){
							
						}
						if(document.hasOwnProperty(`Called Station`)){
							
						}
						if(document.hasOwnProperty(`Route`)){
							if(document.Route == route){
								notify = true;
								emailContent += `Route: ` + route + `\n`;
							} else {
								notify = false;
							}
						}
						if(document.hasOwnProperty(`Trunk`)){
							if(document.Trunk == trunk){
								notify = true;
								emailContent += `Trunk: ` + trunk + `\n`;
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
						
						if(notify){
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
		transporter.sendMail(emailParameters, (err, mailResponse) => {
			if(err){
				callback(err)
			} else {
				callback(mailResponse);
			}
		});
	}
 
 };
