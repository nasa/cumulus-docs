# Cumulus Architecture

## Cloudformation Stacks

* **Deployer:** Sets up an IAM role that mimics NGAP so we can test during local development to see what fails and what doesn't.
* **IAM:** Sets up IAM roles for AWS services deployed by the Cumulus stack to be assigned the required policies.
* **Cumulus:** Everything else.
    * Lambdas and ECS required for workflows
    * Step functions for workflows
    * Elasticsearch for search on workflow executions and logs
    * DynamoDB for storing (earthdata) users, rules, collections and providers.

#### Questions

* What uses the DynamoDB store? It looks like the API endpoint for 'collections' uses elasticsearch.

## Cumulus Dashboard

Uses S3 static website hosting using [cumulus-dashboard repo](https://github.com/cumulus-nasa/cumulus-dashboard)

## API Lambda Tasks

Defined in [packages/deployment/app/api.yml](https://github.com/cumulus-nasa/cumulus/blob/master/packages/deployment/app/api.yml)

### sqs2sf

* **What does sqs2sf require?** A queueUrl. Optionally a messageLimit and a timeLimit.
* **What does sqs2sf do?** Starts a consumer for queueUrl. When the consumer receives a message from the queue, the message payload is expected to contain data used to start the execution of a step function.
* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/lambdas/sf-starter.js)

### sns2elasticsearch

* **What does sns2elasticsearch require?** Cumulus Payloads resulting from step function executions. [TODO: Add example and detail about what this means.]
* **What does sns2elasticsearch do?** Inserts step execution metadata into elasticsearch, including name, arn, execution, error, etc.
* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/es/indexer.js#L378-L395)

### log2elasticsearch

* **What does log2elasticsearch require?** [ADD ME]
* **What does log2elasticsearch do?** Inserts AWS logs into elasticsearch.
* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/es/indexer.js#L360-L376)

### sf2snsStart

* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/lambdas/sf-sns-broadcast.js)

### sf2snsEnd

* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/lambdas/sf-sns-broadcast.js)

### ScheduleSF

* **What does it require?** The message itself should have a resources object, with a nested queues object, with a nested "startSF" key which should point to an SQS queue.
* **What does it do?** Sends event message to SQS queue detailed in message body.
* [lambda function code](https://github.com/cumulus-nasa/cumulus/blob/master/daac-ops-api/lambdas/sf-scheduler.js)

