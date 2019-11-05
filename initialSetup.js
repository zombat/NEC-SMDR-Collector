// Change these variables
var mongoAdminUser		=	`mongo-admin`
var mongoAdminPassword	=	`strong-password`
var mongoRootUser		=	`mongo-root`
var mongoRootPassword	=	`strong-password`
var	smdrDatabaseName	=	`smdr-database`
var	smdrCollectionName	=	`smdr-collection`
var	smdrUserName	=	`smdr-user`
var	smdrUserPassword	=	`strong-password`

//Create collections
db = db.getSiblingDB(smdrDatabaseName)
db.createCollection(`Notification Settings`)
db.createCollection(`Device Information`)
db.createCollection(smdrCollectionName)

// Create example notifications
db[`Notification Settings`].insertOne({ "enabled" : false, "Rule Name" : "Calls from tenant 1, extension 2000", "Calling Station" : "2000", "Tenant" : 1, "Email Text" : [ "This is a test email notification for all calls from extension 2000.", "Do not respond to this email." ], "Notify List" : [ "emailOne@localhost", "emailTwo@localhost" ] })
db[`Notification Settings`].insertOne({ "enabled" : false, "Rule Name" : "Calls to 18775551212", "Dialed Number" : "18775551212", "Email HTML" : "<p>This a HTML test email.</p><p>Do not respond to this email</p>", "Notify List" : [ "emailOne@localhost", "emailTwo@localhost" ] })
db[`Notification Settings`].insertOne({ "enabled" : false, "Rule Name" : "Calls from extension 2001", "Calling Station" : "2001", "Email Text" : [ "This is a test email notification for all calls from extension 2001.", "Do not respond to this email." ], "Notify List" : [ "emailOne@localhost", "emailTwo@localhost" ] })
db[`Notification Settings`].insertOne({ "enabled" : false, "Rule Name" : "Calls to extension 2001", "Email HTML" : "<p>This is a test email.</p><p>Do not respond to this email</p>" , "Called Station" : "2001", "Notify List" : [ "emailOne@localhost", "emailTwo@localhost" ] })

// Create users
db = db.getSiblingDB(`admin`)

// Create login for Mongo Administration
db.createUser( { user: mongoAdminUser, pwd: mongoAdminPassword, roles: [ { role: "userAdminAnyDatabase", db: "admin" } ] } )

// Create login for root functions
db.createUser( { user: mongoRootUser, pwd: mongoRootPassword, roles: [ { role: "root", db: "admin" } ] } )

// Create role for SMDR tool to check server status, and a user for the SMDR collector
db.createRole( { role: "serverStatusRole", privileges: [ { resource: { cluster: true }, actions: [ "serverStatus" ] } ], roles: [] } )
db.createUser( { user: smdrUserName, pwd: smdrUserPassword, roles: [ "serverStatusRole", { role: "readWrite", db: smdrDatabaseName } ] } )

// Indexes will go here one day...

// Notify user
print(`Don't forget to edit your mongod.cfg file and authorization`)
print(`On Linux, a default /etc/mongod.conf configuration file is included when using a package manager to install MongoDB.`)
print(`On Windows, a default <install directory>/bin/mongod.cfg configuration file is included during the installation.`)
print(`On macOS, a default /usr/local/etc/mongod.conf configuration file is included when installing from MongoDB’s official Homebrew tap.`)
print(`Uncomment 'security:'`)
print(`And add ' authorization: "enabled"' below it`)