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

notesRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    NotesService.getAllNotes(knexInstance).then(note => {
      res.json(note);
    });
  })
  .post(jsonParser, (req, res, next) => {
    const { note_name, note_text, folderid } = req.body;
    const newNote = { note_name, note_text, folderid };
    const knexInstance = req.app.get("db");

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    NotesService.insertNote(knexInstance, newNote).then(note => {
      res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${note.id}`))
        .json(serializeNote(note));
    });
  });

notesRouter
  .route(`/:id`)
  .all((req, res, next) => {
    const id = req.params.id;
    const knexInstance = req.app.get("db");

    NotesService.getById(knexInstance, id)
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: "Note doesn't exist" }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    const id = req.params.id;
    const knexInstance = req.app.get("db");

    NotesService.deleteNote(knexInstance, id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { note_name, note_text, folderid } = req.body;
    const updateNoteFields = { note_name, note_text, folderid };
    const id = req.params.id;
    const knexInstance = req.app.get("db");

    const numberValues = Object.values(updateNoteFields).filter(Boolean).length;
    if (numberValues === 0) {
      return res.status(400).json({
        error: {
          message:
            "Request body must contain 'note_name', 'note_text', or 'folderid'"
        }
      });
    }

    NotesService.updateNote(knexInstance, id, updateNoteFields)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;
