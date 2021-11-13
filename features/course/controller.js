const { Course, User } = require("models");
const { generateRoomCode } = require("lib/regex-helpers");
const { generateRandomString } = require("lib/string-helpers");
const mongoose = require("mongoose");
const e = require("express");

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
          path: "owner participants",
          select: "-password",
        },
        lean: true,
        offset: offset,
        limit: limit,
      };
      const courses = await Course.paginate(where, options);
      res.ok(courses);
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
          path: "owner participants",
          select: "-password",
        },
        lean: true,
        offset: offset,
        limit: limit,
      };
      const courses = await Course.paginate(where, options);
      res.ok(courses);
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

      const updated = await Course.updateOne(
        { _id: selectedCourse._id, deleted_flag: false },
        {
          $push: {
            participants: id,
          },
        }
      );
      res.ok(selectedCourse);
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

      await Course.findByIdAndUpdate(course._id, { invitation_expired_date: expiredDate });

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
      const role = req.query.role;

      let course = await Course.findOne({ code: code });
      if (!course) {
        return res.notFound("Invitation key invalid", "INVALID_INVITAION_KEY");
      }

      const isExpired = course.invitation_expired_date < Date.now();
      if (isExpired) {
        return res.forbidden("Invitation key is expired", "EXPIRED_INVITATION_KEY");
      }

      if (role === 'teacher' && course.teachers.includes(userId)) {
        return res.badRequest(
          "Teacher are already in the class",
          "Teacher are already in the class"
        );
      }

      if (course.participants.includes(userId)) {
        return res.badRequest(
          "User are already in the class",
          "User are already in the class"
        );
      }

      if (role === 'teacher') {
        await Course.findByIdAndUpdate(course.id, {
          $push: {
            teachers: userId,
          },
        });
      } else {
        await Course.findByIdAndUpdate(course.id, {
          $push: {
            participants: userId,
          },
        });
      }

      res.ok(true);
    } catch (err) {
      console.log(err);
    }
  }
};
