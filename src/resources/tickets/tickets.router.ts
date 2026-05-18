import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as ticketsController from './tickets.controller';

const router = Router();

router.get('/', asyncHandler(ticketsController.getTickets));
router.post('/bulk', asyncHandler(ticketsController.createTicketsBulk));

export { router as ticketsRouter };
