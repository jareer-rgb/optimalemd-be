const { google } = require('googleapis');

// Test OAuth URL generation
const oauth2Client = new google.auth.OAuth2(
  '498337781985-p4248hnlt3hv5vbcvbd0i4tg0rgo26bt.apps.googleusercontent.com',
  'your_client_secret_here', // You'll need to add this
  'http://localhost:3000/api/google-calendar/oauth/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  state: 'test-doctor-id',
  prompt: 'consent'
});

console.log('Generated OAuth URL:');
console.log(authUrl);
console.log('\nDecoded redirect_uri:');
console.log(decodeURIComponent(authUrl.split('redirect_uri=')[1].split('&')[0]));
