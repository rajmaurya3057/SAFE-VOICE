import twilio from "twilio";

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_SMS_FROM;
const appUrl = process.env.APP_URL || 'https://safe-voice.vercel.app';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userName, emergencyId, contacts } = req.body;

    if (!userName || !emergencyId || !contacts?.length) {
      return res.status(400).json({ error: "Payload parameters missing." });
    }

    // Check for missing credentials in the environment
    if (!twilioSid || !twilioToken || !twilioFrom) {
      console.error("[Twilio Config] Missing SID, Token, or From number in Vercel.");
      return res.status(200).json({ 
        success: false, 
        error: "Server configuration missing (Twilio keys).",
        details: "Vercel environment variables are not set."
      });
    }

    const client = twilio(twilioSid, twilioToken);
    const trackingLink = `${appUrl}/track?id=${emergencyId}`;
    
    const messageBody = emergencyId === "TEST_SIGNAL" 
      ? `🚨 SAFE-VOICE SYSTEM TEST\nSignal verified for ${userName}.\nEncryption: AES-256\nUplink: STABLE`
      : `🚨 EMERGENCY ALERT\n${userName} is in danger.\n\nTrack live location here:\n${trackingLink}`;

    const dispatchResults = [];
    let sentSuccess = 0;

    // Send to each contact sequentially (simpler for small batches)
    for (const contact of contacts) {
      try {
        // Ensure phone is E.164
        const targetPhone = contact.phone.trim().startsWith('+') 
          ? contact.phone.trim() 
          : `+${contact.phone.trim()}`;
        
        const message = await client.messages.create({
          body: messageBody,
          from: twilioFrom,
          to: targetPhone,
        });
        
        dispatchResults.push({ name: contact.name, phone: targetPhone, status: "sent", sid: message.sid });
        sentSuccess++;
      } catch (err: any) {
        console.error(`[Twilio Error] Contact: ${contact.name}, Error: ${err.message}`);
        dispatchResults.push({ name: contact.name, phone: contact.phone, status: "failed", error: err.message });
      }
    }

    return res.status(200).json({
      success: sentSuccess > 0,
      sentCount: sentSuccess,
      totalCount: contacts.length,
      results: dispatchResults,
    });
  } catch (error: any) {
    console.error("[Twilio Critical] System Failure:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error during dispatch." });
  }
}