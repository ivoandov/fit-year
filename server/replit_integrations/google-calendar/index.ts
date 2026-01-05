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

export interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const response = await calendar.calendarList.list();
    
    const calendars = response.data.items || [];
    
    // Filter to only show calendars the user can write to
    return calendars
      .filter((cal: any) => cal.accessRole === 'owner' || cal.accessRole === 'writer')
      .map((cal: any) => ({
        id: cal.id,
        summary: cal.summary || cal.id,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor,
      }));
  } catch (error: any) {
    console.error('Failed to list calendars:', error.message);
    throw error;
  }
}

export async function createCalendarEvent(workoutName: string, completedDate: Date, calendarId?: string, localDateStr?: string): Promise<string | null> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    let startDateStr: string;
    let endDateStr: string;
    
    if (localDateStr) {
      // Use the local date string sent from the client (YYYY-MM-DD format)
      startDateStr = localDateStr;
      // Parse the local date and add one day for the end date
      const [year, month, day] = localDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day + 1);
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    } else {
      // Fallback: use server's interpretation of the date (may be wrong for late night workouts)
      const year = completedDate.getFullYear();
      const month = String(completedDate.getMonth() + 1).padStart(2, '0');
      const day = String(completedDate.getDate()).padStart(2, '0');
      startDateStr = `${year}-${month}-${day}`;
      
      const endDate = new Date(completedDate);
      endDate.setDate(endDate.getDate() + 1);
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    }
    
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

    const targetCalendarId = calendarId || 'primary';
    
    const response = await calendar.events.insert({
      calendarId: targetCalendarId,
      requestBody: event,
    });

    console.log(`Created calendar event in ${targetCalendarId}: ${response.data.id}`);
    return response.data.id || null;
  } catch (error: any) {
    console.error('Failed to create calendar event:', error.message);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string, calendarId?: string): Promise<boolean> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const targetCalendarId = calendarId || 'primary';
    
    await calendar.events.delete({
      calendarId: targetCalendarId,
      eventId: eventId,
    });

    console.log(`Deleted calendar event from ${targetCalendarId}: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error('Failed to delete calendar event:', error.message);
    return false;
  }
}
