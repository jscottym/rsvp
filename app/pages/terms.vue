<script setup lang="ts">
useSeoMeta({
  title: 'Terms of Service - Pickup Sports',
  description: 'Terms of service for Pickup Sports RSVP application',
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mb-8">
          Last updated: February 4, 2026
        </p>

        <div class="prose prose-gray dark:prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using Pickup Sports ("the Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Pickup Sports is a platform that helps people organize and join recreational sports games.
            The Service allows users to:
          </p>
          <ul>
            <li>Create and manage pickup sports events</li>
            <li>Invite others to games via shareable links</li>
            <li>RSVP to games and see who else is attending</li>
            <li>Receive SMS notifications about games</li>
          </ul>

          <h2>3. Account Registration</h2>
          <p>
            To use certain features of the Service, you must create an account using your phone number.
            You agree to:
          </p>
          <ul>
            <li>Provide accurate phone number information</li>
            <li>Keep your account information current</li>
            <li>Be responsible for all activity under your account</li>
            <li>Not share your account or use another person's account</li>
          </ul>

          <h2>4. SMS Consent and Messaging</h2>
          <p>
            By creating an account and providing SMS consent, you agree to receive text messages from Pickup Sports
            related to the Service. These include:
          </p>
          <ul>
            <li>Game invitations and RSVP confirmations</li>
            <li>Reminders for upcoming games</li>
            <li>Updates when game details change</li>
            <li>Notifications about player counts and waitlists</li>
          </ul>
          <p>
            <strong>Message frequency varies</strong> based on your activity. <strong>Message and data rates may apply</strong>
            according to your carrier plan. You may opt out at any time by replying STOP to any message or deleting your account.
          </p>

          <h2>5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Impersonate any person or entity</li>
            <li>Send spam or unsolicited messages through the Service</li>
            <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
            <li>Use the Service to collect information about other users without their consent</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
          </ul>

          <h2>6. Event Participation</h2>
          <p>
            Pickup Sports facilitates coordination between players but does not organize, supervise, or
            control the actual sports events. You acknowledge that:
          </p>
          <ul>
            <li>Participation in sports activities involves inherent risks of injury</li>
            <li>You are responsible for assessing your own fitness and ability to participate</li>
            <li>Game organizers and other participants are not employees or agents of Pickup Sports</li>
            <li>You should verify event details directly with the organizer</li>
          </ul>

          <h2>7. Content and Intellectual Property</h2>
          <p>
            You retain ownership of content you create (event descriptions, messages, etc.). By posting
            content on the Service, you grant us a non-exclusive license to display and distribute that
            content in connection with the Service.
          </p>
          <p>
            The Pickup Sports name, logo, and Service features are our intellectual property and may not
            be used without permission.
          </p>

          <h2>8. Privacy</h2>
          <p>
            Your use of the Service is also governed by our
            <NuxtLink to="/privacy" class="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</NuxtLink>,
            which describes how we collect, use, and protect your information.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
          <p>
            We are not responsible for:
          </p>
          <ul>
            <li>The conduct of any users or event participants</li>
            <li>The accuracy of information provided by users</li>
            <li>Any injuries or damages arising from event participation</li>
            <li>Events being cancelled or changed by organizers</li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PICKUP SPORTS SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
            USE OF THE SERVICE.
          </p>
          <p>
            Our total liability for any claims arising from the Service shall not exceed the amount
            you paid us (if any) in the twelve months preceding the claim.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Pickup Sports from any claims, damages, or expenses
            arising from your use of the Service, your violation of these Terms, or your violation of
            any rights of another person.
          </p>

          <h2>12. Termination</h2>
          <p>
            You may delete your account at any time. We may suspend or terminate your account if you
            violate these Terms or for any other reason at our discretion. Upon termination, your
            right to use the Service immediately ceases.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify you of material changes via SMS
            or through the Service. Your continued use after changes constitutes acceptance of the
            modified Terms.
          </p>

          <h2>14. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Colorado, without regard to conflict
            of law principles.
          </p>

          <h2>15. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> legal@pickupsports.app
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
