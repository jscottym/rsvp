import prisma from '../../../utils/db';
import { verifyTwilioSignature, sendAutoReply } from '../../../utils/twilio';

export default defineEventHandler(async (event) => {
  // Get the raw body for signature verification
  const body = await readBody(event);
  const signature = getHeader(event, 'x-twilio-signature') || '';
  const url = getRequestURL(event).href;

  // Verify Twilio signature in production
  if (process.env.NODE_ENV === 'production') {
    if (!verifyTwilioSignature(signature, url, body)) {
      throw createError({
        statusCode: 403,
        message: 'Invalid Twilio signature',
      });
    }
  }

  const { From, To, Body, MessageSid } = body;

  if (!MessageSid || !From || !Body) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    });
  }

  // Store the inbound message
  const inboundSms = await prisma.inboundSms.create({
    data: {
      fromPhone: From,
      toPhone: To || '',
      messageBody: Body,
      twilioMessageSid: MessageSid,
      autoReplySent: false,
    },
  });

  // Send auto-reply
  try {
    await sendAutoReply(From);
    await prisma.inboundSms.update({
      where: { id: inboundSms.id },
      data: { autoReplySent: true },
    });
  } catch (error) {
    console.error('Failed to send auto-reply:', error);
  }

  // Return TwiML response (empty - we send reply via API)
  setHeader(event, 'Content-Type', 'text/xml');
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
});
