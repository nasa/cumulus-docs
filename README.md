# Cumulus Documentation

**Note:** This Repository is deprecated. The documentation is moved to the main [Cumulus repo](https://github.com/nasa/cumulus/tree/master/docs)

- [HTML Documentation](https://cumulus-nasa.github.io/)
- [Markdown Documentation](docs)

## Local Installation

     $ npm install

## Local Build and Serve

     $ npm run serve

## Add a new page
Add a `.md` file to `docs` folder and then a new item to `docs/SUMMARY.md`.

## Add a new task
The tasks list in docs/tasks.md is generated from the list of task package names in tasks.json. Do not edit the docs/tasks.md file directly. Instead, add the package name to tasks.json.

[Read more about adding a new task.](adding-a-task.md)

## Editing the tasks.md header or template

Look at the `bin/build-tasks-doc.js` and `bin/tasks-header.md` files to edit the output of the tasks build script.

## Deployment
The `develop` branch is automatically built and deployed to master. The `master` branch is served by Github Pages. Do not make edits to the `master` branch.

## Warning

Do NOT merge `master` branch to any other branch. `master` branch is auto generated and does not follow the same git history.
