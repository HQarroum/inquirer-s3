<br /><br />
<p align="center">
  <img width="700" src="docs/inquirer-screenshot.png" />
</p>

# inquirer-s3
> An S3 object selector for inquirer.

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](contributing.md)
[![CodeFactor](https://www.codefactor.io/repository/github/hqarroum/inquirer-s3/badge)](https://www.codefactor.io/repository/github/hqarroum/inquirer-s3)

Current version: **1.0.0**

Lead Maintainer: [Halim Qarroum](mailto:hqm.post@gmail.com)

## Install

To add the `inquirer-s3` prompt to your application dependencies, run the following command :

```bash
npm install --save inquirer-s3
```

## Description

The `inquirer-s3` prompt allows you to use [inquirer](https://github.com/SBoudrias/Inquirer.js) to select an S3 object located on an AWS account. This prompt allows you to list buckets, objects within selected buckets and navigate across your buckets.

## Usage

### Register the prompt

In order to use `inquirer-s3`, you first need to register it with inquirer under a key name as follow.

```js
const inquirer = require('inquirer');
// Registers `inquirer-s3` under the key 's3-object'.
inquirer.registerPrompt('s3-object', require('inquirer-s3'));
```

### Listing buckets and objects

By default, the `inquirer-s3` prompt will list the S3 content of a given AWS account in a file-system like fashion, starting by listing available buckets in a given region, and allowing the promnpted user to navigate its buckets and objects. To start a prompt, you can use with `inquirer` the key that you used to register the `inquirer-s3` module.

```js
inquirer.prompt([{
  type: 's3-object',
  name: 'result',
  message: 'Which S3 object would you like to select?'
}]).then(console.log);
```

### Parameters

A set of optional parameters can be passed to `inquirer-s3`. Below is a description of all the optional parameters along with their role.

 - **bucket** - A bucket to pre-select. When specifying the `bucket` parameter with the name of a valid S3 account owned by your AWS account, the `inquirer-s3` module will start to browse at the root of this bucket.
 - **prefix** - An S3 object prefix indicating where you'd like to start the browsing inside a bucket.
 
 > Note that it is invalid to pass a `prefix` without passing a valid `bucket` and an error will be thrown in this case.

## Handling errors

When an error occurs, the promise returned by `inquirer` is still resolved but will contain an `err` property.

## Examples

Runnable examples are available in the [examples](examples/) directory.

## See also

 - The [inquirer](https://github.com/SBoudrias/Inquirer.js) interactive prompt framework.
 - The [s3-ls](https://github.com/koresar/s3-ls) object browser library.
