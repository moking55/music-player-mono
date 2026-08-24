export type PollDuration = 30 | 60 | 120;
export type PollChoice = 'yes' | 'no';
export type PollStatus = 'active' | 'ended';

export interface PollState {
  pollId: string;
  question: string;
  duration: PollDuration;
  startedAt: number;
  expiresAt: number;
  status: PollStatus;
  yesCount: number;
  noCount: number;
}
