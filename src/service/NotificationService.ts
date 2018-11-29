
import Expo from 'expo-server-sdk'

class NotificationService {
    private expo: any

    constructor() {
        this.expo = new Expo()
    }

    async sendNotification(deviceId: string, message: string, data: any) {
        const notification = [{
            to: deviceId,
            priority: 'high',
            sound: 'default',
            android: {
                channelId: 'security',
            },
            body: message,
            data: data
        }]
        const chunks = this.expo.chunkPushNotifications(notification)

        for (const chunk of chunks) {
            try {
                const response = await this.expo.sendPushNotificationsAsync(chunk)
                console.log(response)
            } catch (error) {
                console.error(error)
            }
        }

    }
}

export default new NotificationService()