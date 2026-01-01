import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createCalendarEvent(workoutName: string, completedDate: Date): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const startDateStr = completedDate.toISOString().split('T')[0];
    
    // For all-day events, end date must be the day AFTER the event (exclusive)
    const endDate = new Date(completedDate);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const event = {
      summary: workoutName,
      description: `Completed workout: ${workoutName}`,
      start: {
        date: startDateStr,
      },
      end: {
        date: endDateStr,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    console.log(`Created calendar event: ${response.data.id}`);
    return response.data.id || null;
  } catch (error: any) {
    console.error('Failed to create calendar event:', error.message);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log(`Deleted calendar event: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error('Failed to delete calendar event:', error.message);
    return false;
  }
}
