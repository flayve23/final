export async function sendEmail(apiKey: string, to: string, from: string, subject: string, text: string) {
  if (!apiKey) {
    console.log('SendGrid API Key missing. Email logged:', { to, subject, text });
    return;
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: subject,
      content: [{ type: 'text/plain', value: text }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('SendGrid Error:', err);
    throw new Error('Failed to send email');
  }
}
