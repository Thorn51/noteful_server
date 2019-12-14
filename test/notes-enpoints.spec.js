const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray } = require("./folders.fixtures");
const { makeNotesArray } = require("./notes.fixtures");

describe.only("Notes Endpoints", () => {
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

  describe("GET /api/folder", () => {
    context("Given no data in notes table", () => {
      it("responds with status 200 and an empty array", () => {
        return supertest(app)
          .get("/api/notes")
          .expect(200, []);
      });
    });
  });
});
