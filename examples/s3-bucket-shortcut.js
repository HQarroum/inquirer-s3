const inquirer = require('inquirer');

/**
 * Registering a new `s3-object` prompt.
 */
inquirer.registerPrompt('s3-object', require('..'));

/**
 * Prompts the user to select an S3 object.
 */
const promptObject = (answer) => inquirer.prompt([{
  type: 's3-object',
  name: 'result',
  message: `Which S3 object would you like to select in the ${answer.bucket} bucket?`,
  bucket: answer.bucket
}]).then(console.log);

/**
 * Prompts the user for an S3 bucket to use.
 */
inquirer.prompt([{
  type: 'input',
  name: 'bucket',
  message: 'Enter the name of an S3 bucket to browse'
}]).then(promptObject);