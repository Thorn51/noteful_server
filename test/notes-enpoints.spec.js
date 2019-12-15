const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray } = require("./folders.fixtures");
const { makeNotesArray } = require("./notes.fixtures");

describe("Notes Endpoints", () => {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean data from folders and notes table", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  afterEach("remove data from tables", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  describe("GET /api/notes", () => {
    context("Given no data in notes table", () => {
      it("responds with status 200 and an empty array", () => {
        return supertest(app)
          .get("/api/notes")
          .expect(200, []);
      });
    });

    context("Given there is data in notes and folders table", () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert folders and notes into databaSse", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("GET /api/notes returns status 200 and all of the notes", () => {
        return supertest(app)
          .get("/api/notes")
          .expect(200, testNotes);
      });
    });
  });

  describe("GET /api/notes/:id", () => {
    context("Given no data in notes table", () => {
      it("responds with status 404", () => {
        const noteId = 123123;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: "Note doesn't exist" } });
      });
    });

    context("Given data in folders and notes tables", () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert data into tables", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("responds with status 200 and the note specified by the id", () => {
        const noteId = 1;
        const expectedNote = testNotes[noteId - 1];
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote);
      });
    });
  });

  describe("POST /api/notes", () => {
    const testFolders = makeFoldersArray();

    beforeEach("insert folders", () => {
      return db.into("folders").insert(testFolders);
    });

    it("returns status 201 and a new note", () => {
      const newNote = {
        note_name: "Test Post Note",
        note_text: "Test posting a new note.",
        folderid: 2
      };
      return supertest(app)
        .post(`/api/notes`)
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.note_name).to.eql(newNote.note_name);
          expect(res.body.note_text).to.eql(newNote.note_text);
          expect(res.body.folderid).to.eql(newNote.folderid);
          expect(res.body).to.have.property("id");
          expect(res.body).to.have.property("modified");
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
        })
        .then(postRes => {
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body);
        });
    });

    const requiredFields = ["note_name", "note_text", "folderid"];

    requiredFields.forEach(field => {
      const newArticle = {
        note_name: "Test Post Name",
        note_text: "Test post text for required fields",
        folderid: 1
      };
      it(`responds with status 400 and an error message when the ${field} is missing from the request body`, () => {
        delete newArticle[field];

        return supertest(app)
          .post("/api/notes")
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });
  });

  describe("DELETE /api/notes/:id", () => {
    context("Given no data in notes table", () => {
      it("responds with status 404", () => {
        const missingId = 123123;
        return supertest(app)
          .delete(`/api/notes/${missingId}`)
          .expect(404, { error: { message: "Note doesn't exist" } });
      });
    });

    context("Given there is data in the folders and notes tables", () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert test data", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("responds with status 204 and removes the note specified by id", () => {
        const noteIdToRemove = 1;
        const expectedNotes = testNotes.filter(
          note => note.id !== noteIdToRemove
        );

        return supertest(app)
          .delete(`/api/notes/${noteIdToRemove}`)
          .expect(204)
          .then(res => {
            supertest(app)
              .get("api/notes")
              .expect(expectedNotes);
          });
      });
    });
  });

  describe.only("PATCH /api/notes/:id", () => {
    context("given no data in the notes table", () => {
      it("responds with status 404", () => {
        const folderid = 1;
        return supertest(app)
          .patch(`/api/notes/${folderid}`)
          .expect(404, { error: { message: "Note doesn't exist" } });
      });
    });

    context("give there is data", () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert data", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });
      it("responds with status 204 and updates the note", () => {
        const noteId = 1;
        const updateNote = {
          note_name: "Patch Note Name",
          note_text: "Update the note text using PATCH",
          folderid: 1
        };
        const expectedNote = {
          ...testFolders[noteId - 1],
          ...updateNote
        };
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .send(updateNote)
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/api/notes/${noteId}`)
              .expect(expectedNote);
          });
      });

      it("responds with status 400 when required fields are missing in the request body", () => {
        const noteIdToUpdate = 1;
        return supertest(app)
          .patch(`/api/notes/${noteIdToUpdate}`)
          .send({ keyNotInNotes: "Whatever Value" })
          .expect(400, {
            error: {
              message:
                "Request body must contain 'note_name', 'note_text', or 'folderid'"
            }
          });
      });
    });
  });
});
