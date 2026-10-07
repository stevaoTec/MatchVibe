import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const swipeSchema = z.object({
  targetUserId: z.number(),
  direction: z.enum(['like', 'dislike', 'superlike'])
});

// POST /api/swipes - Swipe on a user
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId, direction } = swipeSchema.parse(req.body);
    const userId = req.userId as number;

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Você não pode curtir a si mesmo' });
    }

    // Check if already swiped
    const existing = await prisma.swipe.findUnique({
      where: {
        swiperId_swipedId: {
          swiperId: userId,
          swipedId: targetUserId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Você já deu swipe neste usuário' });
    }

    // Create swipe
    await prisma.swipe.create({
      data: {
        swiperId: userId,
        swipedId: targetUserId,
        direction
      }
    });

    // Check for match if it was a like or superlike
    let matchResult = null;
    if (direction === 'like' || direction === 'superlike') {
      const mutualLike = await prisma.swipe.findFirst({
        where: {
          swiperId: targetUserId,
          swipedId: userId,
          direction: { in: ['like', 'superlike'] }
        }
      });

      if (mutualLike) {
        // It's a match!
        const match = await prisma.match.create({
          data: {
            user1Id: userId,
            user2Id: targetUserId,
            isSuper: direction === 'superlike' || mutualLike.direction === 'superlike'
          }
        });

        const matchedUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, name: true, bio: true, age: true, profilePhoto: true }
        });

        matchResult = {
          matchId: match.id,
          user: matchedUser
        };
      }
    }

    res.json({ success: true, match: matchResult });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors[0].message });
    }
    console.error('Swipe error:', error);
    res.status(500).json({ error: 'Erro interno ao realizar swipe' });
  }
});

// DELETE /api/swipes/rewind - Undo the last swipe
router.delete('/rewind', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;

    // Find the most recent swipe by this user
    const lastSwipe = await prisma.swipe.findFirst({
      where: { swiperId: userId },
      orderBy: { id: 'desc' }
    });

    if (!lastSwipe) {
      return res.status(400).json({ error: 'Nenhum swipe para desfazer' });
    }

    const { id: swipeId, swipedId, direction } = lastSwipe;

    // If it was a like/superlike, check if it created a match and delete it
    if (direction === 'like' || direction === 'superlike') {
      const match = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: swipedId },
            { user1Id: swipedId, user2Id: userId }
          ]
        }
      });

      if (match) {
        // Delete associated messages first
        await prisma.message.deleteMany({
          where: { matchId: match.id }
        });
        // Delete the match
        await prisma.match.delete({
          where: { id: match.id }
        });
      }
    }

    // Delete the swipe
    await prisma.swipe.delete({
      where: { id: swipeId }
    });

    // Fetch the rewound user to return to the frontend
    const rewoundUser = await prisma.user.findUnique({
      where: { id: swipedId },
      select: {
        id: true, name: true, bio: true, age: true, gender: true,
        profilePhoto: true, coverPhoto: true, photos: true, interests: true, verified: true
      }
    });

    if (rewoundUser) {
      const mappedUser = {
        ...rewoundUser,
        photos: JSON.parse(rewoundUser.photos || '[]'),
        interests: JSON.parse(rewoundUser.interests || '[]'),
        verified: Boolean(rewoundUser.verified)
      };
      return res.json({ success: true, user: mappedUser });
    }

    res.json({ success: true, user: null });
  } catch (error) {
    console.error('Rewind error:', error);
    res.status(500).json({ error: 'Erro interno ao desfazer swipe' });
  }
});

export default router;
