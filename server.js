const express=require('express')
const dotenv=require('dotenv');
const connectDB = require('./configs/db');
const userRouter = require('./routes/userRoute');
const eventRouter = require('./routes/eventRoute');
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
 const swaggerSpec=require('./swagger/swagger');
 const bodyParser = require('body-parser');
 const auth = require('./middleware/auth');
 const morgan = require('morgan');
const { scheduleReminder, scheduleFeedbackRequest } = require('./email/scheduler');
const sendEmail = require('./email/email');
const socketIo = require('socket.io');
const http = require('http');
const logger = require('./log/logger');

dotenv.config()
const app=express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// app.use(morgan('combined', { stream: { write: msg => logger.info(msg) } }));
logger.log('info',"this is a server log")

const server = http.createServer(app);
const io = socketIo(server);


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/',(req,res)=>{
    res.send("this is home route") 
    logger.log('info',"this is a server log")
})

let events=[];

// Real-time polls
let polls = [];
let questions = [];
let feedback = [];


io.on('connection', (socket) => {
    console.log('New client connected');
  
    socket.emit('allEvents', events);

    // Handle new poll
  socket.on('createPoll', (poll) => {
    polls.push(poll);
    io.emit('pollCreated', poll);
  });
  // Handle vote on a poll
  socket.on('votePoll', (vote) => {
    const poll = polls.find(p => p.id === vote.pollId);
    if (poll) {
      poll.options = poll.options.map(option =>
        option.id === vote.optionId
          ? { ...option, votes: option.votes + 1 }
          : option
      );
      io.emit('pollUpdated', poll);
    }
  });

  // Handle Q&A
  socket.on('askQuestion', (question) => {
    questions.push(question);
    io.emit('newQuestion', question);
  });

  socket.on('answerQuestion', (answer) => {
    questions = questions.map(q => (q.id === answer.questionId ? { ...q, answer } : q));
    io.emit('questionAnswered', answer);
  });

  // Handle feedback
  socket.on('submitFeedback', (feedbackItem) => {
    feedback.push(feedbackItem);
    io.emit('feedbackReceived', feedbackItem);
  });

    socket.on('updateEvent', (event) => {
    console.log('Event update received:', event);
    const index = events.findIndex(e => e.id === event.id);
    if (index !== -1) {
      events[index] = event;
      io.emit('eventUpdated', event); 
    }
  });
  
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  /**
 * @swagger
 * tags:
 *   name: Events
 *   description: The events managing API
 */

/**
 * @swagger
 * /create-event:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: object
 *                 description: The event details
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the event
 *                   name:
 *                     type: string
 *                     description: Name of the event
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                     description: Start time of the event
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     description: End time of the event
 *               userEmail:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user
 *     responses:
 *       200:
 *         description: Event created successfully, email sent, and emails scheduled.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Event created, immediate email sent, and emails scheduled.
 *       500:
 *         description: Failed to send immediate email
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Event created, but failed to send immediate email.
 */
app.post('/create-event', async(req, res) => {
    const { event, userEmail } = req.body;
  
    events.push(event);

    const result = await sendEmail({
        email: userEmail,
        subject: `Event Created: ${event.name}`,
        message: `Dear User, your event "${event.name}" has been successfully created and scheduled to start on ${event.startTime}.`
      });
    scheduleReminder(event, userEmail);
    scheduleFeedbackRequest(event, userEmail);
  
    io.emit('eventCreated', event);

    if (result.success) {
      res.status(200).send('Event created, immediate email sent, and emails scheduled.');
    } else {
      res.status(500).send('Event created, but failed to send immediate email.');
    }
  });
/**
 * @swagger
 * /events:
 *   get:
 *     summary: Retrieve a list of events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: A list of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the event
 *                   name:
 *                     type: string
 *                     description: Name of the event
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                     description: Start time of the event
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     description: End time of the event
 *       500:
 *         description: Failed to retrieve events
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Failed to retrieve events
 */
  app.get('/events', (req, res) => {
    res.json(events);
    logger.log('info',"this is a events server log")
  });

app.use('/user',userRouter)
app.use('/userEvent',auth,eventRouter)

const db_url=process.env.DB_URL
const port=process.env.PORT || 9090;

app.listen(port,async()=>{
    try {
        await connectDB(db_url)
        console.log(`server is running on http://localhost:${port}`);
    } catch (error) {
        console.log(error)
    }
})