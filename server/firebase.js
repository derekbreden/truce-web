const fcm_admin = require("firebase-admin")
const { initializeApp } = require("firebase-admin/app")
const { getMessaging } = require("firebase-admin/messaging")

let fcm_app = null
let fcm_messaging = null

module.exports = {
	init() {
		// Only initialize if not already initialized
		if (!fcm_app) {
			try {
				fcm_app = initializeApp({
					credential: fcm_admin.credential.cert(
						JSON.parse(process.env.FIREBASE_CREDENTIAL),
					),
				})
				fcm_messaging = getMessaging(fcm_app)
			} catch (error) {
				// App already exists, get the default app
				if (error.code === 'app/duplicate-app') {
					fcm_app = fcm_admin.app()
					fcm_messaging = getMessaging(fcm_app)
				} else {
					throw error
				}
			}
		}
	},
	
	getMessaging() {
		if (!fcm_messaging) {
			this.init()
		}
		return fcm_messaging
	}
}