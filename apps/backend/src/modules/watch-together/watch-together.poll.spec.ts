import { RoomMemoryRepository } from './repositories/room.memory-repository';
import { WatchTogetherService } from './watch-together.service';

describe('WatchTogetherService polls', () => {
  let repository: RoomMemoryRepository;
  let service: WatchTogetherService;

  beforeEach(async () => {
    repository = new RoomMemoryRepository();
    service = new WatchTogetherService(repository);
    await repository.createRoom('ROOM01', 'host');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows one active poll and rejects an overlapping poll', async () => {
    const first = await service.createPoll('ROOM01', 'Should we play this?', 60);
    const second = await service.createPoll('ROOM01', 'Play another song?', 30);

    expect(first).toMatchObject({ status: 'active', yesCount: 0, noCount: 0 });
    expect(second).toBeNull();
  });

  it('accepts one vote per browser voter and updates counts', async () => {
    const poll = await service.createPoll('ROOM01', 'Is this song fun?', 60);
    expect(poll).not.toBeNull();

    const accepted = await service.votePoll('ROOM01', poll!.pollId, 'voter-123456789012', 'yes');
    const duplicate = await service.votePoll('ROOM01', poll!.pollId, 'voter-123456789012', 'no');

    expect(accepted.outcome).toBe('accepted');
    expect(accepted.poll).toMatchObject({ yesCount: 1, noCount: 0 });
    expect(duplicate.outcome).toBe('already-voted');
    expect(duplicate.poll).toMatchObject({ yesCount: 1, noCount: 0 });
  });

  it('keeps final result briefly, then removes expired poll', async () => {
    const poll = await service.createPoll('ROOM01', 'Should this expire?', 30);
    expect(poll).not.toBeNull();

    jest.spyOn(Date, 'now').mockReturnValue(poll!.expiresAt + 1);
    const ended = await service.getPollState('ROOM01');
    expect(ended).toMatchObject({ pollId: poll!.pollId, status: 'ended' });

    jest.spyOn(Date, 'now').mockReturnValue(poll!.expiresAt + 5_001);
    expect(await service.getPollState('ROOM01')).toBeNull();
  });
});
