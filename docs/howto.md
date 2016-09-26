# How to

## Deploy Cumulus

In Phase I, various pieces of cumulus are separately deployed to an AWS account managed by Raytheon. In phase II an AWS [CloudFormation template](https://aws.amazon.com/cloudformation/aws-cloudformation-templates/) will be added for the platform that will handle deployment of all components on a single call. The CloudFormation will also streamline creation of Testing, Staging and Production environments for various deployments of Cumulus.

## Test the Platform

Cumulus has multiple components that are responsible for varoius functions. Each component runs separately. Some of the components are deployed to AWS Lambda functions, few others run on AWS Data Pipeline and AWS EC2 Container Service.

You can test each component individually or use the `cumulus-tests` repository to run end-to-end tests. You can also use the Dashboard to monitor cumulus.

### cumulus-tests

First make sure you have proper access to AWS services. You need to obtain `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

Make sure the user account has necessary permission to:

- Invoke a Lambda function
- Starts an ECS task
- Create, list and delete datapipelines
- Add, delete and view objects on AWS S3

Get the `cumulus-tests` repository from Github:

    $ git clone git@github.com:cumulus-nasa/cumulus-tests.git
    $ cd cumulus-tests

Add AWS access key to your running shell session:

    $ export AWS_ACCESS_KEY_ID=myaccessID
    $ export AWS_SECRET_ACCESS_KEY=mysecretkey
    $ export AWS_REGION=us-east-1

Install Node dependencies

    $ npm install

Run the test program

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


#### Test EndToEnd Test

To test `wwlln` run:

    $ ./test.js wwlln -m endtoend

To test `avaps` run:

    $ ./test.js avaps -m endtoend

### Monitor via AWS

While the tests are running, you can go to various services on AWS and view the progress of Cumulus.

- To monitor DataPipeline go to: https://console.aws.amazon.com/datapipeline/home?region=us-east-1#

- To monitor how files are added to S3 buckets go to:

  - Raw files: https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=cumulus-ghrc-raw&prefix=
  - Processed files: https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=cumulus-ghrc-archive&prefix=

- To look at the tables go to: https://console.aws.amazon.com/dynamodb/home?region=us-east-1

- To monitor lambda functions go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logs:prefix=/aws/lambda/cumulus

