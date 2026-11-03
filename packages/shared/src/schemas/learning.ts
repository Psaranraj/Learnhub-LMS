import { z } from 'zod';
import { paginationSchema } from './common';

/** Seconds between two heartbeats while a video plays (HLD 6, "Topic unlock and watch tracking"). */
export const HEARTBEAT_SECONDS = 10;

/**
 * Sent every 10 seconds while the video plays, and once on pause. positionSec is where the player is (used to
 * resume); watchedSec is the real playback the player counted since the last heartbeat (seeking adds nothing).
 * The server credits at most twice the real time that passed, so a forged number gains nothing.
 */
export const heartbeatSchema = z.object({
  positionSec: z.number().min(0).max(36000),
  watchedSec: z.number().min(0).max(120),
});

export const noteSchema = z.object({
  note: z.string().max(5000, 'A note can be up to 5000 characters.'),
});

/** The student's own courses (GET /enrollments/mine). */
export const myCoursesQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional(),
});

export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type MyCoursesQuery = z.infer<typeof myCoursesQuerySchema>;
