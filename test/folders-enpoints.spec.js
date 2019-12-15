const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray } = require("./folders.fixtures");

describe("Folders Endpoints", () => {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean data from folder and notes table", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  afterEach("remove data from tables", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  describe("GET /api/folders", () => {
    context("Given no data in folders table", () => {
      it("responds with status 200 and an empty array", () => {
        return supertest(app)
          .get("/api/folders")
          .expect(200, []);
      });
    });

    context("Given there is data in the folders table", () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert test folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("GET /api/folders returns status 200 and all of the folders", () => {
        return supertest(app)
          .get("/api/folders")
          .expect(200, testFolders);
      });
    });
  });

  describe("GET /api/folders/:id", () => {
    context("Given no data in the folders table", () => {
      it("responds with status 404", () => {
        const folderId = 123123;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: "Folder doesn't exist" } });
      });
    });

    context("Given there is data in the folders table", () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert test folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with status 200 and the folder specified by the id", () => {
        const folderId = 1;
        const expectedFolder = testFolders[folderId - 1];
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder);
      });
    });
  });

  describe("POST /api/folders", () => {
    it("it returns status 201 and a new folder", () => {
      const newFolder = {
        folder_name: "Test POST Folder"
      };
      return supertest(app)
        .post("/api/folders")
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name);
          expect(res.body).to.have.property("id");
          expect(res.body).to.have.property("date_created");
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    it("responds with status 400 and an error message when folder_name is missing", () => {
      return supertest(app)
        .post(`/api/folders`)
        .send({})
        .expect(400, {
          error: { message: "Missing folder name in request body" }
        });
    });
  });

  describe("DELETE /api/folders/:id", () => {
    context("Given no data in folders table", () => {
      it("responds with status 404", () => {
        const missingId = 123123;
        return supertest(app)
          .delete(`/api/folders/${missingId}`)
          .expect(404, { error: { message: "Folder doesn't exist" } });
      });
    });
    context("Given there is data in the folders table", () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert dat into folders table", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with status 204 and removes the article specified by id", () => {
        const folderIdToRemove = 2;
        const expectedFolders = testFolders.filter(
          folder => folder.id !== folderIdToRemove
        );
        return supertest(app)
          .delete(`/api/folders/${folderIdToRemove}`)
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedFolders);
          });
      });
    });
  });

  describe("PATCH /api/folders/:id", () => {
    context("given no data in the folders table", () => {
      it("responds with status 404", () => {
        const folderId = 1;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: "Folder doesn't exist" } });
      });
    });

    context("Given there is data in the folders table", () => {
      const testFolders = makeFoldersArray();

      beforeEach("Insert test folder into folders table", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with status 204 and updates the folder", () => {
        const folderIdToUpdate = 1;
        const updateFolder = {
          folder_name: "Patch Folder Test"
        };
        const expectedFolder = {
          ...testFolders[folderIdToUpdate - 1],
          ...updateFolder
        };
        return supertest(app)
          .patch(`/api/folders/${folderIdToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/api/folders/${folderIdToUpdate}`)
              .expect(expectedFolder);
          });
      });

      it("responds with status 400 when required fields are missing in the request body", () => {
        const folderIdToUpdate = 1;
        return supertest(app)
          .patch(`/api/folders/${folderIdToUpdate}`)
          .send({ keyNotInFolders: "Irrelevant Value" })
          .expect(400, {
            error: { message: "Request body must contain 'folder_name'" }
          });
      });
    });
  });
});
