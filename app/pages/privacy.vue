<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy - Pickup Sports',
  description: 'Privacy policy for Pickup Sports RSVP application',
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mb-8">
          Last updated: February 4, 2026
        </p>

        <div class="prose prose-gray dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>
          <p>
            Pickup Sports ("we," "our," or "us") collects the following information when you use our service:
          </p>
          <ul>
            <li><strong>Phone Number:</strong> Required for account creation and SMS notifications</li>
            <li><strong>Name:</strong> Displayed to other players in games you join or organize</li>
            <li><strong>RSVP Responses:</strong> Your responses to game invitations (In, Out, Maybe, etc.)</li>
            <li><strong>Event Information:</strong> Details about games you create, including location, date, time, and player counts</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li><strong>Provide the Service:</strong> Create and manage your account, process RSVPs, and coordinate games</li>
            <li><strong>Send SMS Notifications:</strong> Notify you about games you're invited to, reminders for upcoming games, and updates when game details change</li>
            <li><strong>Display to Other Players:</strong> Show your name and RSVP status to other participants in games you join</li>
            <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and fix issues</li>
          </ul>

          <h2>3. SMS Communications</h2>
          <p>
            By creating an account and providing consent, you agree to receive SMS messages from Pickup Sports. These messages may include:
          </p>
          <ul>
            <li>Game invitation notifications</li>
            <li>Reminders before games you've RSVP'd to</li>
            <li>Updates when game details change (time, location, cancellation)</li>
            <li>Player count updates and waitlist notifications</li>
          </ul>
          <p>
            <strong>Message frequency varies</strong> based on your activity and the games you participate in.
            <strong>Message and data rates may apply</strong> depending on your mobile carrier plan.
          </p>
          <p>
            <strong>To opt out:</strong> Reply STOP to any message, or contact us at the information below.
            You can also delete your account to stop all communications.
          </p>

          <h2>4. Information Sharing</h2>
          <p>We share your information only in the following ways:</p>
          <ul>
            <li><strong>With Other Players:</strong> Your name and RSVP status are visible to other participants in games you join. Your phone number is only visible to game organizers.</li>
            <li><strong>Service Providers:</strong> We use third-party services to operate our platform (see Section 5).</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety.</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>5. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Firebase (Google):</strong> For phone number verification and authentication</li>
            <li><strong>Twilio:</strong> For sending SMS notifications</li>
            <li><strong>Vercel:</strong> For hosting and infrastructure</li>
          </ul>
          <p>
            These services have their own privacy policies governing their use of your data.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to provide services.
            If you delete your account, we will delete your personal information within 30 days, except where we are
            required to retain it for legal purposes.
          </p>

          <h2>7. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information, including encryption
            in transit and at rest. However, no method of transmission over the internet is 100% secure.
          </p>

          <h2>8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update your name and profile information</li>
            <li><strong>Deletion:</strong> Delete your account and associated data</li>
            <li><strong>Opt-out:</strong> Stop receiving SMS notifications by replying STOP or deleting your account</li>
          </ul>

          <h2>9. Children's Privacy</h2>
          <p>
            Pickup Sports is not intended for users under 13 years of age. We do not knowingly collect information
            from children under 13.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of significant changes via
            SMS or by posting a notice on our website.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or want to exercise your rights, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> privacy@pickupsports.app
          </p>
        </div>

        <div class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            Back to home
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin-top: 2rem;
  margin-bottom: 1rem;
}

:root.dark .prose h2 {
  color: var(--color-white);
}

.prose h2:first-of-type {
  margin-top: 0;
}

.prose p {
  color: var(--color-gray-600);
  margin-bottom: 1rem;
  line-height: 1.625;
}

:root.dark .prose p {
  color: var(--color-gray-300);
}

.prose ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.prose ul > * + * {
  margin-top: 0.5rem;
}

.prose li {
  color: var(--color-gray-600);
}

:root.dark .prose li {
  color: var(--color-gray-300);
}

.prose strong {
  font-weight: 600;
  color: var(--color-gray-900);
}

:root.dark .prose strong {
  color: var(--color-white);
}
</style>
