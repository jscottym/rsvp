export default defineEventHandler(async () => {
  // Server-side logout is a no-op since we use stateless JWT
  // The client handles Firebase signOut
  return { success: true }
})
