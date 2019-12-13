const express = require("express");
const xss = require("xss");
const FoldersService = require("./folders-service");

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
  id: folder.id,
  folder_name: xss(folder.folder_name),
  date_created: folder.date_created
});

foldersRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    FoldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name };
    const knexInstance = req.app.get("db");

    if (!folder_name) {
      return res.status(400).json({
        error: { message: "Missing folder name in request body" }
      });
    }

    FoldersService.insertFolder(knexInstance, newFolder)
      .then(folder => {
        res
          .status(201)
          .location(`/api/folders/${folder.id}`)
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route("/:id")
  .all((req, res, next) => {
    const knexInstance = req.app.get("db");
    const { id } = req.params;
    FoldersService.getById(knexInstance, id)
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: "Folder doesn't exist" }
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    const knexInstance = req.app.get("db");
    const { id } = req.params;
    FoldersService.deleteFolder(knexInstance, id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;
