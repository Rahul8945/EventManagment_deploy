const schedule = require('node-schedule');
const sendEmail = require('./email');

// Schedule a reminder email 24 hours before the event starts
function scheduleReminder(event, userEmail) {
  const eventStartTime = new Date(event.startTime);
  const reminderTime = new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000);

  schedule.scheduleJob(reminderTime, () => {
    sendEmail({
      email: userEmail,
      subject: `Reminder: ${event.name} is starting soon!`,
      message: `Dear User, just a reminder that the event "${event.name}" will start on ${event.startTime}.`
    });
  });
}

// Schedule a feedback request email 24 hours after the event ends
function scheduleFeedbackRequest(event, userEmail) {
  const eventEndTime = new Date(event.endTime);
  const feedbackTime = new Date(eventEndTime.getTime() + 24 * 60 * 60 * 1000);

  schedule.scheduleJob(feedbackTime, () => {
    sendEmail({
      email: userEmail,
      subject: `We’d love your feedback on ${event.name}`,
      message: `Dear User, thank you for attending "${event.name}". We would appreciate your feedback to help us improve.`
    });
  });
}

module.exports = { scheduleReminder, scheduleFeedbackRequest };
