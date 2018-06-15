# Cumulus

## Project Description

This Cumulus project seeks to address the existing need for a “native” cloud-based data ingest, archive, distribution, and management system that can be used for all future Earth Observing System Data and Information System (EOSDIS) data streams via the development and implementation of Cumulus. The term “native” implies that the system will leverage all components of a cloud infrastructure provided by the vendor for efficiency (in terms of both processing time and cost). Additionally, Cumulus will operate on future data streams involving satellite missions, aircraft missions, and field campaigns. 

This documentation includes both guidelines, examples and source code docs.

The documentation is accessible at https://cumulus-nasa.github.io/

## Contributing

Please refer to: https://github.com/cumulus-nasa/cumulus/blob/master/CONTRIBUTING.md for information

## Content

* [Architecture](architecture.md)
* [Cumulus Deployment](deployment/README.md)
  * [Creating an S3 Bucket](deployment/create_bucket.md)
  * [Locating IAMs](deployment/iam_roles.md)
  * [Troubleshooting Deployment](deployment/troubleshoot_deployment.md)
* [Cumulus Workflows](workflows/README.md)
  * [Protocol](protocol.md)
  * [Input & Ouptut](input_output.md)
  * [Cumulus Task Message Flow](cumulus-task-message-flow.md)
  * [Developing Workflow Tasks](developing-workflow-tasks.md)
    * [Lambda Functions](lambda.md)
    * [Dockerization](docker.md)
  * [Workflow Configuration How-to's](workflow-configuration-how-to.md)
* [Tasks](tasks.md)
* [Cumulus API](https://cumulus-nasa.github.io/cumulus-api)
* [EMS Reporting](ems_reporting.md)
* [Local Docs](doc_installation.md)
  * [Adding a task](adding-a-task.md)
* [Team](team.md)