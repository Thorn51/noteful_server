function makeFoldersArray() {
  return [
    {
      id: 1,
      folder_name: "Test Folder 1",
      date_created: new Date()
    },
    {
      id: 2,
      folder_name: "Test Folder 2",
      date_created: new Date()
    },
    {
      id: 3,
      folder_name: "Test folder 3",
      date_created: new Date()
    }
  ];
}

module.exports = { makeFoldersArray };
