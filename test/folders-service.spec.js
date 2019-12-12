const FoldersService = require("../src/folders/folders-service");
const knex = require("knex");
const { makeFoldersArray } = require("./folders.fixtures");

describe("Folders service object", () => {
  let db;

  before(() => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
  });

  after("close connection to database", () => db.destroy());

  before("cleanup table", () =>
    db.raw("TRUNCATE folders RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE folders RESTART IDENTITY CASCADE")
  );

  context("given 'folders' has data", () => {
    const testFolders = makeFoldersArray();

    beforeEach("add test folders data", () => {
      return db.into("folders").insert(testFolders);
    });

    it("getAllFolders() resolves all folders from 'folders' table", () => {
      return FoldersService.getAllFolders(db).then(actual => {
        expect(actual).to.eql(testFolders);
      });
    });

    it("getByID() resolves a folder by id from the 'folders' table", () => {
      const folderId = 2;
      const secondTestFolder = testFolders[folderId - 1];
      return FoldersService.getById(db, folderId).then(actual => {
        expect(actual).to.eql({
          id: folderId,
          folder_name: secondTestFolder.folder_name,
          date_created: secondTestFolder.date_created
        });
      });
    });

    it("deleteFolder() removes a folder by id from 'folders' table", () => {
      const folderId = 1;
      return FoldersService.deleteFolder(db, folderId)
        .then(() => FoldersService.getAllFolders(db))
        .then(allFolders => {
          const expectedFolders = testFolders.filter(
            folder => folder.id !== folderId
          );
          expect(allFolders).to.eql(expectedFolders);
        });
    });

    it("updateFolder() updates the folder from the 'folders' table", () => {
      const folderId = 3;
      const updateFolderFields = {
        folder_name: "Update Folder Name",
        date_created: new Date()
      };
      return FoldersService.updateFolder(db, folderId, updateFolderFields)
        .then(() => FoldersService.getById(db, folderId))
        .then(folder => {
          expect(folder).to.eql({
            id: folderId,
            ...updateFolderFields
          });
        });
    });
  });

  context("Given 'folders' has no data", () => {
    it("getAllFolders() resolves to an empty array", () => {
      return FoldersService.getAllFolders(db).then(actual => {
        expect(actual).to.eql([]);
      });
    });

    it("insertFolder() inserts a new folder and resolves the new folder with an id", () => {
      const newFolder = {
        folder_name: "Test Post Folder",
        date_created: new Date()
      };

      return FoldersService.insertFolder(db, newFolder).then(actual => {
        expect(actual).to.eql({
          id: 1,
          folder_name: newFolder.folder_name,
          date_created: newFolder.date_created
        });
      });
    });
  });
});
