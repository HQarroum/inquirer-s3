const inquirer = require('inquirer');

/**
 * Registering a new `s3-object` prompt.
 */
inquirer.registerPrompt('s3-object', require('..'));

/**
 * Prompting the user to select an S3 "folder" prefix.
 */
inquirer.prompt([{
  name: "result",
  bucket: "my.bucket.name",
  message: "Choose a folder",
  enableFolderSelect: true,
  enableFileObjectSelect: false,
  enableOtherBuckets: true
}]).then(console.log);
