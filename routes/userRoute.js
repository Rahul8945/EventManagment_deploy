const { Router } = require('express');
const { roles, userModel } = require('../models/userModel');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const eventModel = require('../models/eventModel');
const auth = require('../middleware/auth');


const userRouter = Router();
dotenv.config();
const secret_key = process.env.SECRET_KEY;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: Email of the user
 *         password:
 *           type: string
 *           description: Password of the user
 *         phone:
 *           type: string
 *           description: Phone number of the user
 *         role:
 *           type: string
 *           enum: [admin, user]
 *           description: Role of the user
 *         activity:
 *           type: boolean
 *           description: Activity status of the user
 */

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [User]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Signup successful
 *       400:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
userRouter.post('/register', async (req, res) => {
    const { email, password, phone } = req.body;
    try {
        const check = await userModel.findOne({ email });
        if (check) {
            return res.status(400).json({ message: 'User already exists. Please login.' });
        }

        const role = email === 'admin@gmail.com' ? roles.admin : roles.user;
        const hashedPassword = await bcrypt.hash(password, 8);
        const user = await userModel.create({
            email,
            password: hashedPassword,
            phone,
            role
        });

        return res.status(201).json({
            message: "Signup successful. Please login to see events.",
            user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred, Please try again later.' });
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [User]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *       403:
 *         description: User does not exist
 *       400:
 *         description: Invalid credentials or account disabled
 *       500:
 *         description: Internal server error
 */
userRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(403).json({ message: "user does not exist. please signup" });
        }
        if (!user.activity) {
            return res.status(400).json({ message: "you have been disabled by admin." });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const payload = { email: user.email };
            jwt.sign(payload, secret_key, (err, token) => {
                if (err) {
                    return res.status(400).json({ message: "an error occurred. please try again later" });
                }
                return res.status(200).json({ token, user: user._id, role: user.role });
            });
        } else {
            return res.status(400).json({ message: 'Email address and password do not match.' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error" });
    }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     tags: [User]
 *     summary: Logout user
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Internal server error
 */
userRouter.post('/logout',auth, (req, res) => {
    try {
        return res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /all:
 *   get:
 *     tags: [User]
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 */
userRouter.get('/all', async (req, res) => {
    try {
        const user = await userModel.find({});
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error" });
    }
});

/**
 * @swagger
 * /{id}:
 *   delete:
 *     tags: [User]
 *     summary: Delete a user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }
        await eventModel.deleteMany({ user: id });
        await userModel.findByIdAndDelete(id);
        return res.status(200).json({ message: "user deleted" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "internal server error" });
    }
});

/**
 * @swagger
 * /admin-route:
 *   get:
 *     tags: [User]
 *     summary: Get all users except admin
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 */
userRouter.get('/admin-route', async (req, res) => {
    try {
        const users = await userModel.find({ role: { $ne: roles.admin } });
        return res.status(200).json(users);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /update-role/{id}:
 *   patch:
 *     tags: [User]
 *     summary: Update user role by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 description: New role
 *     responses:
 *       200:
 *         description: User role updated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRouter.patch('/update-role/:id', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await userModel.findByIdAndUpdate(id, { role }, { new: true });
        return res.status(200).json({ message: 'User role has been updated' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /toggle-activity/{id}:
 *   patch:
 *     tags: [User]
 *     summary: Toggle user activity by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User activity status updated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRouter.patch('/toggle-activity/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.activity = !user.activity;
        await user.save();
        return res.status(200).json({ message: `User has been ${user.activity ? 'Enabled' : 'Disabled'}` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = userRouter;

