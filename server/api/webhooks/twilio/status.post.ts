import prisma from '../../../utils/db';
import { verifyTwilioSignature } from '../../../utils/twilio';

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

  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = body;

  if (!MessageSid) {
    throw createError({
      statusCode: 400,
      message: 'MessageSid is required',
    });
  }

  // Find the sent notification by Twilio SID
  const sentNotification = await prisma.sentNotification.findFirst({
    where: { twilioMessageSid: MessageSid },
  });

  if (!sentNotification) {
    // Not found - might be from a different source, just acknowledge
    return { success: true };
  }

  // Map Twilio status to our status
  let status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';
  if (MessageStatus === 'delivered') {
    status = 'DELIVERED';
  } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
    status = 'FAILED';
  }

  // Update the sent notification
  await prisma.sentNotification.update({
    where: { id: sentNotification.id },
    data: {
      twilioStatus: MessageStatus,
      status,
      errorMessage: ErrorCode ? `${ErrorCode}: ${ErrorMessage || 'Unknown error'}` : null,
    },
  });

  return { success: true };
});
