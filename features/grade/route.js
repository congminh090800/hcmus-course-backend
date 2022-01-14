const express = require("express");
const router = express.Router();
const authenticate = require("middlewares/authenticate.middleware");
const roleAuthenticate = require("middlewares/role_authorize.middleware.js");
const validator = require("middlewares/validator.middleware");
const controller = require("./controller");
const requestSchema = require("./validator");

// upload handler
const multer = require("multer");
var storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get(
  "/grade/student-list-template",
  authenticate,
  controller.generateStudentTemplate
);

router.get(
  "/grade/grade-template",
  authenticate,
  roleAuthenticate,
  validator(requestSchema.gradeTemplate, "query"),
  controller.gradeTemplate
);

router.put(
  "/grade/upload-student-list",
  upload.single("csvFile"),
  authenticate,
  roleAuthenticate,
  validator(requestSchema.uploadStudentList),
  controller.uploadStudentList
);

router.put(
  "/grade/finalize-grades",
  authenticate,
  roleAuthenticate,
  validator(requestSchema.finalizeGrades),
  controller.finalizeGrades
);

router.patch(
  "/grade/add-or-update-student",
  authenticate,
  roleAuthenticate,
  validator(requestSchema.addStudent),
  controller.addStudent
);

router.put(
  "/grade/upload-grades",
  upload.single("csvFile"),
  authenticate,
  roleAuthenticate,
  validator(requestSchema.uploadGrades),
  controller.uploadGrades
);

router.patch(
  "/grade/finalize-column",
  authenticate,
  roleAuthenticate,
  validator(requestSchema.finalizeGradeComponent),
  controller.finalizeColumn
);

router.patch(
  "/grade/unfinalize-column",
  authenticate,
  roleAuthenticate,
  validator(requestSchema.finalizeGradeComponent),
  controller.unfinalizeColumn
);

router.post(
  '/grade/request-review',
  authenticate,
  validator(requestSchema.requestReview),
  controller.requestReview
);

router.post(
  '/grade/accept-request',
  authenticate,
  roleAuthenticate,
  validator(requestSchema.acceptRequest),
  controller.acceptRequest
);

module.exports = router;

/**
 * @swagger
 * /api/grade/student-list-template:
 *  get:
 *      tags:
 *          - grade
 *      summary: Download student list template
 *      responses:
 *          200:
 *              description: Return csv file
 */

/**
 * @swagger
 * /api/grade/upload-student-list:
 *  put:
 *      tags:
 *          - grade
 *      summary: Upload csv student list
 *      requestBody:
 *          required: true
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          courseId:
 *                              type: string
 *                              required: true
 *                          csvFile:
 *                              type: string
 *                              format: binary
 *                              required: true
 *      responses:
 *          200:
 *              description: Return result
 *
 */

/**
 * @swagger
 * /api/grade/finalize-grades:
 *  put:
 *      tags:
 *          - grade
 *      summary: Update data of a grade component in a course
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                           {
 *                               "courseId": "619d0228ca30412f1dfcee09",
 *                               "gradeComponentId": "61a664c7b64e25dd815e8b1a",
 *                               "listPoints": [
 *                                   {
 *                                      studentId: "123123",
 *                                      point: 3  
 *                                   },
 *                                   {
 *                                      studentId: "2133",
 *                                      point: 5  
 *                                   }
 *                               ]
 *                           }
 *      responses:
 *          200:
 *              description: OK
 *
 */

/**
 * @swagger
 * /api/grade/add-or-update-student:
 *  patch:
 *      tags:
 *          - grade
 *      summary: Add or update a student to enrolled list
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                           {
 *                               "courseId": "619d0228ca30412f1dfcee09",
 *                               "fullName": "whatever the name",
 *                               "studentId": "1284093"
 *                           }
 *      responses:
 *          200:
 *              description: OK
 *
 */

/**
 * @swagger
 * /api/grade/grade-template:
 *  get:
 *      tags:
 *          - grade
 *      summary: Download csv grade template
 *      parameters:
 *          -   name: courseId
 *              in: query
 *              schema:
 *                  type: string
 *          -   name: gradeComponentId
 *              in: query
 *              schema:
 *                  type: string
 *      responses:
 *          200:
 *              description: Return csv file
 */

/**
 * @swagger
 * /api/grade/upload-grades:
 *  put:
 *      tags:
 *          - grade
 *      summary: Upload csv grade
 *      requestBody:
 *          required: true
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          courseId:
 *                              type: string
 *                              required: true
 *                          gradeComponentId:
 *                              type: string
 *                              requỉed: true
 *                          csvFile:
 *                              type: string
 *                              format: binary
 *                              required: true
 *      responses:
 *          200:
 *              description: Return result
 *
 */

/**
 * @swagger
 * /api/grade/finalize-column:
 *  patch:
 *      tags:
 *          - grade
 *      summary: Finalize a grade component of structure
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                           {
 *                               "courseId": "619d0228ca30412f1dfcee09",
 *                               "gradeComponentId": "61a664c7b64e25dd815e8b1a",
 *                           }
 *      responses:
 *          200:
 *              description: OK
 *
 */

/**
 * @swagger
 * /api/grade/unfinalize-column:
 *  patch:
 *      tags:
 *          - grade
 *      summary: Unfinalize a grade component of structure
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      example:
 *                           {
 *                               "courseId": "619d0228ca30412f1dfcee09",
 *                               "gradeComponentId": "61a664c7b64e25dd815e8b1a",
 *                           }
 *      responses:
 *          200:
 *              description: OK
 *
 */