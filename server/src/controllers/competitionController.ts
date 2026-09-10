import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';

const SUBJECT_KEYS = ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];
const SUBJECT_LABEL_TO_KEY: Record<string, string> = {
  mathematics: 'mathematics', maths: 'mathematics', math: 'mathematics',
  science: 'science',
  'english language': 'english', english: 'english',
  'social studies': 'social-studies',
  ict: 'ict', 'information technology': 'ict',
  'religious and moral education': 'rme', 'religious & moral education': 'rme', rme: 'rme',
  'creative arts and design': 'creative-arts', 'creative arts': 'creative-arts',
  'career technology': 'career-tech',
};

const MAX_PARTICIPANTS = 4;
const MIN_START_PLAYERS = 2;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 50;
const MIN_TIME = 1;
const MAX_TIME = 30;
const ABANDON_GRACE_SECONDS = 90;

interface CompetitionRow {
  id: string;
  created_by: string;
  title: string;
  subject: string;
  class_level: string;
  total_questions: number;
  time_minutes: number;
  max_participants: number;
  question_ids: string[] | string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
  created_at: string;
}

interface ParticipantRow {
  id: string;
  competition_id: string;
  user_id: string;
  status: string;
  is_creator: boolean;
  started_at: string | null;
  submitted_at: string | null;
  score: number;
  correct_answers: number;
  answered_questions: number;
  time_spent: number;
  answers: Array<Record<string, unknown>> | string;
  created_at: string;
}

interface QuestionRow {
  id: string;
  question: string;
  type: string;
  options?: string[] | null;
  correct_answer?: unknown;
  difficulty?: string;
  subject?: string;
  class_level?: string;
}

function normalizeSubject(value: string): string {
  const trimmed = (value || '').trim();
  const lower = trimmed.toLowerCase();
  if (SUBJECT_KEYS.includes(lower)) return lower;
  return SUBJECT_LABEL_TO_KEY[lower] || trimmed;
}

function normalizeClass(value: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, '');
}

function clientIp(req: AuthRequest): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const parseJsonArray = (value: unknown): string[] | Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

function normalizeTrueFalseAnswer(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 't' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'f' || s === 'no') return false;
  return null;
}

function canonicalOptionText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function fetchApprovedIds(filter: { subject?: string; classLevel?: string; difficulty?: string }): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  let pageIds: string[] = [];
  do {
    let query = supabase.from('questions').select('id').eq('approved', true);
    if (filter.subject && filter.subject !== 'all') query = query.ilike('subject', normalizeSubject(filter.subject));
    if (filter.classLevel) query = query.eq('class_level', normalizeClass(filter.classLevel));
    if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);
    const { data } = await query.range(from, from + 999);
    pageIds = ((data as Array<{ id: string }>) || []).map((r) => r.id);
    ids.push(...pageIds);
    from += pageIds.length;
  } while (pageIds.length === 1000);
  return ids;
}

async function pickQuestionIds(subject: string, classLevel: string, count: number): Promise<string[]> {
  const filters: Array<{ subject?: string; classLevel?: string }> = [];
  if (subject && subject !== 'all') {
    filters.push({ subject, classLevel: classLevel || undefined });
    filters.push({ subject });
  }
  if (classLevel) filters.push({ classLevel });
  filters.push({});

  for (const filter of filters) {
    const pool = await fetchApprovedIds(filter);
    if (pool.length >= count) {
      const beginnerTarget = Math.ceil(count * 0.2);
      const expertTarget = Math.ceil(count * 0.2);
      const chosen: string[] = [];
      for (const difficulty of ['beginner', 'expert']) {
        const bucketIds = await fetchApprovedIds({ ...filter, difficulty });
        const take = Math.min(difficulty === 'beginner' ? beginnerTarget : expertTarget, bucketIds.length);
        chosen.push(...shuffleArray(bucketIds).slice(0, take));
      }
      const remaining = count - chosen.length;
      if (remaining > 0) {
        const excluded = new Set(chosen);
        const rest = shuffleArray(pool).filter((id) => !excluded.has(id));
        chosen.push(...rest.slice(0, remaining));
      }
      return shuffleArray(chosen).slice(0, count);
    }
  }
  throw new Error('Not enough approved questions to create this competition.');
}

async function fetchQuestionsByIds(ids: string[], includeAnswers = false): Promise<Array<Record<string, unknown>>> {
  if (ids.length === 0) return [];
  const fields = includeAnswers ? '*' : 'id, question, type, options, difficulty, subject';
  const { data } = await supabase.from('questions').select(fields).in('id', ids);
  return ((data as unknown as Array<Record<string, unknown>>) || []);
}

function serializeQuestionPublic(q: Record<string, unknown>): Record<string, unknown> {
  return {
    id: q.id,
    question: q.question,
    type: q.type,
    options: Array.isArray(q.options) && (q.options as string[]).length > 0 ? q.options : ['True', 'False'],
    difficulty: q.difficulty,
    subject: q.subject,
  };
}

function serializeParticipant(p: ParticipantRow, names: Map<string, string>): Record<string, unknown> {
  return {
    id: p.id,
    userId: p.user_id,
    name: names.get(p.user_id) || 'Student',
    status: p.status,
    isCreator: p.is_creator,
    startedAt: p.started_at,
    submittedAt: p.submitted_at,
    score: Number(p.score || 0),
    correctAnswers: p.correct_answers || 0,
    answeredQuestions: p.answered_questions || 0,
    timeSpent: p.time_spent || 0,
  };
}

async function fetchNames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data } = await supabase.from('users').select('id, name').in('id', unique);
  (data || []).forEach((u: Record<string, unknown>) => map.set(String(u.id), String(u.name || '')));
  return map;
}

async function pushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  entityId: string
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('user_notifications').insert({ user_id: userId, type, title, body, entity_type: 'competition', entity_id: entityId });
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

async function getParticipants(competitionId: string): Promise<ParticipantRow[]> {
  const { data } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: true });
  return (data as ParticipantRow[]) || [];
}

async function getParticipant(competitionId: string, userId: string): Promise<ParticipantRow | null> {
  const { data } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as ParticipantRow) || null;
}

async function getCompetitionRow(id: string): Promise<CompetitionRow | null> {
  const { data } = await supabase.from('competitions').select('*').eq('id', id).maybeSingle();
  return (data as CompetitionRow) || null;
}

const deadlinePassed = (p: ParticipantRow, timeMinutes: number): boolean => {
  if (!p.started_at) return false;
  const deadline = new Date(p.started_at).getTime() + timeMinutes * 60 * 1000 + ABANDON_GRACE_SECONDS * 1000;
  return Date.now() > deadline;
};

async function resolveIfDue(competition: CompetitionRow, participants: ParticipantRow[]): Promise<void> {
  if (competition.status !== 'live') return;
  const now = Date.now();
  const updates: Array<string> = [];
  for (const p of participants) {
    if (p.status === 'playing' && deadlinePassed(p, competition.time_minutes)) updates.push(p.id);
  }
  if (updates.length > 0) {
    await supabase.from('competition_participants')
      .update({ status: 'abandoned', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', updates);
    for (const p of participants) {
      if (updates.includes(p.id)) p.status = 'abandoned';
    }
  }

  const starts = (s: string) => s === 'playing' || s === 'finished' || s === 'abandoned';
  const startedNow = participants.filter((p) => starts(p.status));
  if (startedNow.length === 0) {
    const stallCutoff = new Date(competition.started_at || '').getTime() + (competition.time_minutes + 15) * 60 * 1000;
    if (now <= stallCutoff) return;
  } else if (participants.some((p) => p.status === 'playing')) {
    return;
  }

  const winners = participants
    .filter((p) => p.status === 'finished')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.time_spent !== b.time_spent) return a.time_spent - b.time_spent;
      return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
    });
  const winnerId = winners.length > 0 ? winners[0].user_id : null;

  await supabase
    .from('competitions')
    .update({ status: 'finished', ended_at: new Date().toISOString(), winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', competition.id);
  competition.status = 'finished';

  if (winnerId) {
    const names = await fetchNames(participants.map((p) => p.user_id));
    for (const p of participants) {
      if (p.user_id === winnerId) continue;
      if (p.status === 'declined' || p.status === 'invited') continue;
      await pushNotification(
        p.user_id,
        'competition_finished',
        'Competition complete',
        `${names.get(winnerId) || 'A player'} won “${competition.title}” with ${winners[0].score}%`,
        competition.id
      );
    }
  }
}

export async function searchParticipants(req: AuthRequest, res: Response): Promise<void> {
  try {
    const q = String(req.query.q || '').trim();
    const userId = req.user!.id;
    if (q.length < 2) {
      res.json({ participants: [] });
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, name, class_level, avatar')
      .eq('role', 'student')
      .ilike('name', `%${q}%`)
      .neq('id', userId)
      .limit(10);
    res.json({
      participants: (data || []).map((u) => ({
        id: u.id,
        name: u.name,
        classLevel: u.class_level || '',
        avatar: u.avatar || null,
      })),
    });
  } catch (error) {
    console.error('Search participants error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
}

export async function createCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, subject, classLevel, totalQuestions, timeMinutes, inviteeIds } = req.body as {
      title?: string;
      subject: string;
      classLevel?: string;
      totalQuestions: number;
      timeMinutes: number;
      inviteeIds: string[];
    };

    const normSubject = subject === 'all' ? 'all' : normalizeSubject(subject || '');
    if (normSubject !== 'all' && !SUBJECT_KEYS.includes(normSubject)) {
      res.status(400).json({ message: 'Invalid subject' });
      return;
    }
    const total = Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, Math.round(Number(totalQuestions) || MIN_QUESTIONS)));
    const minutes = Math.max(MIN_TIME, Math.min(MAX_TIME, Math.round(Number(timeMinutes) || MIN_TIME)));

    const invitees = Array.from(new Set((inviteeIds || []).filter((id) => id && id !== userId))).slice(0, MAX_PARTICIPANTS - 1);
    if (invitees.length < 1) {
      res.status(400).json({ message: 'Invite at least one classmate to compete' });
      return;
    }
    if (invitees.length + 1 > MAX_PARTICIPANTS) {
      res.status(400).json({ message: `Competitions are limited to ${MAX_PARTICIPANTS} players` });
      return;
    }

    const { data: existing } = await supabase.from('users').select('id').in('id', invitees).eq('role', 'student');
    const validInvitees = ((existing as Array<{ id: string }>) || []).map((u) => u.id);
    if (validInvitees.length < 1) {
      res.status(400).json({ message: 'Invitees were not found' });
      return;
    }

    let questionIds: string[];
    try {
      questionIds = await pickQuestionIds(normSubject, classLevel || '', total);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
      return;
    }

    const { data: creator } = await supabase.from('users').select('name').eq('id', userId).maybeSingle();
    const subjectLabel = normSubject === 'all' ? 'Mixed Subjects' : normSubject.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const compTitle = (title || '').trim() || `${(creator as Record<string, unknown> | null)?.name || 'Your'} ${subjectLabel} Challenge`;

    const { data: inserted, error } = await supabase
      .from('competitions')
      .insert({
        created_by: userId,
        title: compTitle.slice(0, 80),
        subject: normSubject,
        class_level: classLevel ? normalizeClass(classLevel) : '',
        total_questions: questionIds.length,
        time_minutes: minutes,
        max_participants: MAX_PARTICIPANTS,
        question_ids: questionIds,
        status: 'pending',
      })
      .select()
      .single();
    if (error || !inserted) {
      res.status(500).json({ message: 'Failed to create competition' });
      return;
    }

    const participantRows = [
      { competition_id: inserted.id, user_id: userId, status: 'accepted', is_creator: true },
      ...validInvitees.map((uid) => ({ competition_id: inserted.id, user_id: uid, status: 'invited', is_creator: false })),
    ];
    await supabase.from('competition_participants').insert(participantRows);

    const creatorName = (creator as Record<string, unknown> | null)?.name || 'A classmate';
    for (const uid of validInvitees) {
      await pushNotification(
        uid,
        'competition_invite',
        'Competition invite',
        `${creatorName} challenged you to “${compTitle}” – ${questionIds.length} questions in ${minutes} min`,
        inserted.id
      );
    }

    await logAuditEvent({
      userId,
      action: 'competition_created',
      entityType: 'competition',
      entityId: inserted.id,
      details: { subject: normSubject, totalQuestions: questionIds.length, timeMinutes: minutes },
      ipAddress: clientIp(req),
    });

    res.status(201).json({
      competition: {
        id: inserted.id,
        createdBy: userId,
        title: compTitle.slice(0, 80),
        subject: normSubject,
        classLevel: classLevel ? normalizeClass(classLevel) : '',
        totalQuestions: questionIds.length,
        timeMinutes: minutes,
        maxParticipants: MAX_PARTICIPANTS,
        status: 'pending',
        createdAt: inserted.created_at,
        participants: [],
      },
    });
  } catch (error) {
    console.error('Create competition error:', error);
    res.status(500).json({ message: 'Failed to create competition' });
  }
}

async function groupByCompetition(
  req: AuthRequest,
  competitions: CompetitionRow[]
): Promise<Array<Record<string, unknown>>> {
  const compIds = competitions.map((c) => c.id);
  const { data: allP } = await supabase
    .from('competition_participants')
    .select('*')
    .in('competition_id', compIds);
  const byComp = new Map<string, ParticipantRow[]>();
  (allP as ParticipantRow[] || []).forEach((p) => {
    const list = byComp.get(p.competition_id) || [];
    list.push(p);
    byComp.set(p.competition_id, list);
  });

  const rows = await Promise.all(
    competitions.map(async (c) => {
      const participants = (byComp.get(c.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      await resolveIfDue(c, participants);
      return { competition: c, participants };
    })
  );

  const allNames = await fetchNames(
    rows.flatMap((r) => r.participants.map((p) => p.user_id)).concat(competitions.map((c) => c.created_by))
  );
  const creatorNames = await fetchNames(competitions.map((c) => c.created_by));

  return rows.map(({ competition: c, participants }) => {
    const mine = participants.find((p) => p.user_id === req.user!.id) || null;
    return {
      id: c.id,
      createdBy: c.created_by,
      creatorName: creatorNames.get(c.created_by) || 'Student',
      title: c.title,
      subject: c.subject,
      classLevel: c.class_level,
      totalQuestions: c.total_questions,
      timeMinutes: c.time_minutes,
      maxParticipants: c.max_participants,
      questionIds: parseJsonArray(c.question_ids) as string[],
      status: c.status,
      startedAt: c.started_at,
      endedAt: c.ended_at,
      winnerId: c.winner_id,
      createdAt: c.created_at,
      participants: participants.map((p) => serializeParticipant(p, allNames)),
      mine,
    };
  });
}

export async function getMyCompetitions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { data: created } = await supabase
      .from('competitions')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    const { data: joinedRows } = await supabase
      .from('competition_participants')
      .select('competition_id')
      .eq('user_id', userId);
    const joinedIds = (joinedRows as Array<{ competition_id: string }> || []).map((r) => r.competition_id);
    let joined: CompetitionRow[] = [];
    if (joinedIds.length > 0) {
      const { data } = await supabase.from('competitions').select('*').in('id', joinedIds).order('created_at', { ascending: false }).limit(50);
      joined = (data as CompetitionRow[]) || [];
    }
    const seen = new Set<string>();
    const merged: CompetitionRow[] = [];
    for (const c of [...(created || []), ...joined]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      merged.push(c);
    }
    merged.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const list = await groupByCompetition(req, merged);
    const openInvites = list.filter((c) => (c.mine as Record<string, unknown>)?.status === 'invited').length;
    res.json({ competitions: list, openInvites });
  } catch (error) {
    console.error('Get my competitions error:', error);
    res.status(500).json({ message: 'Failed to load competitions' });
  }
}

export async function getCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition) {
      res.status(404).json({ message: 'Competition not found' });
      return;
    }
    const participants = await getParticipants(competition.id);
    const isMember = participants.some((p) => p.user_id === req.user!.id);
    if (!isMember && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'You are not part of this competition' });
      return;
    }
    await resolveIfDue(competition, participants);

    const names = await fetchNames(participants.map((p) => p.user_id).concat([competition.created_by, competition.winner_id || '']));
    const mine = participants.find((p) => p.user_id === req.user!.id) || null;
    res.json({
      competition: {
        id: competition.id,
        createdBy: competition.created_by,
        creatorName: names.get(competition.created_by) || 'Student',
        title: competition.title,
        subject: competition.subject,
        classLevel: competition.class_level,
        totalQuestions: competition.total_questions,
        timeMinutes: competition.time_minutes,
        maxParticipants: competition.max_participants,
        questionIds: parseJsonArray(competition.question_ids) as string[],
        status: competition.status,
        startedAt: competition.started_at,
        endedAt: competition.ended_at,
        winnerId: competition.winner_id,
        winnerName: competition.winner_id ? names.get(competition.winner_id) || '' : null,
        createdAt: competition.created_at,
        participants: participants.map((p) => serializeParticipant(p, names)),
        mine,
      },
    });
  } catch (error) {
    console.error('Get competition error:', error);
    res.status(500).json({ message: 'Failed to load competition' });
  }
}

async function assertStatus(competition: CompetitionRow | null, allowed: string[]): Promise<string | null> {
  if (!competition) return 'Competition not found';
  if (!allowed.includes(competition.status)) return 'Competition is not open for this action';
  return null;
}

export async function acceptCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    const err = await assertStatus(competition, ['pending', 'live']);
    if (err) {
      res.status(400).json({ message: err });
      return;
    }
    const participant = await getParticipant(competition!.id, req.user!.id);
    if (!participant || participant.status !== 'invited') {
      res.status(400).json({ message: 'No pending invite found' });
      return;
    }
    const active = (await getParticipants(competition!.id)).filter(
      (p) => p.status !== 'declined' && p.status !== 'abandoned'
    ).length;
    if (active >= competition!.max_participants) {
      res.status(400).json({ message: 'Competition is full' });
      return;
    }
    await supabase
      .from('competition_participants')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', participant.id);
    const { data: me } = await supabase.from('users').select('name').eq('id', req.user!.id).maybeSingle();
    if (me) {
      await pushNotification(
        competition!.created_by,
        'competition_accepted',
        'Invite accepted',
        `${me.name} accepted your “${competition!.title}” challenge`,
        competition!.id
      );
    }
    await logAuditEvent({ userId: req.user!.id, action: 'competition_accepted', entityType: 'competition', entityId: competition!.id, ipAddress: clientIp(req) });
    res.json({ success: true });
  } catch (error) {
    console.error('Accept competition error:', error);
    res.status(500).json({ message: 'Failed to accept invite' });
  }
}

export async function declineCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    const err = await assertStatus(competition, ['pending', 'live']);
    if (err) {
      res.status(400).json({ message: err });
      return;
    }
    const participant = await getParticipant(competition!.id, req.user!.id);
    if (!participant || participant.status !== 'invited') {
      res.status(400).json({ message: 'No pending invite found' });
      return;
    }
    await supabase
      .from('competition_participants')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', participant.id);
    const { data: me } = await supabase.from('users').select('name').eq('id', req.user!.id).maybeSingle();
    if (me) {
      await pushNotification(
        competition!.created_by,
        'competition_declined',
        'Invite declined',
        `${me.name} declined your “${competition!.title}” challenge`,
        competition!.id
      );
    }
    await logAuditEvent({ userId: req.user!.id, action: 'competition_declined', entityType: 'competition', entityId: competition!.id, ipAddress: clientIp(req) });
    res.json({ success: true });
  } catch (error) {
    console.error('Decline competition error:', error);
    res.status(500).json({ message: 'Failed to decline invite' });
  }
}

export async function startCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    const err = await assertStatus(competition, ['pending']);
    if (err) {
      res.status(400).json({ message: err });
      return;
    }
    if (competition!.created_by !== req.user!.id) {
      res.status(403).json({ message: 'Only the creator can start the competition' });
      return;
    }
    const participants = await getParticipants(competition!.id);
    const playingCount = participants.filter((p) => {
      if (p.is_creator) return true;
      if (p.status === 'declined' || p.status === 'invited' || p.status === 'abandoned') return false;
      return true;
    }).length;
    if (playingCount < MIN_START_PLAYERS) {
      res.status(400).json({ message: `At least ${MIN_START_PLAYERS} players must accept before starting` });
      return;
    }
    await supabase
      .from('competitions')
      .update({ status: 'live', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', competition!.id);
    competition!.status = 'live';

    const names = await fetchNames(participants.map((p) => p.user_id));
    for (const p of participants) {
      if (p.user_id === req.user!.id) continue;
      if (p.status === 'accepted' || p.status === 'playing' || p.status === 'finished') {
        await pushNotification(
          p.user_id,
          'competition_started',
          'It has begun!',
          `“${competition!.title}” has started – ${competition!.total_questions} questions in ${competition!.time_minutes} min. Good luck!`,
          competition!.id
        );
      }
    }
    await logAuditEvent({ userId: req.user!.id, action: 'competition_started', entityType: 'competition', entityId: competition!.id, ipAddress: clientIp(req) });
    res.json({ success: true, status: 'live' });
  } catch (error) {
    console.error('Start competition error:', error);
    res.status(500).json({ message: 'Failed to start competition' });
  }
}

export async function startSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition || competition.status !== 'live') {
      res.status(400).json({ message: 'This competition has not started yet' });
      return;
    }
    const participant = await getParticipant(competition.id, req.user!.id);
    if (!participant) {
      res.status(403).json({ message: 'You are not part of this competition' });
      return;
    }
    if (participant.status === 'declined' || participant.status === 'invited') {
      res.status(400).json({ message: 'Accept the invite to play' });
      return;
    }
    if (participant.status === 'finished' || participant.status === 'abandoned') {
      res.status(400).json({ message: 'You already participated in this competition' });
      return;
    }
    const startedAt = participant.started_at || new Date().toISOString();
    if (!participant.started_at) {
      await supabase
        .from('competition_participants')
        .update({ status: 'playing', started_at: startedAt, updated_at: new Date().toISOString() })
        .eq('id', participant.id);
      participant.status = 'playing';
    }
    const questionIds = parseJsonArray(competition.question_ids) as string[];
    const questions = (await fetchQuestionsByIds(questionIds)).map(serializeQuestionPublic);
    const names = await fetchNames([competition.created_by]);
    res.json({
      session: {
        startedAt,
        endsAt: new Date(new Date(startedAt).getTime() + competition.time_minutes * 60 * 1000).toISOString(),
        timeMinutes: competition.time_minutes,
        totalQuestions: questions.length,
      },
      competition: {
        id: competition.id,
        title: competition.title,
        subject: competition.subject,
        creatorName: names.get(competition.created_by) || 'Student',
      },
      questions,
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Failed to start session' });
  }
}

export async function submitCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition || competition.status !== 'live') {
      res.status(400).json({ message: 'This competition is no longer live' });
      return;
    }
    const participant = await getParticipant(competition.id, req.user!.id);
    if (!participant || participant.status !== 'playing') {
      res.status(400).json({ message: 'No active session to submit' });
      return;
    }
    const body = req.body as {
      answers?: Array<{ questionId: string; answer: string | boolean | null }>;
      timeSpent?: number;
    };
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const maxSeconds = competition.time_minutes * 60 + ABANDON_GRACE_SECONDS;
    const timeSpent = Math.max(0, Math.min(maxSeconds, Math.round(Number(body.timeSpent) || 0)));

    const ids = answers.map((a) => a.questionId).filter(Boolean);
    const questions = (await fetchQuestionsByIds(ids, true)) as unknown as QuestionRow[];
    const questionMap = new Map<string, QuestionRow>();
    questions.forEach((q) => {
      const id = String(q.id);
      if (!questionMap.has(id)) questionMap.set(id, q);
    });

    let correct = 0;
    let answered = 0;
    const graded: Array<Record<string, unknown>> = answers.map((a) => {
      const q = questionMap.get(a.questionId);
      if (!q) return { questionId: a.questionId, isCorrect: false };
      const type = q.type;
      const committed = a.answer !== null && a.answer !== undefined && String(a.answer).trim() !== '';
      if (committed) answered++;
      let isCorrect = false;
      if (type === 'true-false') {
        const u = normalizeTrueFalseAnswer(a.answer);
        const c = normalizeTrueFalseAnswer(q.correct_answer);
        isCorrect = u !== null && c !== null && u === c && committed;
      } else {
        const u = canonicalOptionText(a.answer);
        const c = canonicalOptionText(q.correct_answer);
        isCorrect = committed && u.length > 0 && u === c;
      }
      if (isCorrect) correct++;
      return {
        questionId: a.questionId,
        userAnswer: a.answer,
        correctAnswer: q.correct_answer,
        isCorrect,
        subject: q.subject || '',
      };
    });

    const total = competition.total_questions;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const { data: updated, error } = await supabase
      .from('competition_participants')
      .update({
        status: 'finished',
        submitted_at: new Date().toISOString(),
        score,
        correct_answers: correct,
        answered_questions: answered,
        time_spent: timeSpent,
        answers: graded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', participant.id)
      .select()
      .single();
    if (error) {
      res.status(500).json({ message: 'Failed to save results' });
      return;
    }
    const saved = updated as ParticipantRow;

    const { data: me } = await supabase.from('users').select('name').eq('id', req.user!.id).maybeSingle();
    const others = (await getParticipants(competition.id)).filter((p) => p.user_id !== req.user!.id);
    for (const other of others) {
      if (other.status === 'invited' || other.status === 'declined') continue;
      await pushNotification(
        other.user_id,
        'competition_finished',
        'Someone finished',
        `${me?.name || 'A player'} submitted “${competition.title}” with ${score}%`,
        competition.id
      );
    }
    await logAuditEvent({ userId: req.user!.id, action: 'competition_submitted', entityType: 'competition', entityId: competition.id, details: { score }, ipAddress: clientIp(req) });

    const participants = (await getParticipants(competition.id)) as ParticipantRow[];
    await resolveIfDue(competition, participants);

    res.json({
      result: {
        score,
        correctAnswers: correct,
        answeredQuestions: answered,
        totalQuestions: total,
        timeSpent,
      },
      competition: {
        id: competition.id,
        status: competition.status,
        winnerId: competition.winner_id,
        endedAt: competition.ended_at,
      },
    });
  } catch (error) {
    console.error('Submit competition error:', error);
    res.status(500).json({ message: 'Failed to submit competition' });
  }
}

export async function abandonCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition || competition.status !== 'live') {
      res.status(400).json({ message: 'This competition is no longer live' });
      return;
    }
    const participant = await getParticipant(competition.id, req.user!.id);
    if (!participant || participant.status === 'finished' || participant.status === 'abandoned') {
      res.status(400).json({ message: 'Nothing to abandon' });
      return;
    }
    await supabase
      .from('competition_participants')
      .update({ status: 'abandoned', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', participant.id);
    await logAuditEvent({ userId: req.user!.id, action: 'competition_abandoned', entityType: 'competition', entityId: competition.id, ipAddress: clientIp(req) });
    res.json({ success: true });
  } catch (error) {
    console.error('Abandon competition error:', error);
    res.status(500).json({ message: 'Failed to abandon competition' });
  }
}

export async function cancelCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition) {
      res.status(404).json({ message: 'Competition not found' });
      return;
    }
    if (competition.created_by !== req.user!.id) {
      res.status(403).json({ message: 'Only the creator can cancel this competition' });
      return;
    }
    if (competition.status === 'finished' || competition.status === 'cancelled') {
      res.status(400).json({ message: 'This competition is already closed' });
      return;
    }
    await supabase
      .from('competitions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', competition.id);

    const participants = await getParticipants(competition.id);
    const names = await fetchNames(participants.map((p) => p.user_id).concat([competition.created_by]));
    const creatorName = names.get(competition.created_by) || 'The host';
    for (const p of participants) {
      if (p.user_id === req.user!.id) continue;
      await pushNotification(
        p.user_id,
        'competition_cancelled',
        'Competition cancelled',
        `${creatorName} cancelled “${competition.title}”`,
        competition.id
      );
    }
    await logAuditEvent({ userId: req.user!.id, action: 'competition_cancelled', entityType: 'competition', entityId: competition.id, ipAddress: clientIp(req) });
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel competition error:', error);
    res.status(500).json({ message: 'Failed to cancel competition' });
  }
}

export async function listCompetitionsAdmin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    const competitions = (data as CompetitionRow[]) || [];
    const compIds = competitions.map((c) => c.id);
    const { data: allP } = await supabase
      .from('competition_participants')
      .select('*')
      .in('competition_id', compIds);
    const byComp = new Map<string, ParticipantRow[]>();
    (allP as ParticipantRow[] || []).forEach((p) => {
      const list = byComp.get(p.competition_id) || [];
      list.push(p);
      byComp.set(p.competition_id, list);
    });
    const names = await fetchNames(competitions.map((c) => c.created_by).concat((allP as ParticipantRow[] || []).map((p) => p.user_id)));

    const list = competitions.map((c) => {
      const participants = byComp.get(c.id) || [];
      return {
        id: c.id,
        title: c.title,
        subject: c.subject,
        creatorName: names.get(c.created_by) || 'Student',
        status: c.status,
        totalQuestions: c.total_questions,
        timeMinutes: c.time_minutes,
        maxParticipants: c.max_participants,
        createdAt: c.created_at,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        winnerId: c.winner_id,
        winnerName: c.winner_id ? names.get(c.winner_id) || '' : null,
        participantCount: participants.filter((p) => p.status !== 'declined' && p.status !== 'invited').length,
        finishedCount: participants.filter((p) => p.status === 'finished').length,
      };
    });
    res.json({ competitions: list });
  } catch (error) {
    console.error('Admin list competitions error:', error);
    res.status(500).json({ message: 'Failed to load competitions' });
  }
}

export async function adminGetCompetition(req: AuthRequest, res: Response): Promise<void> {
  try {
    const competition = await getCompetitionRow(String(req.params.id || ''));
    if (!competition) {
      res.status(404).json({ message: 'Competition not found' });
      return;
    }
    const participants = await getParticipants(competition.id);
    const names = await fetchNames(participants.map((p) => p.user_id).concat([competition.created_by, competition.winner_id || '']));
    res.json({
      competition: {
        id: competition.id,
        createdBy: competition.created_by,
        creatorName: names.get(competition.created_by) || 'Student',
        title: competition.title,
        subject: competition.subject,
        classLevel: competition.class_level,
        totalQuestions: competition.total_questions,
        timeMinutes: competition.time_minutes,
        maxParticipants: competition.max_participants,
        questionIds: parseJsonArray(competition.question_ids) as string[],
        status: competition.status,
        startedAt: competition.started_at,
        endedAt: competition.ended_at,
        winnerId: competition.winner_id,
        winnerName: competition.winner_id ? names.get(competition.winner_id) || '' : null,
        createdAt: competition.created_at,
        participants: participants.map((p) => ({
          ...serializeParticipant(p, names),
          answers: parseJsonArray(p.answers) as Array<Record<string, unknown>>,
        })),
      },
    });
  } catch (error) {
    console.error('Admin get competition error:', error);
    res.status(500).json({ message: 'Failed to load competition' });
  }
}

export async function getCompetitionStatsAdmin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data } = await supabase.from('competitions').select('status');
    const rows = (data as Array<{ status: string }>) || [];
    const byStatus = { pending: 0, live: 0, finished: 0, cancelled: 0 };
    rows.forEach((r) => {
      if (r.status in byStatus) byStatus[r.status as keyof typeof byStatus]++;
    });
    const { count: participantCount } = await supabase.from('competition_participants').select('*', { count: 'exact', head: true });
    res.json({
      total: rows.length,
      byStatus,
      participantCount: participantCount || 0,
    });
  } catch (error) {
    console.error('Admin competition stats error:', error);
    res.status(500).json({ message: 'Failed to load stats' });
  }
}