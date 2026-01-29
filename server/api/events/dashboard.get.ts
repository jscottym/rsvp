import prisma from '../../utils/db';

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  const now = new Date();

  // Find all events where user is organizer OR has an RSVP
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: auth.user.id },
        { rsvps: { some: { userId: auth.user.id } } },
      ],
    },
    orderBy: {
      datetime: 'asc',
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
        },
      },
      rsvps: {
        select: {
          id: true,
          status: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
        },
        orderBy: { updatedAt: 'asc' },
      },
      _count: {
        select: {
          rsvps: {
            where: { status: 'IN' },
          },
        },
      },
    },
  });

  // Helper to map event data
  const mapEvent = (e: (typeof events)[0]) => {
    const userRsvp = e.rsvps.find((r) => r.userId === auth.user.id);
    const displayStatuses = ['IN', 'MAYBE', 'IN_IF'];
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      sportType: e.sportType,
      location: e.location,
      datetime: e.datetime,
      endDatetime: e.endDatetime,
      maxPlayers: e.maxPlayers,
      rsvpCount: e._count.rsvps,
      isOrganizer: e.organizerId === auth.user.id,
      userRsvpStatus: userRsvp?.status ?? null,
      organizer: e.organizer,
      attendees: e.rsvps
        .filter((r) => displayStatuses.includes(r.status))
        .map((r) => ({
          id: r.id,
          status: r.status,
          name: r.user.nickname || r.user.name || 'Anonymous',
          userId: r.userId,
        })),
    };
  };

  // Split into upcoming and past, with appropriate ordering
  const upcoming = events
    .filter((e) => new Date(e.datetime) >= now)
    .map(mapEvent);

  const past = events
    .filter((e) => new Date(e.datetime) < now)
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    )
    .map(mapEvent);

  return {
    upcoming,
    past,
  };
});
