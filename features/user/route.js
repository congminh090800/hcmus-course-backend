const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("middlewares/validator.middleware");
const requestSchema = require("./validator");
const authenticate = require("middlewares/authenticate.middleware");

router.get("/user/me", authenticate, controller.findMe);

router.post("/signup", validator(requestSchema.signUp), controller.signUp);

router.post("/signin", validator(requestSchema.signIn), controller.signIn);

// router.post("/createAdmin", authenticate, authorize, controller.createAdmin);

router.post(
  "/refreshToken",
  validator(requestSchema.refreshToken),
  controller.refreshToken
);

router.get("/user/:id", authenticate, controller.findById);

router.put(
  "/user",
  authenticate,
  validator(requestSchema.updateProfile),
  controller.updateProfile
);

router.patch(
  "/user/student-id",
  validator(requestSchema.setStudentId, "body"),
  authenticate,
  controller.setStudentId
);

router.patch(
  "/user/verify-email",
  validator(requestSchema.verifyEmail, "body"),
  controller.verifyEmail
);

module.exports = router;

/**
 * @swagger
 * /api/signup:
 *  post:
 *      tags:
 *          - user
 *      summary: Create new account
 *      requestBody:
 *          description: User information
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                          {
 *                               "email": "tester4@gmail.com",
 *                               "password": "abc123456",
 *                               "name": "Tester no.4",
 *                               "phone": "0195698121",
 *                               "gender": "female",
 *                               "birthDate": "2018-03-20T09:12:28Z",
 *                               "avatar": "https://abc.com/some-link",
 *                           }
 *      responses:
 *          200:
 *              description: Return access token
 *              examples:
 *                  application/json:
 *                      {
 *                          "data": "61754d7b81dd1d44c3013172"
 *                      }
 *
 */

/**
 * @swagger
 * /api/signin:
 *  post:
 *      tags:
 *          - user
 *      summary: Sign in
 *      requestBody:
 *          description: Username and password
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                          {
 *                               "email": "tester1@gmail.com",
 *                               "password": "Design023",
 *                           }
 *      responses:
 *          200:
 *              description: Return access token
 *              examples:
 *                  application/json:
 *                      {
 *                          "data": "61754d7b81dd1d44c3013172"
 *                      }
 *
 */

/**
 * @swagger
 * /api/createAdmin:
 *  post:
 *      tags:
 *          - user
 *      summary: Promote a user to become admin
 *      requestBody:
 *          description: Enter user id
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                          {
 *                               "userId": "61748455a3966446b239dd87"
 *                           }
 *      responses:
 *          200:
 *              description: Return access token
 *              examples:
 *                  application/json:
 *                      {
 *                          "data": "61754d7b81dd1d44c3013172"
 *                      }
 *
 */

/**
 * @swagger
 * /api/user/me:
 *  get:
 *      tags:
 *          - user
 *      summary: Query your information
 *      responses:
 *          200:
 *              description: Return user info
 */

/**
 * @swagger
 * /api/user/{userId}:
 *  get:
 *      tags:
 *          - user
 *      summary: Query a user information
 *      parameters:
 *          -   name: userId
 *              in: path
 *              required: true
 *              schema:
 *                  type: string
 *      responses:
 *          200:
 *              description: Return user info
 */

/**
 * @swagger
 * /api/refreshToken:
 *  post:
 *      tags:
 *          - user
 *      summary: Refresh jwt
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                          {
 *                               "userId": "61748455a3966446b239dd87",
 *                               "refreshToken": "some-token"
 *                           }
 *      responses:
 *          200:
 *              description: Return new access token
 *              examples:
 *                  application/json:
 *                      {
 *                          "data": "new-token"
 *                      }
 *
 */

/**
 * @swagger
 * /api/user:
 *  put:
 *      tags:
 *          - user
 *      summary: Update user profile
 *      requestBody:
 *          description: User information
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                          {
 *                               "name": "Random name",
 *                               "phone": "0195698121",
 *                               "gender": "female",
 *                               "birthDate": "2018-03-20T09:12:28Z",
 *                           }
 *      responses:
 *          200:
 *              description: Return user info
 *
 */

/**
 * @swagger
 * /api/user/student-id:
 *  patch:
 *      tags:
 *         - user
 *      summary: Set Student ID
 *      requestBody:
 *          description: Student ID want to map
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                           {
 *                               "studentId": "18120480"
 *                           }
 *      responses:
 *          200:
 *              description: Return "true"
 *
 */
