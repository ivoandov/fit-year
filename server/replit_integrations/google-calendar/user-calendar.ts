import { google, calendar_v3 } from 'googleapis';
import { storage } from '../../storage';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getRedirectUri(): string {
  // Use explicit environment variable if set (required for OAuth to work correctly)
  // This must match the redirect URI configured in Google Cloud Console
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    console.log("[UserCalendar] Using explicit redirect URI:", process.env.GOOGLE_OAUTH_REDIRECT_URI);
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }
  
  // Fallback: try to find production domain
  const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
  const prodDomain = domains.find(d => d.endsWith('.replit.app'));
  const baseUrl = prodDomain 
    ? `https://${prodDomain}`
    : `https://${process.env.REPLIT_DEV_DOMAIN}`;
  
  const redirectUri = `${baseUrl}/api/calendar/callback`;
  console.log("[UserCalendar] Using computed redirect URI:", redirectUri);
  return redirectUri;
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export function getCalendarAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
    state: userId,
  });
}

export async function handleCalendarCallback(code: string, userId: string): Promise<void> {
  console.log("[UserCalendar] Exchanging code for tokens, userId:", userId);
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  console.log("[UserCalendar] Tokens received:", { 
    hasRefreshToken: !!tokens.refresh_token, 
    hasAccessToken: !!tokens.access_token,
    expiryDate: tokens.expiry_date 
  });
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. Please try connecting again.');
  }
  
  console.log("[UserCalendar] Saving tokens for user:", userId);
  await storage.upsertGoogleCalendarTokens(userId, {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
  });
  console.log("[UserCalendar] Tokens saved successfully");
}

async function getCalendarClientForUser(userId: string): Promise<calendar_v3.Calendar> {
  const tokens = await storage.getGoogleCalendarTokens(userId);
  if (!tokens) {
    throw new Error('Calendar not connected');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: tokens.refreshToken,
    access_token: tokens.accessToken || undefined,
    expiry_date: tokens.expiresAt?.getTime(),
  });
  
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      await storage.updateGoogleCalendarAccessToken(
        userId,
        newTokens.access_token,
        newTokens.expiry_date ? new Date(newTokens.expiry_date) : new Date(Date.now() + 3600 * 1000)
      );
    }
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export async function listUserCalendars(userId: string): Promise<CalendarInfo[]> {
  try {
    const calendar = await getCalendarClientForUser(userId);
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];
    
    return calendars
      .filter((cal: any) => cal.accessRole === 'owner' || cal.accessRole === 'writer')
      .map((cal: any) => ({
        id: cal.id,
        summary: cal.summary || cal.id,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor,
      }));
  } catch (error: any) {
    console.error('Failed to list user calendars:', error.message);
    throw error;
  }
}

export async function createUserCalendarEvent(
  userId: string,
  workoutName: string,
  completedDate: Date,
  calendarId?: string,
  localDateStr?: string
): Promise<string | null> {
  try {
    const calendar = await getCalendarClientForUser(userId);
    
    let startDateStr: string;
    let endDateStr: string;
    
    if (localDateStr) {
      startDateStr = localDateStr;
      const [year, month, day] = localDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day + 1);
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    } else {
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
      start: { date: startDateStr },
      end: { date: endDateStr },
    };

    const targetCalendarId = calendarId || 'primary';
    const response = await calendar.events.insert({
      calendarId: targetCalendarId,
      requestBody: event,
    });

    console.log(`Created calendar event for user ${userId} in ${targetCalendarId}: ${response.data.id}`);
    return response.data.id || null;
  } catch (error: any) {
    console.error('Failed to create user calendar event:', error.message);
    return null;
  }
}

export async function updateUserCalendarEvent(
  userId: string,
  eventId: string,
  newDate: Date,
  calendarId?: string,
  localDateStr?: string
): Promise<boolean> {
  try {
    const calendar = await getCalendarClientForUser(userId);
    const targetCalendarId = calendarId || 'primary';
    
    let startDateStr: string;
    let endDateStr: string;
    
    if (localDateStr) {
      startDateStr = localDateStr;
      const [year, month, day] = localDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day + 1);
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    } else {
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      startDateStr = `${year}-${month}-${day}`;
      
      const endDate = new Date(newDate);
      endDate.setDate(endDate.getDate() + 1);
      endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    }
    
    await calendar.events.patch({
      calendarId: targetCalendarId,
      eventId: eventId,
      requestBody: {
        start: { date: startDateStr },
        end: { date: endDateStr },
      },
    });

    console.log(`Updated calendar event date for user ${userId} in ${targetCalendarId}: ${eventId} to ${startDateStr}`);
    return true;
  } catch (error: any) {
    console.error('Failed to update user calendar event:', error.message);
    return false;
  }
}

export async function deleteUserCalendarEvent(
  userId: string,
  eventId: string,
  calendarId?: string
): Promise<boolean> {
  try {
    const calendar = await getCalendarClientForUser(userId);
    const targetCalendarId = calendarId || 'primary';
    
    await calendar.events.delete({
      calendarId: targetCalendarId,
      eventId: eventId,
    });

    console.log(`Deleted calendar event for user ${userId} from ${targetCalendarId}: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error('Failed to delete user calendar event:', error.message);
    return false;
  }
}

export async function checkCalendarEventExists(
  userId: string,
  eventId: string,
  calendarId?: string
): Promise<boolean> {
  try {
    const calendar = await getCalendarClientForUser(userId);
    const targetCalendarId = calendarId || 'primary';
    
    await calendar.events.get({
      calendarId: targetCalendarId,
      eventId: eventId,
    });
    
    return true;
  } catch (error: any) {
    if (error.code === 404 || error.message?.includes('Not Found')) {
      return false;
    }
    console.error('Failed to check calendar event:', error.message);
    return false;
  }
}
