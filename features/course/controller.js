const { Course, User, Invitation, Mapping } = require("models");
const { generateRoomCode } = require("lib/regex-helpers");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const config = require("../../config");

module.exports = {
  create: async (req, res, next) => {
    try {
      const { body } = req;
      let existed;
      let code;
      do {
        code = generateRoomCode();
        existed = await Course.findOne({ code: code });
      } while (existed);
      let participants = body.participants;
      if (participants) {
        for (let i = 0; i < body.participants.length; i++) {
          const valid = await User.findOne({
            deleted_flag: false,
            _id: mongoose.Types.ObjectId(body.participants[i]),
          });
          if (!valid) {
            return res.notFound(
              `Participan at index ${i} is invalid or deleted!`,
              `Participan at index ${i} is invalid or deleted!`
            );
          }
        }
      }
      const newCourse = await Course({
        name: body.name,
        section: body.section,
        subject: body.subject,
        room: body.room,
        owner: mongoose.Types.ObjectId(body.owner),
        code: code,
        backgroundImg: body.backgroundImg ? body.backgroundImg : "",
        participants: participants
          ? participants.map((participant) =>
            mongoose.Types.ObjectId(participant)
          )
          : [],
      });

      const saved = await newCourse.save();
      return res.ok(saved);
    } catch (err) {
      console.log("create course failed:", err);
      next(err);
    }
  },
  search: async (req, res, next) => {
    try {
      const { query } = req;
      const offset = Number(query.offset) || 0;
      const limit = Number(query.limit) || 10;
      let matchedOwners = [];
      if (query.owner) {
        matchedOwners = await User.find(
          { name: { $regex: query.owner, $options: "i" }, deleted_flag: false },
          "_id"
        );
      }

      const where = {
        deleted_flag: false,
      };

      if (query.owner) {
        where.owner = { $in: matchedOwners };
      }

      if (query.name) {
        where.name = { $regex: query.name, $options: "i" };
      }

      if (query.section) {
        where.section = { $regex: query.section, $options: "i" };
      }

      if (query.code) {
        where.code = query.code;
      }

      let options = {
        sort: { createdAt: -1 },
        populate: {
          path: "owner participants teachers",
          select: "-password -accessToken -refreshToken",
        },
        lean: true,
        offset: offset,
        limit: limit,
      };
      const courses = await Course.paginate(where, options);
      return res.ok(courses);
    } catch (err) {
      console.log("search courses failed:", err);
      next(err);
    }
  },
  searchRelevant: async (req, res, next) => {
    try {
      const { query } = req;
      const offset = Number(query.offset) || 0;
      const limit = Number(query.limit) || 10;
      let matchedOwners = [];
      if (query.owner) {
        matchedOwners = await User.find(
          { name: { $regex: query.owner, $options: "i" }, deleted_flag: false },
          "_id"
        );
      }

      const where = {
        deleted_flag: false,
        $or: [
          {
            owner: mongoose.Types.ObjectId(req.user.id),
          },
          {
            participants: mongoose.Types.ObjectId(req.user.id),
          },
          {
            teachers: mongoose.Types.ObjectId(req.user.id),
          },
        ],
      };

      if (query.owner) {
        where.owner = { $in: matchedOwners };
      }

      if (query.name) {
        where.name = { $regex: query.name, $options: "i" };
      }

      if (query.section) {
        where.section = { $regex: query.section, $options: "i" };
      }

      if (query.code) {
        where.code = query.code;
      }

      let options = {
        sort: { createdAt: -1 },
        populate: {
          path: "owner participants teachers",
          select: "-password -accessToken -refreshToken",
        },
        select: "-enrolledStudents",
        lean: true,
        offset: offset,
        limit: limit,
      };
      let courses = await Course.paginate(where, options);
      return res.ok(courses);
    } catch (err) {
      console.log("search courses failed:", err);
      next(err);
    }
  },
  participate: async (req, res, next) => {
    try {
      const { codeRoom } = req.params;
      const { id } = req.user;
      console.log("info", codeRoom, id);
      const selectedCourse = await Course.findOne({
        code: codeRoom,
        deleted_flag: false,
      });

      if (!selectedCourse) {
        return res.notFound("Class does not exist", "Class does not exist");
      }

      if (selectedCourse.participants.includes(id)) {
        return res.badRequest(
          "User are already in the class",
          "User are already in the class"
        );
      }

      if (selectedCourse.owner.equals(id)) {
        return res.badRequest("You are owner of this class", "YOU_ARE_OWNER");
      }

      const updated = await Course.findOneAndUpdate(
        { _id: selectedCourse._id, deleted_flag: false },
        {
          $push: {
            participants: id,
          },
        },
        {
          new: true,
        }
      );
      updated.enrolledStudents = undefined;
      return res.ok(updated);
    } catch (err) {
      console.log("participate failed", err);
      next(err);
    }
  },
  createInvitationLink: async (req, res, next) => {
    const { courseCode } = req.params;

    try {
      const course = await Course.findOne({ code: courseCode });

      if (!course) {
        return res.notFound("Class does not exist", "Class does not exist");
      }

      if (course.owner.toString() !== req.user.id) {
        return res.badRequest(
          "You are not the owner of this class",
          "INVALID_OWNER"
        );
      }

      const currentDate = new Date();
      const expiredDate = new Date().setHours(currentDate.getHours() + 12); //Set expired date to 12 hours later

      await Course.findByIdAndUpdate(course._id, {
        invitation_expired_date: expiredDate,
      });

      return res.ok({ expiredDate });
    } catch (error) {
      console.log("Create invitation link failed", error);
      next(error);
    }
  },
  participateByLink: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const code = req.params.courseCode;

      let course = await Course.findOne({ code: code });
      if (!course) {
        return res.notFound("Invitation key invalid", "INVALID_INVITAION_KEY");
      }

      // const isExpired = course.invitation_expired_date < Date.now();
      // if (isExpired) {
      //   return res.forbidden(
      //     "Invitation key is expired",
      //     "EXPIRED_INVITATION_KEY"
      //   );
      // }

      if (course.participants.includes(userId)) {
        return res.badRequest(
          "User are already in the class",
          "User are already in the class"
        );
      }

      if (course.owner.equals(userId)) {
        return res.badRequest("You are owner of this class", "YOU_ARE_OWNER");
      }

      course.participants.push(userId);
      await Course.findByIdAndUpdate(course.id, {
        $push: {
          participants: userId,
        },
      });
      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  detail: async (req, res, next) => {
    try {
      const { code } = req.params;
      const where = {
        code: code,
        deleted_flag: false,
        $or: [
          {
            owner: mongoose.Types.ObjectId(req.user.id),
          },
          {
            participants: mongoose.Types.ObjectId(req.user.id),
          },
          {
            teachers: mongoose.Types.ObjectId(req.user.id),
          },
        ],
      };
      const removedFields = "-password -accessToken -refreshToken";
      let course = await Course.findOne(where)
        .populate("owner", removedFields)
        .populate("teachers", removedFields)
        .populate("participants", removedFields);
      if (!course) {
        return res.badRequest(
          "Require course's existence and you are in this class",
          "Bad request"
        );
      }
      if (
        !course.owner._id.equals(mongoose.Types.ObjectId(req.user.id)) &&
        !course.teachers.find((t) =>
          t._id.equals(mongoose.Types.ObjectId(req.user.id))
        )
      ) {
        const user = await User.findOne(
          {
            _id: mongoose.Types.ObjectId(req.user.id),
            deleted_flag: false,
          },
          "-password -accessToken -refreshToken"
        );
        if (!user || !user.studentId) {
          course.enrolledStudents = [];
        } else {
          const finalizedGradeComponents = course.gradeStructure
            .filter((g) => g.isFinalized)
            .map((g) => g._id.toString());
          const studentId = user.studentId;
          let enrolledStudent = course.enrolledStudents.find(
            (student) => student.studentId === studentId
          );
          if (!enrolledStudent) {
            course.enrolledStudent = [];
          } else {
            let grades = enrolledStudent.grades.filter((grade) =>
              finalizedGradeComponents.includes(
                grade.gradeComponentId.toString()
              )
            );
            enrolledStudent.grades = grades;
            course.enrolledStudents = [enrolledStudent];
          }
        }
      }
      return res.ok(course);
    } catch (err) {
      console.log("search courses failed:", err);
      next(err);
    }
  },
  sendInvitationEmail: async (req, res, next) => {
    const { emails } = req.body;
    const course = req.course;
    const userId = req.user.id;
    const requestHost = req.get("origin");

    if (!course.owner.equals(userId)) {
      return res.forbidden("Forbiden", "NO_PERMISSION_USER");
    }

    try {
      const currentDate = new Date();
      const expiredDate = new Date().setHours(currentDate.getHours() + 12); //Set expired date to 12 hours later

      await Course.findByIdAndUpdate(course._id, {
        invitation_expired_date: expiredDate,
      });

      const transporter = nodemailer.createTransport(config.nodemailerConfig);

      const acceptLink = `${requestHost}/courses/participate/${course.code}`;

      const mailOptions = {
        from: '"HCMUS Course" <course@hcmus.com>', // sender address
        to: emails.join(), // list of receivers
        subject: "Join class invitation ✔", // Subject line
        html: `<p>Click <a href="${acceptLink}">this link</a> to accept join class invitation</p>`, // html body
      };

      await transporter.sendMail(mailOptions);
      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  sendTeachersInvitationEmail: async (req, res, next) => {
    const { emails } = req.body;
    const course = req.course;
    const requestUserId = req.user.id;
    const requestHost = req.get("origin");

    if (!course.owner.equals(requestUserId)) {
      return res.forbidden("Forbiden", "NO_PERMISSION_USER");
    }

    const users = await User.find({ email: { $in: emails } });

    try {
      const transporter = nodemailer.createTransport(config.nodemailerConfig);
      for (let user of users) {
        if (user._id !== requestUserId) {
          const currentDate = new Date();
          const timestamp = new Date().setHours(currentDate.getHours() + 12);
          const key = `${timestamp}!${course.code}`;
          let invitation = new Invitation({
            userId: user._id,
            courseId: course._id,
            key: key,
          });

          invitation = await invitation.save();

          const acceptLink = `${requestHost}/courses/teacher/${key}`;

          const mailOptions = {
            from: '"HCMUS Course" <course@hcmus.com>', // sender address
            to: emails.join(), // list of receivers
            subject: "Join class invitation ✔", // Subject line
            html: `<p>Click <a href="${acceptLink}">this link</a> to accept join class invitation</p>`, // html body
          };

          await transporter.sendMail(mailOptions);
        }
      }
      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  teacherParticipateByLink: async (req, res, next) => {
    const requestUserId = req.user.id;
    const key = req.params.key;
    const extractedKey = key.split("!");
    const timestamp = extractedKey[0];

    // if (new Date(timestamp) < Date.now()) {
    //   return res.forbidden(
    //     "Invitation key is expired",
    //     "EXPIRED_INVITATION_KEY"
    //   );
    // }

    try {
      const invitation = await Invitation.findOne({ key: key });
      if (!invitation) {
        return res.badRequest(
          "Invitation key invalid",
          "INVALID_INVITAION_KEY"
        );
      }

      if (!invitation.userId.equals(requestUserId)) {
        return res.forbidden("Forbiden", "NO_PERMISSION_USER");
      }

      if (invitation.isUsed) {
        return res.badRequest(
          "Invitation key is used",
          "INVALID_INVITAION_KEY"
        );
      }

      const course = await Course.findById(invitation.courseId);
      if (!course) {
        return res.notFound("Class does not exist", "CLASS_NOT_EXISTS");
      }

      if (course.participants.includes(requestUserId)) {
        return res.badRequest(
          "User is already in the class",
          "USER_ALREADY_IN_CLASS"
        );
      }

      if (course.teachers.includes(requestUserId)) {
        return res.badRequest(
          "User is already a teacher in the class",
          "USER_ALREADY_IN_CLASS"
        );
      }

      if (course.owner.equals(requestUserId)) {
        return res.badRequest("You are owner of this class", "YOU_ARE_OWNER");
      }

      await Course.findByIdAndUpdate(course.id, {
        $push: { teachers: requestUserId },
      });
      await Invitation.findByIdAndUpdate(invitation.id, { isUsed: true });

      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  setGradeStructure: async (req, res, next) => {
    const userId = req.user.id;
    const { courseId, gradeStructure } = req.body;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.notFound("Class does not exist", "CLASS_NOT_EXISTS");
      }

      if (!course.owner.equals(userId) && !course.teachers.includes(userId)) {
        return res.forbidden("Forbiden", "NO_PERMISSION_USER");
      }

      let result = [];
      for (const grade of gradeStructure.reverse()) {
        const dbGrade = course.gradeStructure.find(e => e.name == grade.name);
        result.unshift(dbGrade);
      }

      course.gradeStructure = result;

      await course.save();

      return res.ok(course.gradeStructure);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  deleteGrade: async (req, res, next) => {
    const userId = req.user.id;
    const { courseId, gradeId } = req.body;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.notFound("Class does not exist", "CLASS_NOT_EXISTS");
      }

      if (!course.owner.equals(userId) && !course.teachers.includes(userId)) {
        return res.forbidden("Forbiden", "NO_PERMISSION_USER");
      }

      const gradeStructure = course.gradeStructure;
      const index = gradeStructure.findIndex((grade) =>
        grade._id.equals(gradeId)
      );
      if (index === -1) {
        return res.notFound("Grade does not exist", "GRADE_NOT_EXISTS");
      } else {
        gradeStructure.splice(index, 1);
      }

      //Re-map index
      for (i = 0; i < gradeStructure.length; i++) {
        const grade = gradeStructure[i];
        grade.index = i;
      }

      await Course.findByIdAndUpdate(courseId, {
        gradeStructure: gradeStructure,
      });

      return res.ok(gradeStructure);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  insertGrade: async (req, res, next) => {
    const userId = req.user.id;
    const { courseId, name, point } = req.body;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.notFound("Class does not exist", "CLASS_NOT_EXISTS");
      }

      if (!course.owner.equals(userId) && !course.teachers.includes(userId)) {
        return res.forbidden("Forbiden", "NO_PERMISSION_USER");
      }

      const gradeStructure = course.gradeStructure;
      gradeStructure.push({ name, point, index: gradeStructure.length });

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        {
          gradeStructure: gradeStructure,
        },
        { new: true, upsert: true }
      );

      return res.ok(updatedCourse.gradeStructure);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  editGrade: async (req, res, next) => {
    const userId = req.user.id;
    const { courseId, gradeId, name, point } = req.body;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.notFound("Class does not exist", "CLASS_NOT_EXISTS");
      }

      if (!course.owner.equals(userId) && !course.teachers.includes(userId)) {
        return res.forbidden("Forbiden", "NO_PERMISSION_USER");
      }

      const gradeStructure = course.gradeStructure;
      const index = gradeStructure.findIndex((grade) =>
        grade._id.equals(gradeId)
      );
      if (index === -1) {
        return res.notFound("Grade does not exist", "GRADE_NOT_EXISTS");
      }

      gradeStructure[index].name = name;
      gradeStructure[index].point = point;

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        {
          gradeStructure: gradeStructure,
        },
        { new: true, upsert: true }
      );

      return res.ok(updatedCourse.gradeStructure);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
};
