export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  return {
    user: {
      id: auth.user.id,
      name: auth.user.name,
      nickname: auth.user.nickname,
      phone: auth.user.phone
    }
  }
})
