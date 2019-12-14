const express = require("express");
const path = require("path");
const xss = require("xss");
const NotesService = require("./notes-services");

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  note_name: xss(note.note_name),
  note_text: xss(note.note_text),
  modified: note.modified,
  folderid: note.folderid
});

notesRouter.route("/").get((req, res, next) => {
  const knexInstance = req.app.get("db");
  NotesService.getAllNotes(knexInstance).then(note => {
    res.json(note);
  });
});

module.exports = notesRouter;
