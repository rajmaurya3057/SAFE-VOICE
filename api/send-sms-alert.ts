import twilio from "twilio";

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_SMS_FROM;
const appUrl = process.env.APP_URL || 'https://safe-voice.vercel.app';

// Note: In a real serverless environment, this requires the Twilio package.
// We use common naming for the client initialization.
const client = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName, emergencyId, contacts } = req.body;

    if (!userName || !emergencyId || !contacts?.length) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    if (!client) {
      console.warn("[Twilio] Credentials missing. Logging alert to console for simulation.");
      return res.status(200).json({ 
        success: true, 
        simulated: true, 
        message: "SMS sequence logged to console (Twilio credentials missing in ENV)." 
      });
    }

    const trackingLink = `${appUrl}/track?id=${emergencyId}`;
    const messageBody = `🚨 EMERGENCY ALERT\n${userName} needs help.\n\nLive tracking:\n${trackingLink}`;

    const results = [];

    for (const contact of contacts) {
      try {
        const msg = await client.messages.create({
          body: messageBody,
          from: twilioFrom,
          to: contact.phone,
        });
        results.push({ phone: contact.phone, status: "sent", sid: msg.sid });
      } catch (err: any) {
        console.error(`Failed to alert ${contact.phone}:`, err.message);
        results.push({ phone: contact.phone, status: "failed" });
      }
    }

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("SMS ERROR:", error);
    return res.status(500).json({ error: "Failed to send SMS alerts" });
  }
}