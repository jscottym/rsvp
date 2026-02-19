export function useSms() {
  function formatPhoneForSms(phone: string): string {
    return phone.startsWith('+') ? phone : `+1${phone}`
  }

  function buildSmsUrl(phones: string[], body?: string): string {
    const isApple = typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
    const formatted = phones.map(formatPhoneForSms)
    const recipients = formatted.join(',')
    const encodedBody = body ? encodeURIComponent(body) : ''

    let url: string

    if (isApple && recipients) {
      // Apple Messages requires sms://open?addresses= format for multiple recipients
      url = encodedBody
        ? `sms://open?addresses=${recipients}&body=${encodedBody}`
        : `sms://open?addresses=${recipients}`
    } else if (!recipients) {
      url = encodedBody ? `sms:?body=${encodedBody}` : 'sms:'
    } else {
      url = encodedBody
        ? `sms:${recipients}?body=${encodedBody}`
        : `sms:${recipients}`
    }

    return url
  }

  return { buildSmsUrl }
}
