# How to Deploy Cumulus

This is a guide for deploying a new instance of Cumulus.

----
## Deploy Cumulus
### Linux Requirements:
- zip
- sha1sum
- node >= 7.10
- npm

### Credentials

**Posting to CMR:**

* CMR Password
* EarthData Client login credentials (username & password)

### Prepare `cumulus` Repo

    $ git clone https://github.com/cumulus-nasa/cumulus
    $ cd cumulus
    $ npm install
    $ npm run ybootstrap
    $ npm run build

Note: In-house SSL certificates may prevent successful bootstrap. (i.e. `PEM_read_bio` errors)

### Prepare `<daac>-deploy` Repo (e.g. `lpdaac-deploy`)

    $ cd ..
    $ git clone https://github.com/cumulus-nasa/lpdaac-deploy
    $ cd lpdaac-deploy
    $ npm install

### Prepare AWS

**Create S3 Buckets:**

* internal
* private
* protected
* public

**Set Access Keys**

    (Access keys for user with IAM Create-User Permission)
    $ export AWS_ACCESS_KEY_ID=<AWS access key>
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key>
    $ export AWS_REGION=us-east-1

If you don't want to set environment variables, access keys can be stored locally via the AWS CLI. [More information here.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)

### Create Deployer

The `deployer` configuration sets up an IAM role with permissions for deploying the cumulus stack.

__All deployments in the various config.yml files inherit from the `default` deployment, and new deployments only need to override relevant settings.__

**Add new deployment to `<daac>-deploy/deployer/config.yml`:**

    <deployment-name>:          # e.g. dev (Note: Omit brackets, i.e. NOT <dev>)
      prefix: <stack-prefix>    # prefixes CloudFormation-created deployer resources and permissions
      stackName: <stack-name>   # name of the deployer stack in CloudFormation
      buckets:
        internal: <internal-bucket-name>  # Previously created internal bucket name.
      shared_data_bucket: cumulus-data-shared  # Devseed-managed shared bucket

**Deploy `deployer` stack**[^1]

    $ kes cf upsert --kes-folder deployer --deployment <deployment-name> --region <region> # e.g. us-east-1

Note: If global `kes` commands do not work, your `npm install` of the `<daac>-deploy` repo has included a local copy under `./node_modules/.bin/kes`


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

    $ kes cf upsert --kes-folder iam --deployment <deployment-name> --region <region>

Assign `sts:AssumeRole` policy to new or existing user via Policy:

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

Create Access Keys for AssumeRole user in IAM, then export the access keys:

    $ export AWS_ACCESS_KEY_ID=<AWS access key> (User with sts:AssumeRole Permission)
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key> (User with sts:AssumeRole Permission)
    $ export AWS_REGION=us-east-1

### Create Cumulus Stack

**Add new deployment to `<daac>-deploy/config/config.yml`:**

    <deployment-name>:
      stackName: <stack-name> # name of the Cumulus stack in CloudFormation, MUST START WITH deployer/iam Prefix
      buckets:
        internal: <internal-bucket-name>
        private: <private-bucket-name>
        protected: <protected-bucket-name>
        public: <public-bucket-name>
      iams:
        lambdaApiGatewayRoleArn: <arn:iam-cumulus-lambda-api-gateway-role>
        lambdaProcessingRoleArn: <arn:iam-cumulus-lambda-processing-role>
        stepRoleArn: <arn:iam-cumulus-steprole>
        instanceProfile: <arn:iam-cumulus-ecs-role>
      cmr:
        username: <insert and change as needed>  # password is set in .env
        provider: <insert and change as needed>
        clientId: <insert and change as needed>
      distribution:        # Update after first deploy with API Gateway endpoint
        endpoint: <API-Gateway-distribution-invoke-URL>
        redirect: <API-Gateway-distribution-invoke-URL/redirect>
      backend:             # Update after first deploy with API Gateway endpoint
        endpoint: <URS or UAT address (e.g. https://urs.earthdata.nasa.gov)>
        api: <API-Gateway-backend-auth-login-URL>
        dashboard: <s3-dashboard-bucket-static-site-url/#/auth>

### Set up environment:

Change `config/.env`:

    CMR_USERNAME=<cmrusername>
    CMR_PASSWORD=<cmrpassword>
    EARTHDATA_CLIENT_ID=<clientid>
    EARTHDATA_CLIENT_PASSWORD=<clientpassword>

### Best Practices

* config.yml should override fields in new deployments, refer to security credentials via .env (which is gitignored) and include a default.





----
## Update Cumulus deployment

(Require Access Keys for user with IAM Permissions)

    $ kes cf upsert --kes-folder deployer --deployment <deployment-name> --region <region> # e.g. us-east-1
    $ kes cf upsert --kes-folder iam --deployment <deployment-name> --region <region> # e.g. us-east-1

(Requires Access Keys for user with sts:AssumeRole Permission)

    $ kes cf upsert --kes-folder config --region <region> --deployment <deployment-name> --role <arn:deployerRole>

Monitor deployment via the AWS CloudFormation Stack Details page reports (esp. "Events" and "Resources" sections) for creation failure.





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

    $ kes cf upsert --kes-folder config --region <region> --deployment <deployment-name> --role <arn:deployerRole>

To deploy modifications to a single lambda package:

    $ kes lambda <LambdaName> --kes-folder config --deployment <deployment-name> --role <arn:deployerRole>





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

Ensure `<daac>-deploy/config/config.yml` has updated `distribution` and `backend` sections for your deployment, upsert if necessary.

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

### EarthData Login Set up

The following steps will allow you to set up EarthData login and redirects for the Cumulus dashboard.
Create an application on EarthData (URS or UAT depending on your target environment) with the following redirect URIs:

* `<API-Gateway-backend-invoke-URL>/auth/login`
* `<API-Gateway-distribution-invoke-URL>/redirect`
* `<Dashboard-S3-Endpoint-URL>`
