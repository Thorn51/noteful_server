const NotesService = require("../src/notes/notes-services");
const FoldersService = require("../src/folders/folders-service");
const knex = require("knex");
const { makeNotesArray } = require("./notes.fixtures");
const { makeFoldersArray } = require("./folders.fixtures");

describe.skip("Notes service object", () => {
  let db;

  before(() => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
  });

  after("close connection to database", () => db.destroy());

  before("cleanup tables", () =>
    db.raw("TRUNCATE notes, folders RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup after each test", () =>
    db.raw("TRUNCATE notes, folders RESTART IDENTITY CASCADE")
  );

  context("given 'notes' has data", () => {
    const testFolders = makeFoldersArray();
    const testNotes = makeNotesArray();

    beforeEach("add folders and notes to test database", () => {
      return db
        .into("folders")
        .insert(testFolders)
        .then(() => {
          return db.into("notes").insert(testNotes);
        });
    });

    it("getAllNotes() resolves all notes from 'notes' table", () => {
      return NotesService.getAllNotes(db).then(actual => {
        expect(actual).to.eql(testNotes);
      });
    });

    it("getById() resolves a note by id from 'notes' table", () => {
      const noteId = 1;
      const firstNote = testNotes[noteId - 1];
      return NotesService.getById(db, noteId).then(actual => {
        expect(actual).to.eql({
          id: firstNote.id,
          note_name: firstNote.note_name,
          note_text: firstNote.note_text,
          modified: firstNote.modified,
          folderid: firstNote.folderid
        });
      });
    });

    it("deleteNote() removes note by from 'notes' table", () => {
      const noteId = 1;
      return NotesService.deleteNote(db, noteId)
        .then(() => NotesService.getAllNotes(db))
        .then(allNotes => {
          const expectedNotes = testNotes.filter(note => note.id !== noteId);
          expect(allNotes).to.eql(expectedNotes);
        });
    });

    it("updateNote() updates the note from the 'notes' table", () => {
      const noteId = 1;
      const updateNoteFields = {
        note_name: "Test - Updated Note Name",
        note_text: "Test - updated note text",
        modified: new Date(),
        folderid: 1
      };
      return NotesService.updateNote(db, noteId, updateNoteFields)
        .then(() => NotesService.getById(db, noteId))
        .then(note => {
          expect(note).to.eql({
            id: noteId,
            ...updateNoteFields
          });
        });
    });
  });

  context("Given 'notes' has no data", () => {
    it("getAllFolders resolves to an empty array", () => {
      return NotesService.getAllNotes(db).then(actual => {
        expect(actual).to.eql([]);
      });
    });

    it("insertNote() inserts a new note and resolves the new note with an id", () => {
      const newFolder = {
        id: 1,
        folder_name: "Test Folder for Note Post",
        date_created: new Date()
      };
      const newNote = {
        note_name: "Test Post Note",
        note_text: "This is a test to see if the post service is working",
        modified: new Date(),
        folderid: 1
      };
      return FoldersService.insertFolder(db, newFolder)
        .then(() => NotesService.insertNote(db, newNote))
        .then(actual => {
          expect(actual).to.eql({
            id: 1,
            note_name: newNote.note_name,
            note_text: newNote.note_text,
            modified: newNote.modified,
            folderid: newNote.folderid
          });
        });
    });
  });
});
