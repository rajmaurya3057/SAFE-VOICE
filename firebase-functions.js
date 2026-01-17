
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggered when a new SOS record is initialized.
 * Dispatches high-priority data messages to all verified contacts.
 */
exports.onEmergencyTriggered = functions.firestore
  .document('emergencies/{emergencyId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (data.status !== 'ACTIVE') return null;

    const victimId = data.userId;
    const emergencyId = context.params.emergencyId;

    // 1. Fetch victim details
    const victimDoc = await admin.firestore().collection('users').doc(victimId).get();
    const victimName = victimDoc.exists ? victimDoc.data().name : "An Operative";

    // 2. Fetch all trusted contact tokens
    const contactsSnapshot = await admin.firestore()
      .collection('contacts')
      .where('ownerUserId', '==', victimId)
      .get();

    const tokens = [];
    contactsSnapshot.forEach(doc => {
      const contactData = doc.data();
      if (contactData.fcmToken) {
        tokens.push(contactData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log(`No registered contacts for victim: ${victimId}`);
      return null;
    }

    // 3. Construct High-Priority Payload
    const message = {
      notification: {
        title: '🚨 EMERGENCY ALERT: SAFE-VOICE',
        body: `${victimName} has triggered an SOS. Tap to begin tactical intercept.`,
      },
      data: {
        type: 'EMERGENCY_START',
        emergencyId: emergencyId,
        victimId: victimId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // Direct intent to tracking screen
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'emergency_channel',
          sound: 'critical_alert.mp3',
          icon: 'ic_sos_alert'
        }
      },
      tokens: tokens,
    };

    // 4. Dispatch Multi-cast
    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`SOS Dispatched: ${response.successCount} delivered, ${response.failureCount} failed.`);
      return response;
    } catch (error) {
      console.error('SOS BROADCAST FAILURE:', error);
      return null;
    }
  });
