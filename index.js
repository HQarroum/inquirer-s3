const _         = require('lodash');
const AWS       = require('aws-sdk');
const chalk     = require('chalk');
const figures   = require('figures');
const cliCursor = require('cli-cursor');
const Base      = require('inquirer/lib/prompts/base');
const observe   = require('inquirer/lib/utils/events');
const Paginator = require('inquirer/lib/utils/paginator');
const Choices   = require('inquirer/lib/objects/choices');
const Separator = require('inquirer/lib/objects/separator');
const s3ls      = require('s3-ls');
const path      = require('path');
const spinner   = require('ora')('Loading ...');

/**
 * The `previous` container identifier.
 */
const BACK = 'Go Back';

/**
 * The name of the `root` directory.
 */
const ROOT = 'Buckets';

/**
 * @return the list of buckets available in the
 * current region.
 */
const getBuckets = () => {
  return new Promise((resolve, reject) => {
    new AWS.S3().listBuckets({}, (err, data) => {
      return (err ? reject(err) : resolve(data.Buckets));
    });
  });
};

/**
 * @return whether the given asset name is an
 * S3 object.
 * @param {*} name the asset name. 
 */
const isObject = function (name) {
  return (_.find(this.results.files, (file) => file === name));
};

/**
 * Function for getting list of folders and files in directory
 * @param {*} request contains `bucket` and `prefix` information.
 */
const browse = (request) => {
  if (!request.bucket) {
    // No bucket is currently specified, browsing available buckets.
    return getBuckets().then((files) => {
      const result = files.map((file) => file.Name).sort();
      return (result.length ? { result } : Promise.reject(`There are no buckets available in the current account.`));
    });
  } else {
    // A bucket is available, so we list the objects in this bucket.
    const lister = s3ls({ bucket: request.bucket });
    return lister.ls(request.prefix ? request.prefix : '/').then((objects) => {
      return ({ result: objects.files.concat(objects.folders), files: objects.files, folders: objects.folders });
    });
  }
};

class Prompt extends Base {

  /**
   * Constructor
   */
  constructor(opts) {
    super(opts);
    Base.apply(this, arguments);
    if (this.opt.objectPrefix && !this.opt.bucket) {
      throw new Error('You cannot specify an `objectPrefix` without a `bucket` parameter.');
    }
    this.basePath = 'root';
    this.currentPath = this.basePath;
    this.selected = 0;
    this.firstRender = true;
    this.bucket = opts.bucket;
    this.depth = this.bucket ? 1 : 0;
    this.prefix = opts.objectPrefix;
    if (this.prefix) {
      this.depth = this.prefix.split('/').length;
    }
    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;
    this.searchTerm = '';
    this.paginator = new Paginator();
  };

  /**
   * Starts the Inquiry session.
   * @param {Function} cb the callback to be called when the
   * prompt operation is completed.
   */
  _run(cb) {
    this.done = cb;
    this.createChoices({ bucket: this.bucket, prefix: this.prefix }).then((choices) => {
      this.results = choices;
      this.opt.choices = new Choices(choices.result, this.answers);
      // Starting readline observation.
      const events = observe(this.rl);
      const keyUps = events.keypress.filter((e) => e.key.name === 'up').share();
      const keyDowns = events.keypress.filter((e) => e.key.name === 'down').share();
      const outcome = this.handleSubmit(events.line);
      outcome.done.forEach(this.onSubmit.bind(this));
      outcome.traversal.forEach(this.handleTraversal.bind(this));
      keyUps.takeUntil(outcome.done).forEach(this.onUpKey.bind(this));
      keyDowns.takeUntil(outcome.done).forEach(this.onDownKey.bind(this));
      events.keypress.takeUntil(outcome.done).forEach(this.hideKeyPress.bind(this));
      // Hiding the cursor while prompting.
      cliCursor.hide();
      // Initial rendering of the questions.
      this.render();
    }).catch((err) => this.onSubmit({ err }));
    return (this);
  }

  /**
   * Renders the prompt to screen
   */
  render() {
    // Retrieving the question.
    let message = this.getQuestion();
    
    // First render displays only.
    if (this.firstRender) {
      message += chalk.dim('(Use arrow keys)');
    }
  
    // Render choices or answer depending on the state
    var relativePath = path.relative(this.basePath, this.currentPath);
    if (this.loading) {
      // We display the loading `spinner`.
      !this.firstRender && spinner.start();
    } else {
      if (!this.firstRender) {
        // Hiding the `spinner`.
        spinner.stop();
      }
      if (this.status === 'answered') {
        message += chalk.cyan(relativePath);
      } else {
        message += chalk.bold('\n Current directory: ') + (this.bucket || ROOT) + '/' + chalk.cyan(this.prefix || '');
        var choicesStr = listRender(this.opt.choices, this.selected );
        message += '\n' + this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
      }
    }
    this.firstRender = false;
    this.screen.render(message);
    // Hiding the cursor.
    cliCursor.hide();
  }

  /**
   * When user press `enter` key
   */
  handleSubmit(e) {
    var obx = e.map(() => this.opt.choices.getChoice(this.selected).value).share();
    var done = obx.filter((stack) => isObject.call(this, stack));
    var traversal = obx.filter((stack) => !isObject.call(this, stack)).takeUntil(done);
    return { traversal, done };
  }
  
  /**
   *  when user selects to drill into a folder (by selecting folder name)
   */
  handleTraversal(value) {
    // The user selected identifier. 
    const input = this.opt.choices.choices[this.selected].value;
    // Adjusting the `depth` to the navigation state.
    this.depth = !input ? this.depth - 1 : this.depth + 1;
    this.depth = this.depth >= 0 ? this.depth : 0;
    
    // Going back, still not at root.
    if (!input && this.depth > 0) {
      this.prefix = path.dirname(this.prefix);
      if (this.prefix === '.') {
        // `dirname` returns a `.` when at root, however,
        // `.` is not a valid prefix.
        this.prefix = null;
      }
    }

    if (input) {
      // The user just selected a bucket.
      if (!this.bucket && this.depth > 0) {
        this.bucket = input;
      } else if (this.bucket && this.depth > 0) {
        this.prefix = input;
      }
    }
    
    // We are at the `root` level.
    if (this.depth === 0) {
      this.bucket = null;
      this.prefix = null;
    }
    // Updating the view.
    this.render();
    // Generating the choices.
    this.createChoices({ bucket: this.bucket, prefix: this.prefix }).then((choices) => {
      this.results = choices;
      this.opt.choices = new Choices(choices.result, this.answers);
      this.selected = 0;
      this.render();
    }).catch((err) => this.onSubmit({ err }));
  }

  /**
   * Called back when an S3 object has been selected.
   * This method will return an object with the detail
   * of the selected S3 object.
   */
  onSubmit(result) {
    if (result.err) {
      // An error occured.
      const err = result.err.message ? result.err : new Error('An unknown error occured');
      this.done({ err });
    } else {
      this.currentPath = path.join(this.basePath, result);
      const prefix = path.relative(this.basePath, this.currentPath);
      this.status = 'answered';
      // Displaying the resulting path on screen.
      this.render();
      // Returning the resulting object.
      this.done({
        bucket: this.bucket,
        prefix: prefix,
        objectUrl: `https://s3.amazonaws.com/${this.bucket}/${prefix}`,
        s3uri: `s3://${this.bucket}/${prefix}`
      });
    }
    // Signaling the end of the query.
    this.screen.done();
    // Restoring the cursor state.
    cliCursor.show();
    // Hiding the `spinner`.
    spinner.stop();
  }

  /**
   * Called when the user presses a key.
   */
  hideKeyPress() {
    this.render();
  }

  /**
   * Called when a key is released.
   */
  onUpKey() {
    var len = this.opt.choices.realLength;
    this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
    this.render();
  }

  /**
   * Called when a key is pressed.
   */
  onDownKey() {
    var len = this.opt.choices.realLength;
    this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
    this.render();
  }

  /**
   * Helper to create new choices based on previous selection.
   */
  createChoices(request) {
    this.loading = true;
    this.render();
    //this.foo = typeof this.foo === 'undefined' ? 1 : ++this.foo;
    //if (this.foo > 0) return (Promise.reject('foo'));
    return (browse(request).then((result) => {
      result.result.push(new Separator());
      if (this.depth > 0) {
        result.result.push(BACK);
        result.result.push(new Separator());
      }
      this.loading = false;
      return (result);
    }));
  }
};

/**
 * Function for rendering list choices.
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
const listRender = function (choices, pointer) {
  let output = '';
  let separatorOffset = 0;

  choices.forEach(function (choice, i) {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += '  ' + choice + '\n';
      return;
    }

    const isSelected = (i - separatorOffset === pointer);
    let line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
    if (isSelected) {
      line = chalk.cyan(line);
    }
    output += line + ' \n';
  });

  return output.replace(/\n$/, '');
};

module.exports = Prompt;