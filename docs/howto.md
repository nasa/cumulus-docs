# How to

## Deploy Cumulus

In Phase I, various pieces of cumulus are separately deployed to an AWS account managed by Raytheon. In phase II an AWS [CloudFormation template](https://aws.amazon.com/cloudformation/aws-cloudformation-templates/) will be added for the platform that will handle deployment of most components with a single simple script. The CloudFormation will also streamline creation of Testing, Staging and Production environments for various deployments of Cumulus.

## Test the Platform

Cumulus has multiple components that are responsible for varoius functions. Each component runs separately. Many of the components are deployed as AWS Lambda functions, a few others run on AWS Data Pipeline, AWS EC2 Container Service, and AWS API Gateway.

You can test each component individually or use the `cumulus-tests` repository to run end-to-end tests. You can also use the Dashboard to monitor Cumulus.

### cumulus-tests

First make sure you have proper access to AWS services.

Make sure the AWS IAM User you are using has is permitted to:

- Invoke a Lambda function
- Start an ECS task
- Create, list and, delete Data Pipelines
- Add, delete, and view objects on AWS S3

Get the `cumulus-tests` repository from Github:

    $ git clone git@github.com:cumulus-nasa/cumulus-tests.git
    $ cd cumulus-tests

Add your AWS IAM User's credentials and region as environment variables to your shell session:

    $ export AWS_ACCESS_KEY_ID=myaccessID
    $ export AWS_SECRET_ACCESS_KEY=mysecretkey
    $ export AWS_REGION=us-east-1

Install Node dependencies:

    $ npm install

Run the test program:

    $ ./test.js -h


#### Test Acquisition App

To test `wwlln` run:

    $ ./test.js wwlln -m download

To test `avaps` run:

    $ ./test.js avaps -m download

#### Test Trigger Mechanism

To test `wwlln` run:

    $ ./test.js wwlln -m trigger

To test `avaps` run:

    $ ./test.js avaps -m triger

#### Test Distribution App

To test `wwlln` run:

    $ ./test.js wwlln -m distribution

To test `avaps` run:

    $ ./test.js avaps -m distribution


#### Perform End-To-End test

To test `wwlln` run:

    $ ./test.js wwlln -m endtoend

To test `avaps` run:

    $ ./test.js avaps -m endtoend


### Monitor the tests via the AWS Console

While the tests are running, you can go to various services on AWS and view the progress of Cumulus.

- To monitor DataPipeline go to: https://console.aws.amazon.com/datapipeline/home?region=us-east-1#

- To monitor the files being added to S3 buckets go to:

  - Raw files: https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=cumulus-ghrc-raw&prefix=
  - Processed files: https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=cumulus-ghrc-archive&prefix=

- To view the DynamoDB tables of pipeline, collection, and granule information, go to: https://console.aws.amazon.com/dynamodb/home?region=us-east-1

- To monitor Lambda functions go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logs:prefix=/aws/lambda/cumulus

