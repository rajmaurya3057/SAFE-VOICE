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

  // Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSmsFrom = process.env.TWILIO_SMS_FROM;
  const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const appUrl = process.env.APP_URL || 'https://safe-voice.vercel.app';

  if (!twilioSid || !twilioToken) {
    console.error("Critical: Twilio credentials missing from environment.");
    return res.status(500).json({ error: "Backend config error" });
  }

  const twilioClient = twilio(twilioSid, twilioToken);
  const trackingUrl = `${appUrl}/track?id=${emergencyId}`;
  
  const smsMessage = `🚨 EMERGENCY ALERT\n${userName} needs help.\nLive location: ${trackingUrl}`;
  const whatsappMessage = `🚨 EMERGENCY ALERT\n${userName} is in danger.\nTrack live location here:\n${trackingUrl}`;

  const results = await Promise.allSettled(contacts.map(async (contact) => {
    const formattedPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
    
    // 1. WhatsApp Dispatch (Priority)
    try {
      await twilioClient.messages.create({
        body: whatsappMessage,
        from: twilioWhatsappFrom,
        to: `whatsapp:${formattedPhone}`
      });
      console.log(`WhatsApp Alert -> ${contact.name} OK`);
    } catch (err) {
      console.error(`WhatsApp Alert -> ${contact.name} FAILED:`, err);
    }

    // 2. SMS Dispatch (Fallback/Redundant)
    try {
      await twilioClient.messages.create({
        body: smsMessage,
        from: twilioSmsFrom,
        to: formattedPhone
      });
      console.log(`SMS Alert -> ${contact.name} OK`);
    } catch (err) {
      console.error(`SMS Alert -> ${contact.name} FAILED:`, err);
    }
  }));

  return res.status(200).json({ 
    status: 'Broadcast sequence finished',
    results: results.map(r => r.status)
  });
}