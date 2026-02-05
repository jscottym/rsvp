import prisma from '../../utils/db';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Only allow in development
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: 'Dev login only available in development mode',
    });
  }

  const devUserId = config.devUserId;

  if (!devUserId) {
    throw createError({
      statusCode: 400,
      message: 'DEV_FIREBASE_UID not configured in .env',
    });
  }

  // Find the dev user by Firebase UID
  const user = await prisma.user.findUnique({
    where: { firebaseUid: devUserId },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      message: `Dev user not found. Make sure DEV_FIREBASE_UID matches a user's firebaseUid in the database.`,
    });
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      phone: user.phone,
    },
    devToken: `dev-${devUserId}`,
  };
});
