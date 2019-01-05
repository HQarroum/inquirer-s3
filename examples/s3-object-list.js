const inquirer = require('inquirer');

/**
 * Registering a new `s3-object` prompt.
 */
inquirer.registerPrompt('s3-object', require('..'));

/**
 * Prompting the user to select an S3 object.
 */
inquirer.prompt([{
  type: 's3-object',
  name: 'result',
  message: 'Which S3 object would you like to select?'
}]).then(console.log);