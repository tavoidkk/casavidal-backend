import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CalendarEventsService } from './calendarEvents.service';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';

export interface GoogleCalendarEventPayload {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export class GoogleCalendarService {
  private static getGoogleConfig() {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError(500, 'Google OAuth no esta configurado');
    }
    return { clientId, clientSecret, redirectUri };
  }

  static createStateToken(userId: string) {
    return jwt.sign({ userId, purpose: 'google-oauth' }, env.JWT_SECRET, { expiresIn: '10m' });
  }

  static verifyStateToken(state: string): { userId: string } {
    const decoded = jwt.verify(state, env.JWT_SECRET) as { userId: string; purpose: string };
    if (decoded.purpose !== 'google-oauth') {
      throw new AppError(400, 'Estado OAuth invalido');
    }
    return { userId: decoded.userId };
  }

  static getAuthUrl(userId: string) {
    const { clientId, redirectUri } = this.getGoogleConfig();
    const state = this.createStateToken(userId);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      include_granted_scopes: 'true',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForToken(code: string) {
    const { clientId, clientSecret, redirectUri } = this.getGoogleConfig();
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(500, `Error OAuth: ${errorText}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  static async refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = this.getGoogleConfig();
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(500, `Error refrescando token: ${errorText}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  static async storeToken(userId: string, token: {
    accessToken: string;
    refreshToken: string;
    scope?: string;
    tokenType?: string;
    expiryDate?: Date | null;
    calendarId?: string | null;
  }) {
    return prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        tokenType: token.tokenType,
        expiryDate: token.expiryDate || undefined,
        calendarId: token.calendarId || undefined,
      },
      create: {
        userId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        tokenType: token.tokenType,
        expiryDate: token.expiryDate || undefined,
        calendarId: token.calendarId || undefined,
      },
    });
  }

  static async disconnect(userId: string) {
    await prisma.googleCalendarToken.deleteMany({ where: { userId } });
  }

  static async getToken(userId: string) {
    return prisma.googleCalendarToken.findUnique({ where: { userId } });
  }

  static async getAccessToken(userId: string) {
    const token = await this.getToken(userId);
    this.assertToken(token);

    const expiry = token.expiryDate ? token.expiryDate.getTime() : 0;
    const now = Date.now();
    if (token.accessToken && expiry > now + 60_000) {
      return token.accessToken;
    }

    const refreshed = await this.refreshAccessToken(token.refreshToken);
    const expiryDate = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : undefined;

    await prisma.googleCalendarToken.update({
      where: { userId },
      data: {
        accessToken: refreshed.access_token,
        scope: refreshed.scope || token.scope,
        tokenType: refreshed.token_type || token.tokenType,
        expiryDate: expiryDate || token.expiryDate,
      },
    });

    return refreshed.access_token;
  }

  static async importFromGoogle(userId: string, params: { calendarId?: string; timeMin?: string; timeMax?: string }) {
    const accessToken = await this.getAccessToken(userId);
    const calendarId = params.calendarId || 'primary';
    const query = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    if (params.timeMin) query.append('timeMin', params.timeMin);
    if (params.timeMax) query.append('timeMax', params.timeMax);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(500, `Error importando eventos: ${errorText}`);
    }

    const data = (await response.json()) as { items?: GoogleCalendarEventPayload[] };
    const items = Array.isArray(data.items) ? data.items : [];
    return this.importEvents(userId, items);
  }

  static async importEvents(userId: string, events: GoogleCalendarEventPayload[]) {
    if (!events.length) {
      return { imported: 0 };
    }

    const existing = await prisma.calendarEvent.findMany({
      where: { googleEventId: { in: events.map((e) => e.id) } },
      select: { googleEventId: true },
    });
    const existingIds = new Set(existing.map((e) => e.googleEventId));

    let imported = 0;
    for (const event of events) {
      if (existingIds.has(event.id)) {
        continue;
      }
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      if (!start || !end) {
        continue;
      }

      await CalendarEventsService.create({
        title: event.summary || 'Evento Google',
        description: event.description || undefined,
        category: 'AGENDA',
        source: 'GOOGLE',
        startDate: new Date(start),
        endDate: new Date(end),
        allDay: Boolean(event.start.date && event.end.date),
        assignedToId: userId,
        location: event.location || undefined,
        googleEventId: event.id,
      });
      imported += 1;
    }

    return { imported };
  }

  static assertToken(token: Awaited<ReturnType<typeof GoogleCalendarService.getToken>>) {
    if (!token) {
      throw new AppError(404, 'No hay conexion con Google Calendar');
    }
  }
}
