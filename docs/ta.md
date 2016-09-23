# Technical Approach

*[Last Updated: July, 2016] This document requires further updates*

Our proposed approach is designed to build a Cumulus prototype platform that can be used to prove concept viability; provide a testbed to see potential implementation issues early on; and serve as a base to build on in future phases.

The major components of the Cumulus prototype system are:

| Component                  | Language     | AWS Services        | Maintainer |
|----------------------------|--------------|---------------------|------------|
| Data Acquisition           | Python       | AWS EC2 Container   | Devseed    |
| Pipeline Process           | JSON         | AWS Data Pipeline   | Devseed    |
| Dashboard          | HTML + JS  | S3          | Devseed    |
| Dockerized Code      | Docker<br />Python | AWS EC2 Container | Devseed |
| Workflow Engine      | NodeJs       | Lambda,<br />API Gateway,<br />DyanmoDB| Devseed  |
| Data Distribution      | NodeJs   | Lambda,<br />API Gateway,<br />DyanmoDB| Devseed  |

This diagram shows how the components work with each other as a platform:

![Technical Approach Diagram](images/technical_approach_diagram.png)
*The Diagram is not up-to-date*


## Data Ingest and Processing

In Phase I, The HS3 data is acquired from public FTP servers using a pull mechanism written in Python and deployed via Docker to AWS EC2 Container Service.

### Data Acquisition

A data acquisition app polls original data sources for new data. When a new data file is found, it is uploaded to a staging S3 bucket. The S3 upload triggers an event that launches a new instance of AWS Data Pipeline. The acquisition app in phase one only monitors HS3 data streams. In future phases, there will be more instances of acquisition app designed for other data sources.

### AWS Data Pipeline

Data Pipeline is an AWS service to help move data between different sources and handle processing along the way. An individual image capture (or granule) may invoke a series of processes; each will be run on ECS via individual tasks. The Data Pipeline service will organize the sequencing of tasks for a granule. Data Pipeline will provide all functionality around off nominal conditions (e.g., failed copies, failed processing).

For this prototype, we build the data pipeline with separate docker containers responsible for various tasks such as image preprocessing, metadata generation, data archiving, etc. The script for each step can either run in an AWS ECS (docker) container or an AWS Lambda function.

The data pipeline is configured with a JSON configuration document which allows adding new steps to the pipeline process or removing existing steps.  This will give us a high level of flexibility to add new processes and components in the future.

In addition, the data pipeline enables to run separate processes for each image and run in parallel. We can scale the processes linearly and cap the processing power if needed.
The metadata generation portion of data pipeline will be responsible for tasks such as uploading the generated data to external services such as CMR and GIBS.

We will also develop a special docker template that will include various monitoring and service tools. This template will be used to build the specific components of the pipeline with the scripts provided by DAAC for preprocessing and metadata generation.

### Data Distribution

The Cumulus prototype will handle distribution through a combination of AWS CloudFront, S3, Lambda and API Gateway. Files to be distributed will be stored on S3  and will be accessed through CloudFront. CloudFront will allow for the global caching of data, for defined periods of times, which will greatly reduce data access times.

The Cumulus prototype will be capable of providing anonymous access to the data, and will also be designed to test assumptions around authenticated access to the data. The Cumulus prototype will use API Gateway and Lambda functions to run a serverless interface to the data that is capable of handling  authentication and provide expiring links to the underlying data.

## System Management

The Cumulus prototype will include a Workflow Management Engine that will be responsible for passively monitoring the running services, collecting various logs and other system measurements, building and editing the JSON configuration files for the AWS Data Pipeline and powering the management dashboard via an API. The engine will be developed using a combination of Lambda, API Gateway and access to a DynamoDB or RDS database.

The engine’s API  will provide a constantly updated view of the running system operations, system health and an overview of created data pipelines. The WorkFlow Engine will use technologies such as ElasticSearch to improve and speed up the process of log collection and processing. The WorkFlow Engine design will ensure that the engine remains mostly as a passive system that only monitor running tasks in the background, mainly to avoid becoming a "jack-of-all-trades" power house.

In the initial demonstration phase, we will also build a visual dashboard that is powered by the Workflow Management Engine. It will be read-only and will be providing information about the system and operations, but  will not allow for individual pipeline customization by operators.

The system will rely on AWS CloudWatch to capture in-depth logs from various components of the pipeline, which can be used for further monitoring and development.
