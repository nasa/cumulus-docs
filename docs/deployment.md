
# How to Deploy Cumulus

## Overview

This is a guide for deploying a new instance of Cumulus.

The process involves:

*  Creating [AWS S3 Buckets](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html).
*  Using [Kes](http://devseed.com/kes/) to transform kes templates (`cloudformation.template.yml`) into [AWS CloudFormation](https://aws.amazon.com/cloudformation/getting-started/) stack templates (`cloudformation.yml`) that are then deployed to AWS.
*  Before deploying the Cumulus software, CloudFormation stacks are deployed that create necessary [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) via the `deployer` and `iams` stacks.
*  The Cumulus software is configured and deployed via the `app` stack.

----
## Deploy Cumulus

#### Linux/MacOS software requirements:
- zip
- sha1sum or md5sha1sum
- [node >= 6.9.5, < 8](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm)
- [yarn](https://yarnpkg.com/lang/en/docs/install/)

Optionally, if you want to use the command line:

- AWS CLI - [AWS command line interface](https://aws.amazon.com/cli/)
- python


#### Credentials:


* [CMR](https://earthdata.nasa.gov/about/science-system-description/eosdis-components/common-metadata-repository) username and password.  Can be excluded if you are not exporting metadata to CMR.

* [EarthData Client login](https://earthdata.nasa.gov/about/science-system-description/eosdis-components/earthdata-login) username and password. User must have the ability to administer and/or create applications in URS.



## Make local copy of `cumulus` Repo and prepare it.

Clone Repository

    $ git clone https://github.com/cumulus-nasa/cumulus.git

Change Directory to the Repository root

    $ cd cumulus

Install and configure the local build environment and dependencies using npm

    $ npm install
    $ npm run ybootstrap

Build the cumulus applications

    $ npm run build


**Note**: In-house SSL certificates may prevent successful bootstrap. (i.e. `PEM_read_bio` errors)
*TODO: Can someone explain how to fix or work around?*


### Prepare your DAAC deployment Repo.

If you already are working with an existing `<daac>-deploy` with appropriate configuration, skip to [Prepare AWS configuration](#pas)

Go to the same directory level as the cumulus repo download

    $ cd ..

Clone template-deply repo and name appropriately for your DAAC or organization.

    $ git clone https://github.com/cumulus-nasa/template-deploy <daac>-deploy

Enter repoistory root directory

    $ cd <daac>-deploy

Install packages with npm

    $ npm install

**Note**: The npm install command will add the [kes](http://devseed.com/kes/) utility to the daac-deploy's `node_packages` directory and will be utilized later for most of the AWS deployment commands

The [`cumulus`](https://github.com/cumulus-nasa/cumulus) project contains default configration values in `cumulus/packages/deployment/app.example`, however these need to be customized for your cumulus app.

Begin by copying the template directory to your project, you will modify it for you daac specific needs later.

    $ cp -r ../cumulus/packages/deployment/app.example ./app

[Create a new repository](https://help.github.com/articles/creating-a-new-repository/) `<daac>-deploy` so that you can track daac-specific configuraiton changes:

    $ git remote set-url origin https://github.com/cumulus-nasa/<daac>-deploy
    $ git push origin master

You can then [add/commit](https://help.github.com/articles/adding-a-file-to-a-repository-using-the-command-line/) changes as needed.


### Prepare AWS configuration  {#pas}

**Set Access Keys:**

You need to make some AWS information available to your environment. If you don't already have the access key and secret access key of an AWS user with IAM Create-User permissions, you must [Create Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for such a user with IAM Create-User permissions, then export the access keys:


    $ export AWS_ACCESS_KEY_ID=<AWS access key>
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key>
    $ export AWS_REGION=<region>

If you don't want to set environment variables, [access keys can be stored locally via the AWS CLI.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)


**Create S3 Buckets:**

These buckets can be created with the AWS command line utility or the web interface. You do not need to assign them any special properties and you do not need to modify their default permissions (not even for the public bucket).

See [creating s3 buckets](./create_bucket.md) for more information on how to create a bucket.

The following s3 buckets should be created (replacing prefix with whatever you'd like, generally your organization/DAAC's name):


* `<prefix>-internal`
* `<prefix>-private`
* `<prefix>-protected`
* `<prefix>-public`


**Note**: s3 bucket object names are global and must be unique across all users/locations/etc.


### Create a deployer role

The `deployer` configuration sets up an IAM role with permissions for deploying the cumulus stack.

__All deployments in the various config.yml files inherit from the `default` deployment, and new deployments only need to override relevant settings.__

**Add new deployment to `<daac>-deploy/deployer/config.yml`:**

    <deployer-deployment-name>:          # e.g. dev (Note: Omit brackets, i.e. NOT <dev>)
      prefix: <stack-prefix>    # prefixes CloudFormation-created deployer resources and permissions
      stackName: <stack-name>   # name of this deployer stack in CloudFormation (e.g. <prefix>-deployer)
      stackNameNoDash: <DashlessStackName>	# a stack name that will be identifiable as being associated with stack-name which contains no dashes
      buckets:
        internal: <prefix>-internal  # Previously created internal bucket name
        shared_data_bucket: cumulus-data-shared  # Devseed-managed shared bucket (contains custom ingest lmabda functions/common ancillary files)

Note: All other parameters in this file such as 'Capabilities' that aren't specifically mentioned above do not need to be edited.

**Deploy `deployer` stack**[^1]

    Use the kes utility installed with cumulus to deploy your configurations to AWS. This must be done from the <daac>-deploy repository root

    $ cd ..
    $ kes cf deploy --kes-folder deployer --deployment <deployer-deployment-name> --region <region>

Notes: If global `kes` commands do not work, your `npm install` of the `<daac>-deploy` repo has included a local copy under `./node_modules/.bin/kes`.  It may be useful to add this to your PATH environment variable.

A successful completion will result in output similar to:

    $ kes cf deploy --kes-folder deployer --deployment default --region us-east-1
    Template saved to deployer/cloudformation.yml
    Uploaded: s3://<bucket-name>/<stack-name>/cloudformation.yml
    Waiting for the CF operation to complete
    CF operation is in state of CREATE_COMPLETE

This creates a new DeployerRole [role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) in the [IAM Console](https://console.aws.amazon.com/iam/home) named `<deployer-stack-name>-DeployerRole-<generatedhashvalue>`. Note its Role ARN for later.

### Create IAM Roles

The `iam` configuration creates 4 [roles](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) and an [instance profile](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html) used internally by the cumulus stack.

**Add new deployment to `<daac>-deploy/iam/config.yml`:**

    <iam-deployment-name>:
      prefix: <stack-prefix>  # prefixes CloudFormation-created iam resources and permissions, MUST MATCH prefix in deployer stack
      stackName: <stack-name> # name of this iam stack in CloudFormation (e.g. <prefix>-iams)
      buckets:
        internal: <prefix>-internal
        private: <prefix>-private
        protected: <prefix>-protected
        public: <prefix>-public

**Deploy `iam` stack**[^1]

    $ kes cf deploy --kes-folder iam --deployment <iam-deployment-name> --region <region>

Note: If this deployment fails check the deployment details in the AWS Cloud Formation Console for information. Permissions may need to be updated by your AWS adminstrator.

If the `iam` deployment command  succeeds, you should see 4 new roles in the [IAM Console](https://console.aws.amazon.com/iam/home):

* `<stack-name>-ecs`
* `<stack-name>-lambda-api-gateway`
* `<stack-name>-lambda-processing`
* `<stack-name>-steprole`

The same information can be obtained from the AWS CLI command: `aws iam list-roles`.

The `iam` deployment also creates an instance profile named `<stack-name>-ecs` that can be viewed frmo the AWS CLI command: `aws iam list-instance-profiles`.


#### Assign an `sts:AssumeRole` policy to a new or existing user:

Using the [command line interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-iam-policy.html) or [IAM console](https://console.aws.amazon.com/iam/home) create and assign a policy to a user who will deploy cumulus.

This AssumeRole policy, when applied to a user, allows the user to act with the permissions described by the DeployerRole. You can paste this into the "JSON" tab of the policy creator interface.

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "sts:AssumeRole",
                "Resource": "<arn:DeployerRole>"
            }
        ]
    }

Replace the `<arn:DeployerRole>` with Role ARN value created when you deployed the deployer stack. The cli command `aws iam list-roles | grep <deployer-stack>` will show you the correct ARN.

_Before proceeding, make sure you attached this new policy to the user that will deploy Cumulus. If you create a new user for this, make sure to save their access key and secret access key._


**Update AWS Access Keys**

Create or obtain [Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for the user who will assume the DeployerRole in IAM (the same user you just assigned the AssumeRole policy to), then export the access keys, replacing the previous values in your environment:

    $ export AWS_ACCESS_KEY_ID=<AWS access key> (User with sts:AssumeRole Permission for <arn:DeployerRole>)
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key> (User with sts:AssumeRole Permission for <arn:DeployerRole>)
    $ export AWS_REGION=<region>

If you don't want to set environment variables, [access keys can be stored locally via the AWS CLI.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

_Make sure you've updated your actual envionment variables before proceeding (e.g., if sourcing from a file, resource the file)._

### Configure Cumulus Stack

This updates the file copied in the [Prepare your DAAC's Repo](#prepare-your-daacs-repo) step.

**Edit the  `<daac>-deploy/app/config.yml` file **

The various configuration sections are described below with a sample `config.yml` at the end. It is not necessary to configure the CMR/distribution sections if you're not utilizing CMR/deploying for the first time.


##### vpc

Configure your virtual private cloud.  You can find `<vpc-id>` and `<subnet-id>` values on the [VPC Dashboard](https://console.aws.amazon.com/vpc/home?region=us-east-1#). `vpcId` from [Your VPCs](https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs:), and `subnets` [here](https://console.aws.amazon.com/vpc/home?region=us-east-1#subnets:). When you choose a subnet, be sure to also note its availability zone, to configure `ecs`.

##### ecs

Configuration for the Amazon EC2 Container Service (ECS) instance.  Update `availabilityZone` with information from [VPC Dashboard](https://console.aws.amazon.com/vpc/home?region=us-east-1#)
note `instanceType` and `desiredInstances` have been selected for a sample install.  You will have to specify appropriate values to deploy and use ECS machines.


##### buckets

The config buckets should map to the same names you used when creating buckets in the [Prepare AWS](#prepare-aws) step.

##### iams

Add the ARNs for each of the four roles and one instanceProfile created in the [Create IAM Roles](create-iam-roles) step.    For more inforamtion on how to locate them, see [Locating Cumulus IAM Roles](iam_roles.md).

##### users

List of EarthData users you wish to have access to your dashboard application.   These users will be populated in your `<stackname>-UsersTable` [DynamoDb](https://console.aws.amazon.com/dynamodb/) in addition to the default_users defined in the cumulus default template.

##### Sample config.yml

```
<cumulus-deployment-name>:
  stackName: <prefix>-cumulus
  stackNameNoDash: <Prefix>Cumulus

  apiStage: dev

  vpc:
    vpcId: <vpc-id>
    subnets:
      - <subnet-id>

  ecs:
    instanceType: t2.micro
    desiredInstances: 0
    availabilityZone: <subnet-id-zone>

  buckets:
    internal: <prefix>-internal
    private: <prefix>-private
    protected: <prefix>-protected
    public: <prefix>-public

  iams:
    ecsRoleArn: arn:aws:iam::<aws-account-id>:role/<iams-prefix>-ecs
    lambdaApiGatewayRoleArn: arn:aws:iam::<aws-account-id>:role/<iams-prefix>-lambda-api-gateway
    lambdaProcessingRoleArn: arn:aws:iam::<aws-account-id>:role/<iams-prefix>-lambda-processing
    stepRoleArn: arn:aws:iam::<aws-account-id>:role/<iams-prefix>-steprole
    instanceProfile: arn:aws:iam::<aws-account-id>:instance-profile/<iams-prefix>-ecs

    urs_url: https://uat.urs.earthdata.nasa.gov/ #make sure to include the trailing slash

    # if not specified the value of the apigateway backend endpoint is used
    # api_backend_url: https://apigateway-url-to-api-backend/ #make sure to include the trailing slash

    # if not specified the value of the apigateway dist url is used
    # api_distribution_url: https://apigateway-url-to-distribution-app/ #make sure to include the trailing slash

  # URS users who should have access to the dashboard application.
  users:
    - username: <user>
    - username: <user2>
```


#### Configure EarthData application

The cumulus stack is expected to authenticate with [Earthdata Login](https://urs.earthdata.nasa.gov/documentation). You must create and register a new application. Use the [User Accpetance Tools (UAT) site](https://uat.urs.earthdata.nasa.gov) unless you changed `urs_url` above. Follow the directions on [how to register an application.](https://wiki.earthdata.nasa.gov/display/EL/How+To+Register+An+Application).  Note the password in step 3 and client ID in step 4 these replace the `clientid`  and `clientpassword` .env file in the next step.

#### Set up an environment file:

Copy `app/.env.sample to app/.env` and add CMR/earthdata client credentials. See [Credentials section](#Credentials):

    CMR_PASSWORD=cmrpassword
    EARTHDATA_CLIENT_ID=clientid
    EARTHDATA_CLIENT_PASSWORD=clientpassword

For security it is highly recommended that you prevent `apps/.env` from being committed to the repository by keeping it in the `.gitignore` file at the root of this repository.

----
### Deploy the Cumulus stack

Once the preceeding configuration steps have completed, run the following to deploy cumulus from your `<daac>-deploy` root directory:


    $ kes cf deploy --kes-folder app --region <region> --template ../cumulus/packages/deployment/app --deployment <cumulus-deployment-name> --role <arn:deployerRole>



You can monitor the progess of the stack deployment from the [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/home), this step takes a few minutes.


A successful completion will result in output similar to:

	 $ ./node_modules/.bin/kes cf deploy --kes-folder app --region <region> --template ../cumulus/packages/deployment/app --deployment daac --role arn:aws:iam::<userIDnumbers>:role/<deployer-name>-DeployerRole-<HASHNUMBERS>
	Generating keys. It might take a few seconds!
	Keys Generated
	keys uploaded to S3

	  adding: sf-starter/ (stored 0%)
	  adding: sf-starter/index.js (deflated 85%)


	  adding: daac-ops-api/ (stored 0%)
	  adding: daac-ops-api/index.js (deflated 85%)


	  adding: sf-sns-broadcast/ (stored 0%)
	  adding: sf-sns-broadcast/index.js (deflated 85%)


	  adding: hello-world/ (stored 0%)
	  adding: hello-world/index.js (deflated 85%)

	Uploaded: s3://daac-internal/daac-cumulus/lambdas/<HASHNUMBERS>/hello-world.zip
	Uploaded: s3://daac-internal/daac-cumulus/lambdas/<HASHNUMBERS>/sf-starter.zip
	Uploaded: s3://daac-internal/daac-cumulus/lambdas/<HASHNUMBERS>/sf-sns-broadcast.zip
	Uploaded: s3://daac-internal/daac-cumulus/lambdas/<HASHNUMBERS>/daac-ops-api.zip
	Template saved to app/cloudformation.yml
	Uploaded: s3://<prefix>-internal/<prefix>-cumulus/cloudformation.yml
	Waiting for the CF operation to complete
	CF operation is in state of CREATE_COMPLETE

	Here are the important URLs for this deployment:

	Distribution:  https://<kido2r7kji>.execute-api.us-east-1.amazonaws.com/dev/
	Add this url to URS:  https://<kido2r7kji>.execute-api.us-east-1.amazonaws.com/dev/redirect

	Api:  https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/
	Add this url to URS:  https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/token

	Uploading Workflow Input Templates
	Uploaded: s3://<prefix>-internal/<prefix>-cumulus/workflows/HelloWorldWorkflow.json
	Uploaded: s3://<prefix>-internal/<prefix>-cumulus/workflows/list.json


__Note that the output of a successful deploy gives you urls that you will use to update your Earthdata application.__

#### Update Earthdata Application.

You will need to add two redirect urls to your Earthdata login application.
Login to URS (UAT), and under My Applications -> Application Administration -> use the edit icon of your application.  Then under Manage -> redirect URIs, add the Backend API url returned from the stack deployment, e.g. `https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/token`.
Also add the Distribution url `https://<kido2r7kji>.execute-api.us-east-1.amazonaws.com/dev/redirect`[^3]. You may also delete the placeholder url you used to create the application.



----
## Deploy Cumulus Dashboard

### Prepare AWS

**Create S3 bucket:**

* Create it, e.g. `<prefix>-dashboard`. Use the command line or console as you did when [preparing AWS configuration](#Prepare AWS configuration).
* Configure the bucket to host a website:
  * AWS S3 console: Select <prefix>-dashboard bucket then,  "Properties" -> "Static Website Hosting", point to `index.html`
  * CLI: `aws s3 website s3://<prefix>-dashboard --index-document index.html`
* The bucket's url will be `http://<prefix>-dashboard.s3-website-<region>.amazonaws.com` or you can find it on the AWS console via "Properties" -> "Static website hosting" -> "Endpoint"

### Install dashboard

To install the dashboard, from the root deploy directory make a clone of the cumulus-dashboard repository and prepare the repo with npm install:

    $ git clone https://github.com/cumulus-nasa/cumulus-dashboard
    $ cd cumulus-dashboard
    $ npm install

### Dashboard Configuration

Configure dashboard:

Update config in `cumulus-dashboard/app/scripts/config/config.js`:

replace the default apiRoot `https://wjdkfyb6t6.execute-api.us-east-1.amazonaws.com/dev/` with your app's apiroot.[^2]

    apiRoot: process.env.APIROOT || 'https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/'

**Note**  evironmental variables are available during the build:`DAAC_NAME`, `STAGE`, `HIDE_PDR`, any of these can be set on the command line to override the values contained in `config.js`.


Build the dashboard from the dashboard repository root directory, cumulus-dashboard:

      $ npm run build


### Dashboard Deployment:

Deploy dashboard to s3 bucket from the `cumulus-dashboard` directory:

Using AWS CLI:

      $ aws s3 sync dist s3://<prefix>-dashboard --acl public-read

Or from the S3 Console:
 Open the <prefix>-dashboard bucket, click 'upload'. Add the contents of the 'dist' subdirectory to the upload. Then select 'Next'. On the permissions window allow the public to view. Select 'Upload'.



You should be able to visit the dashboard website at `http://<prefix>-dashboard.s3-website-<region>.amazonaws.com` or find the url
`<prefix>-dashboard` -> "Properties" -> "Static website hosting" -> "Endpoint" and login with a user that you configured for access in the [Configure Cumulus Stack](#configure-cumulus-stack) step.



----
## Updating Cumulus deployment

Once deployed for the first time, any future updates to the role/stack configuration files/version of Cumulus can be deployed and will update the appropriate portions of the stack as needed.

## Update Roles

    $ kes cf deploy --kes-folder deployer --deployment <deployment-name> --region <region> # e.g. us-east-1
    $ kes cf deploy --kes-folder iam --deployment <deployment-name> --region <region> # e.g. us-east-1

## Update Cumulus

    $ kes cf deploy --kes-folder config --region <region> --deployment <deployment-name> --role <arn:deployerRole>


----
## Develop Lambda Functions

### Develop a new Lambda

To develop a new lambda from a sample, create a new folder in `cumulus/tasks/` and run `npm init`:

    $ cd ../cumulus/cumulus/tasks
    $ mkdir new-lambda
    $ cd new-lambda
    $ npm init

Or copy an existing lambda function to customize:

        $ cd ../cumulus/cumulus/tasks
        $ cp discover-pdrs new-lambda

Modify package.json:

* name
* version
* description
* test script
* dependencies (NOT devDependencies)

### Build a Lambda

To build node.js lambda functions, use webpack to pack into single .js with dependencies:

    $ npm run build

Alternatively, to monitor for changes and auto-rebuild:

    $ npm run watch

For non-node lambdas not included in cumulus repo, upload .zip to s3 and modify lambdas.yml as previously shown.

### Deploy a Lambda

For new lambdas, update `<daac>-deploy/lambdas.yml` by adding a new entry.
E.g.: node.js sample for '../cumulus/cumulus/tasks/sample-lambda' in the cumulus repo):

    - name: <LambdaName>                                       # eg:  LambdaSample (does not need to conform to dirname)
      handler: <dir>.<function>                                # eg:  sample-lambda.handler (assuming file has module.exports.handler = <someFunc>)
      timeout: <ms>                                            # eg:  300
      source: '../cumulus/cumulus/tasks/<dir>/dist/<file.js>'  # eg:  '../cumulus/cumulus/tasks/sample-lambda/dist/index.js'

For non-node.js lambda code (e.g. python) uploaded as a .zip to an S3 bucket:

    - name: PyLambda
      handler: <file.py>.<function>               # eg:  lambda_handler.handler for lambda_handler.py with:  def handler(event, context):
      timeout: <ms>
      s3Source:
        bucket: '{{buckets.internal}}'            # refers to bucket set in config.yml
        key: deploy/cumulus-process/<dir>/<file>  # eg: deploy/cumulus-process/modis/0.3.0b3.zip
      runtime: python2.7                          # Node is default, otherwise specify.

To deploy all changes to /tasks/ and lambdas.yml:

    $ kes cf deploy --kes-folder app --template ../cumulus/packages/deployment/app --region <region> --deployment <deployment-name> --role <arn:deployerRole>

To deploy modifications to a single lambda package:

    $ kes lambda <LambdaName> --kes-folder app --template ../cumulus/packages/deployment/app --deployment <deployment-name> --role <arn:deployerRole>



### Footnotes:

[^1]: Creating the deployer role and the iam  actions require more permissions than a typical AWS user will have and should be run by an administrator.

[^2]: The API root can be found a number of ways. The easiest is to note it in the output of the app deployment step. But you can also find it from the `AWS console -> Amazon API Gateway -> APIs -> <prefix>-cumulus-backend -> Dashboard`, and reading the url at the top "invoke this API"

[^3]: To add another redirect URIs to your application. On EarthData home page, select "My Applications" Scroll down to "Application Administration" and use the edit icon for your application.  Then Manage -> Redirect URIs.
