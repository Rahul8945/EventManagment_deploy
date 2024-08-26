const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const eventModel = require('../models/eventModel');
const auth = require('../middleware/auth');
const eventRouter = Router();
eventRouter.use(auth); 

// Rate Limiter: Limits registration to once per day per user
const registerLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1, // limit each user to 1 request per day
    message: "You can only register for an event once per day",
    keyGenerator: (req) => req.user._id.toString() // Use user ID as the key
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - eventName
 *         - price
 *         - capacity
 *       properties:
 *         eventName:
 *           type: string
 *           description: Name of the event
 *         price:
 *           type: number
 *           description: Price of the event
 *         capacity:
 *           type: number
 *           description: Capacity of the event
 */

/**
 * @swagger
 * /userEvent:
 *   get:
 *     tags: [Event]
 *     summary: Show all the events of the logged-in user
 *     responses:
 *       200:
 *         description: Shows all events successfully
 *       500:
 *         description: Internal server error
 */
eventRouter.get('/', async (req, res) => {
    try {
        const events = await eventModel.find({ user: req.user._id }).populate('user', 'email phone activity role');
        return res.status(200).send(events);
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /userEvent:
 *   post:
 *     tags: [Event]
 *     summary: Create an event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       500:
 *         description: Internal server error
 */
eventRouter.post('/', async (req, res) => {
    const { eventName, price, capacity } = req.body;
    try {
        const event = await eventModel.create({
            eventName,
            price,
            capacity,
            user: req.user._id,
            registeredUsers: [] // Initialize registeredUsers array
        });
        return res.status(201).send(event);
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /userEvent/{id}:
 *   delete:
 *     tags: [Event]
 *     summary: Delete an event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
eventRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const event = await eventModel.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        await eventModel.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Event deleted' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /userEvent/all:
 *   get:
 *     tags: [Event]
 *     summary: Show all events by other users
 *     responses:
 *       200:
 *         description: Shows all events successfully
 *       500:
 *         description: Internal server error
 */
eventRouter.get('/all', async (req, res) => {
    try {
        const events = await eventModel.find({ user: { $ne: req.user._id } }).populate('user', 'email phone activity role');
        return res.status(200).send(events);
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /userEvent/register-event/{id}:
 *   post:
 *     tags: [Event]
 *     summary: Register for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Registered successfully
 *       404:
 *         description: Event not found
 *       400:
 *         description: Already registered or event at full capacity
 *       500:
 *         description: Internal server error
 */
eventRouter.post('/register-event/:id', registerLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const event = await eventModel.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.registeredUsers.includes(req.user._id)) {
            return res.status(400).json({ message: 'You are already registered for this event' });
        }
        if (event.registeredUsers.length >= event.capacity) {
            return res.status(400).json({ message: 'Event is already at full capacity' });
        }

        event.registeredUsers.push(req.user._id);
        event.price = Math.ceil(event.price * 1.1); // Increase price by 10%
        await event.save();

        const registeredEvents = await eventModel.find({ registeredUsers: req.user._id })
            .populate('user', 'email phone activity role');
        return res.status(200).json(registeredEvents);
    } catch (err) {
        console.error('Error registering for event:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = eventRouter;
