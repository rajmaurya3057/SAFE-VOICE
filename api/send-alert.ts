
import twilio from 'twilio';

// Types for the backend request
interface AlertPayload {
  userName: string;
  emergencyId: string;
  location: { latitude: number; longitude: number };
  contacts: Array<{ name: string; phone: string }>;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userName, emergencyId, location, contacts } = req.body as AlertPayload;

  // 1. Validation
  if (!contacts || contacts.length === 0) {
    return res.status(400).json({ error: 'No contacts provided' });
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const whatsappId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appUrl = process.env.APP_URL || 'https://safe-voice.app';

  const twilioClient = twilio(twilioSid, twilioToken);
  const trackingUrl = `${appUrl}/track?id=${emergencyId}`;
  
  const alertMessage = `🚨 EMERGENCY ALERT\n${userName} needs help!\nLive tracking: ${trackingUrl}\nLast Coords: ${location.latitude}, ${location.longitude}`;

  const results = await Promise.allSettled(contacts.map(async (contact) => {
    const logPrefix = `[Alert -> ${contact.name}]`;
    
    // A. Send SMS via Twilio
    try {
      await twilioClient.messages.create({
        body: alertMessage,
        from: twilioPhone,
        to: contact.phone
      });
      console.log(`${logPrefix} SMS Delivered`);
    } catch (err) {
      console.error(`${logPrefix} SMS Failed:`, err);
    }

    // B. Send WhatsApp via Meta Cloud API (Optional fallback)
    if (whatsappToken && whatsappId) {
      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${whatsappId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: contact.phone.replace('+', ''), // Remove plus for WhatsApp API
            type: "text",
            text: { body: alertMessage }
          })
        });
        if (!response.ok) throw new Error(await response.text());
        console.log(`${logPrefix} WhatsApp Delivered`);
      } catch (err) {
        console.error(`${logPrefix} WhatsApp Failed:`, err);
      }
    }
  }));

  return res.status(200).json({ 
    message: 'Broadcast sequence complete',
    results: results.map(r => r.status)
  });
}
