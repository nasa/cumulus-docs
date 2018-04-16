#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const got = require('got');
const dedent = require('dedent');

const npmUrl = 'https://registry.npmjs.com/'
const taskList = require('../tasks.json');
const tasksHeaderPath = path.join(__dirname, 'tasks-header.md');
const tasksHeader = fs.readFileSync(tasksHeaderPath, 'utf8');
const tasksOutputFilePath = path.join(__dirname, '..', 'docs', 'tasks.md');

/**
 * Handle error by logging and exiting process with error code
 * 
 * @param {Object} err - error
 * @returns {undefined} - none
 */
function catchError (err) {
  console.log(err);
  process.exit(1);
}

/**
 * Get the task package data from npm 
 * 
 * @param {string} taskName - task name i.e. @cumulus/discover-granules
 * @returns {Object} task data from npm
 */
function getTaskPkg (taskName) {
  // npm registry is weird. it wants slashes to be uri encoded but not @ symbols
  const url = npmUrl + taskName.split('/').join('%2F');
  return got(url, { json: true }).then((res) => res.body);
}

/**
 * Create the links for task resources
 * 
 * @param {string} packageName - package name i.e. @cumulus/discover-granules
 * @param {string} sourceUrl - url to Cumulus repo
 * @param {string} homepage - url to task code
 * @returns {string} String with links to npm, source, web
 */
function createTaskResourceLinks (packageName, sourceUrl, homepage) {
  let resources = `[npm](https://npmjs.com/package/${packageName}) `
  resources += `${sourceUrl ? `| [source](${sourceUrl})` : ''} `
  resources += `${homepage ? `| [web](${homepage})` : ''}`

  return resources;
}

/**
 * Create the markdown documentation for the task using package
 * data from npm
 * 
 * @param {Object} pkg - package data from npm
 * @returns {string} markdown documentation
 */
function createTaskMarkdown (pkg) {
  const name = pkg.name;
  const homepage = pkg.homepage;
  const description = pkg.description;
  let sourceUrl = pkg.repository && pkg.repository.url;
  const match = sourceUrl.match(/git\+(.*?)\.git?/);
  if (match) {
    sourceUrl = match[1]
  }

  return dedent`
    ### [${name}](${homepage})
    ${description}

    - Schemas: See this module's [schema definitions](${homepage + '/schemas'}).
    - Resources: ${createTaskResourceLinks(name, sourceUrl, homepage)}

    ---
  `;
}

/**
 * Create markdown task documentation for list of tasks
 * 
 * @param {Array<string>} tasks - list of task package data from npm
 * @returns {undefined} - none
 */
function createTasksDoc (tasks) {
  const tasksMarkdown = tasks.map(createTaskMarkdown).join('\n\n');
  const markdown = tasksHeader + tasksMarkdown;

  fs.writeFile(tasksOutputFilePath, markdown, function (err) {
    if (err) catchError(err);
  });
}

const taskDataRequests = taskList.sort().map(getTaskPkg);

Promise.all(taskDataRequests)
  .then(createTasksDoc)
  .catch(catchError);
