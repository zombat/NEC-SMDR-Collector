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

const notificationParameters = [
	{ 'DialedNumber' : '911', 'Email': 'test@test.test'},
	{ 'MAID': 22, 'DialedNumber' : '911', 'Email': 'test@test.test'},
	{ 'Tenant': 20, 'DialedNumber' : '911', 'Email': 'test@test.test'},
	{ 'Tenant': 10, 'DialedNumber' : '911', 'Email': 'test@test.test'}
];
 
 module.exports = {
	
	notifySMTP: (matchType) => {
		switch(matchType) {
			case `Dialed Number`:
				
				break;
			case `MAID and Dialed Number`:
				
				break;
			case `Tenant and Dialed Number`:
				
				break;
			default:
				break;
		};
	}
	
 }