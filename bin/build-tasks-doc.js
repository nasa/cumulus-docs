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

function catchError (err) {
  console.log(err);
  process.exit(1);
}

function getTaskPkg (taskName) {
  // npm registry is weird. it wants slashes to be uri encoded but not @ symbols
  const url = npmUrl + taskName.split('/').join('%2F');
  return got(url, { json: true }).then((res) => res.body);
}

function createTaskResourceLinks (packageName, sourceUrl, homepage) {
  let resources = `[npm](https://npmjs.com/packages/${packageName}) `
  resources += `${sourceUrl ? `| [source](${sourceUrl})` : ''} `
  resources += `${homepage ? `| [web](${homepage})` : ''}`

  return resources;
}

function createTaskMarkdown (pkg) {
  const name = pkg.name;
  const homepage = pkg.homepage;
  const sourceUrl = pkg.repository && pkg.repository.url;

  return dedent`
    ### [${name}](${homepage})
    ${pkg.description}

    - Schemas: See this module's [schema definitions](${sourceUrl + 'schemas'}).
    - Resources: ${createTaskResourceLinks(name, sourceUrl, homepage)}

    ---
  `;
}

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
