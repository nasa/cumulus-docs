# How to Deploy Cumulus

This is a guide for deploying a new instance of Cumulus.

----
## Deploy Cumulus
### Linux/MacOS Requirements:
- zip
- sha1sum
- [node >= 6.9.5, < 8](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm)
- [yarn](https://yarnpkg.com/lang/en/docs/install/)

**Note** : To use the AWS command line tool, you'll need to have a python environment and install the AWS CLI package.  Details can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/installing.html).

### Credentials

**Posting to CMR:**

* CMR Password
* EarthData Client login credentials (username & password)


### Prepare `cumulus` Repo

    $ git clone git@github.com:cumulus-nasa/cumulus.git
    $ cd cumulus
    $ npm install
    $ npm run ybootstrap
    $ npm run build

Note: In-house SSL certificates may prevent successful bootstrap. (i.e. `PEM_read_bio` errors)

### Prepare your DAAC's Repo.

**Note**: to function correctly the deployment configuration root *must* be at the same root as the cumulus main project directory

    $ cd ..
    $ git clone git@github.com:cumulus-nasa/template-deploy <daac>-deploy
    $ cd <daac>-deploy
    $ npm install

Note: The npm install command will add the [kes](http://devseed.com/kes/) utility to the daac-deploy's `node_packages` directory and will be utilized later for most of the AWS deployment commands

### Prepare AWS

**Create S3 Buckets:**

The following s3 buckets should be created (replacing prefix with whatever you'd like, generally your organization/DAAC's name):

* ```<prefix>-internal```
* ```<prefix>-private```
* ```<prefix>-protected```
* ```<prefix>-public```


**Please note**: s3 bucket object names are global across all users/locations/etc, meaning you should be certain your bucket name is unique.

These buckets can be created by utilizing the AWS command line utility or the web interfece.

See [creating s3 buckets](./create_bucket.md) for more information on how to create a bucket

**Set Access Keys**

Create [Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for the user with IAM Create-User permissions, then export the access keys:

    $ export AWS_ACCESS_KEY_ID=<AWS access key>
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key>
    $ export AWS_REGION=<region>

If you don't want to set environment variables, access keys can be stored locally via the AWS CLI. [More information here.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)

### Create Deployer

The `deployer` configuration sets up an IAM role with permissions for deploying the cumulus stack.

__All deployments in the various config.yml files inherit from the `default` deployment, and new deployments only need to override relevant settings.__

**Add new deployment to `<daac>-deploy/deployer/config.yml`:**

    <deployment-name>:          # e.g. dev (Note: Omit brackets, i.e. NOT <dev>)
      prefix: <stack-prefix>    # prefixes CloudFormation-created deployer resources and permissions
      stackName: <stack-name>   # name of the deployer stack in CloudFormation (e.g. <prefix>-iam-deployer)
      buckets:
        internal: <internal-bucket-name>  # Previously created internal bucket name.
      shared_data_bucket: cumulus-data-shared  # Devseed-managed shared bucket (contains custom ingest lmabda functions/common ancillary files)

**Deploy `deployer` stack**[^1]

    $ kes cf upsert --kes-folder deployer --deployment <deployment-name> --region <region> # e.g. us-east-1

Note: If global `kes` commands do not work, your `npm install` of the `<daac>-deploy` repo has included a local copy under `./node_modules/.bin/kes`

A successful completion will result in output similar to:

    $ kes cf deploy --kes-folder deployer --deployment default --region us-east-1
    Template saved to deployer/cloudformation.yml
    Uploaded: s3://<bucket-name>/<stack-name>/cloudformation.yml
    Waiting for the CF operation to complete
    CF operation is in state of CREATE_COMPLETE

This will result in the creation of a new DeployerRole [role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) in the [IAM Console](https://console.aws.amazon.com/iam/home) named `<deployer-stack-name>-DeployerRole-<generatedhashvalue>`.

### Create IAM Roles

The `iam` configuration creates 4 roles used internally by the cumulus stack.

**Add new deployment to `<daac>-deploy/iam/config.yml`:**

    <deployment-name>:
      prefix: <stack-prefix>  # prefixes CloudFormation-created iam resources and permissions, MUST MATCH deployer prefix
      stackName: <stack-name> # name of the iam stack in CloudFormation
      buckets:
        internal: <internal-bucket-name>
        private: <private-bucket-name>
        protected: <protected-bucket-name>
        public: <public-bucket-name>

**Deploy `iam` stack**[^1]

    $ kes cf deploy --kes-folder iam --deployment <deployment-name> --region <region>

If the IAM deployment command  succeeds, you should see 4 new roles in the IAM Managment Console:

* ```<stack-name>-ecs```
* ```<stack-name>-lambda-api-gateway```
* ```<stack-name>-lambda-processing```
* ```<stack-name>-steprole```

The same information can be obtained from the AWS command line: ```aws iam list-roles```


**Assign `sts:AssumeRole` policy to new or existing user:**

Using the [command line interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-iam-policy.html) or [IAM console](https://console.aws.amazon.com/iam/home) assign the sts:AssumeRole policy to your chosen user.

This user will be used to deploy Cumulus.


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

[^1]: Creating the deployer role and the iam  actions require more permissions than a typical AWS user will have and should be run by an administrator.

**Change AWS Access Keys**

Create [Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for AssumeRole user in IAM, then export the access keys:

    $ export AWS_ACCESS_KEY_ID=<AWS access key> (User with sts:AssumeRole Permission)
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key> (User with sts:AssumeRole Permission)
    $ export AWS_REGION=<region>

### Create Cumulus Stack

The Cumulus project contains default configration values at cumulus//packages/deployment/app/*yml, however these need to be changed.   To override/add new values, copy the example template from cumulus//packages/deployment/app.example to your template project's root as `./app` (e.g.`cp -r ../cumulus//packages/deployment/app.example ./app).


**update app/config.yml**

The various configuration sections are described below with a sample config.yml at the end.    It's not nessicary to configure the CMR/distribution sections if you're not utilizing CMR/deploying for the first time.

#### buckets

The config buckets should map to the same names you used when creating buckets in the [Prepare AWS](#prepare-aws) step.

#### iams

Add the ARNs for each of the four roles created in the [Create IAM Roles](create-iam-roles) step.    For more inforamtion on how to locate them, see [Locating Cumulus IAM Roles](iam_roles.md).


#### ecs

Config for the amazon container service instance.   This shouldn't need to be changed for default instalations

#### Sample config.yml

    <deployment-name>:                      ### The name of your deployment
      stackName: change-me-cumulus          ### The name of the cumulus stack
      stackNameNoDash: ChangeMeCumulus      ### Camelcased stack name with dashes removed

      apiStage: dev

      ecs:
        instanceType: t2.micro              ### ecs instance size
        desiredInstances: 0

     buckets:
        internal: change-me
        private: change-me
        protected: change-me
        public: change-me

    iams:
        ecsRoleArn: arn:aws:iam::<aws-account-id>:role/ghrc-cumulus-ecs
        lambdaApiGatewayRoleArn: arn:aws:iam::<aws-account-id>:role/ghrc-cumulus-lambda-api-gateway
        lambdaProcessingRoleArn: arn:aws:iam::<aws-account-id>:role/ghrc-cumulus-lambda-processing
        stepRoleArn: arn:aws:iam::<aws-account-id>:role/ghrc-cumulus-steprole
        instanceProfile: null

        urs_url: https://uat.urs.earthdata.nasa.gov/ #make sure to include the trailing slash

        # if not specified the value of the apigatewy backend endpoint is used
        # api_backend_url: https://apigateway-url-to-api-backend/ #make sure to include the trailing slash

        # if not specified the value of the apigateway dist url is used
        # api_distribution_url: https://apigateway-url-to-distribution-app/ #make sure to include the trailing slash

        dashboard_url: https://dashboard-url/ #make sure to include the trailing slash

### Set up environment:
Copy `app/.env.sample to .env` and add CMR/earthdata client credentials:

    CMR_PASSWORD=cmrpassword
    EARTHDATA_CLIENT_ID=clientid
    EARTHDATA_CLIENT_PASSWORD=clientpassword


### Best Practices

* config.yml should override fields in new deployments, refer to security credentials via .env (which is gitignored) and include a default.

----
### Deploy Cumulus

Once the preceeding configuration steps have completed, run the following to deploy cumulus (from your template root):

    $ kes cf deploy --kes-folder app --region <region> --template ../cumulus/packages/deployment/app --deployment <deployment-name> --role <arn:deployerRole>
    $ kes cf deploy --kes-folder app --region us-east-1 --template ../cumulus/packages/deployment/app/ --deployment jk1 --role arn:aws:iam::893015583569:role/jk1-cumulus-deployer-DeployerRole-9PZELLWUPBCL


You can monitor the progess of the stack deployment from the [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/home)

----
## Deploy Cumulus Dashboard

### Prepare AWS

**Create S3 bucket:**

* dashboard (Enable "Properties" -> "Static Website Hosting", point to `index.html`)

### Install dashboard

    $ cd ..
    $ git clone https://github.com/cumulus-nasa/cumulus-dashboard/
    $ cd cumulus-dashboard
    $ npm install

### Dashboard Configuration

Configure dashboard:

Ensure `<daac>-deploy/config/config.yml` has updated `distribution` and `backend` sections for your deployment, deploy if necessary.

Update `const altApiRoot` in `app/scripts/config.js`:


      const altApiRoot = {
        podaac: 'https//cumulus.ds.io/api/podaac/',
        ghrc: 'https://cumulus.ds.io/api/ghrc/',
        lpdaac: 'https://cumulus.ds.io/api/lpdaac/',
        <deployment-name>: <API-Gateway-backend-invoke-URL> # Ensure '/' at end.
      }


Build Dashboard and go to dist directory:


      $ DS_TARGET=<deployment> npm run staging
      $ cd dist

### Dashboard Deployment

Deploy dashboard to s3 bucket from the `cumulus-dashboard/dist` directory:

      $ aws s3 sync . s3://<dashboard-bucket-name> --acl public-read

Open Dashboard: Dashboard-Bucket -> "Properties" -> "Static Website Hosting" -> "Endpoint" URL

### EarthData Login Setup

The following steps will allow you to set up EarthData login and redirects for the Cumulus dashboard.
Create an application on EarthData (URS or UAT depending on your target environment) with the following redirect URIs:

* `<API-Gateway-backend-invoke-URL>/auth/login`
* `<API-Gateway-distribution-invoke-URL>/redirect`
* `<Dashboard-S3-Endpoint-URL>`


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

    $ kes cf deploy --kes-folder config --region <region> --deployment <deployment-name> --role <arn:deployerRole>

To deploy modifications to a single lambda package:

    $ kes lambda <LambdaName> --kes-folder config --deployment <deployment-name> --role <arn:deployerRole>
