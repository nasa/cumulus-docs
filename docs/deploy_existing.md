
# How to Redeploy an Existing Cumulus Setup

## Overview

This is a guide for redeploying an existing Cumulus setup. If you already have a "DAAC-deploy" repository, such as [ghrc-deploy](https://github.com/cumulus-nasa/ghrc-deploy), you should use this guide. If you don't, you should use the [First-time deployment](./deployment.md) guide instead.

The process involves:

*  Creating [AWS S3 Buckets](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html)
*  Using [Kes](http://devseed.com/kes/) to create [AWS CloudFormation](https://aws.amazon.com/cloudformation/getting-started/) templates that create [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) for the cumulus deployment
*  Using [Kes](http://devseed.com/kes/) to generate an [AWS CloudFormation](https://aws.amazon.com/cloudformation/getting-started/) template for Cumulus and deploy it

----
## Deploy Cumulus
### Linux/MacOS Requirements:
- zip
- sha1sum
- git
- [node >= 6.9.5, < 8](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm)
- [yarn](https://yarnpkg.com/lang/en/docs/install/)

**Note** : To use the AWS command line tool, you'll need to have a python environment and install the AWS CLI package.  Details can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/installing.html).
**Note** : You can perform a local installation of nodejs, including npm, by following the "node-and-npm-in-30-seconds.sh" variant of the instructions at https://gist.github.com/isaacs/579814 -- do not perform the last step, since npm will be installed along with node.

### Credentials

**Posting to CMR:**

* CMR Password
* EarthData Client login credentials (username & password)

**Dockerhub (if applicable for your deployment):**

* Dockerhub username and password

**For Cumulus Dashboard:**

* Earthdata Application Client ID + password
   * You must create and approve an actual Earthdata Application, as opposed to simply using personal or organizational login credentials, for the Dashboard to work -- this can be done in UAT Earthdata.

**Github repository access:**

* Required repositories:
   * [Base Cumulus](https://github.com/cumulus-nasa/cumulus)
   * "DAAC-deploy", such as [ghrc-deploy](https://github.com/cumulus-nasa/ghrc-deploy)
      * If you do not have a deployment repository, stop and follow the instructions for [First-time deployment](./deployment.md) instead
* Optional repositories:
   * [NSIDC documentation](https://github.com/cumulus-nasa/cumulus-nasa.github.io)
   * [Base Cumulus Dashboard](https://github.com/cumulus-nasa/cumulus-dashboard)

### Additional prerequisites

* Obtain AWS account credentials for a user with IAM "Create User" permissions
   * For example, an "admin"-type user
   * You will need a username and password to log onto the [AWS console](https://console.aws.amazon.com/console/home)
   * Also obtain the "access key" and "secret access key"
**Note** : The secret access key is shown only upon creation of the account. Although it can be regenerated, doing so will disrupt any existing operations that depend upon it.
* Choose a short string `<prefix>` to use in order to consistently identify the new namespace and its resources
* Identify which specific branches of the repositories listed above you should work with by consulting their owners (generally either DevSeed or NSIDC)

### Prepare `cumulus` Repo

    $ git clone https://github.com/cumulus-nasa/cumulus.git
    $ cd cumulus
    $ npm install -g lerna 
    $ npm install
    $ npm run bootstrap
    $ npm run build
**Note ** : Optionally, after `$ cd cumulus`, perform `$ git checkout branch <branch name>` if you've been told to use a branch other than master.

Note: In-house SSL certificates may prevent successful bootstrap. (i.e. `PEM_read_bio` errors)

### Prepare your DAAC's Repo.

If you are NOT already working with an existing `<daac>-deploy` repository, stop and read the [First time deployment guide](./deployment.nd) instead. If you already know that you have the appropriate configuration setup (for example, you've run through this process at least once before), you can skip this step.

**Note**: to function correctly the deployment configuration root *must* be at the same root as the cumulus main project directory

    $ cd ..
    $ git clone `<Your DAAC-deploy repo URL here>` <daac>-deploy
    $ cd <daac>-deploy
    $ npm install

**Note** : Your DAAC's deploy repo URL will be something like, e.g., https://github.com/cumulus-nasa/ghrc-deploy.git
**Note** : The npm install command will add the [kes](http://devseed.com/kes/) utility to the daac-deploy's `node_packages` directory and will be utilized later for most of the AWS deployment commands. Kes's main executable can now be found at `<daac-deploy>/node_modules/kes/bin/cli.js`


### Prepare AWS

**Create S3 Buckets:**

The following s3 buckets should be created (replacing prefix with whatever you'd like, generally your organization/DAAC's name):

* `<prefix>-internal`
* `<prefix>-private`
* `<prefix>-protected`
* `<prefix>-public`


**Note**: s3 bucket object names are global and must be unique across all users/locations/etc.

These buckets can be created with the AWS command line utility or the web interfece. You do not need to assign them any special properties and you do not need to modify their default permissions (not even for the public bucket).

See [creating s3 buckets](./create_bucket.md) for more information on how to create a bucket.

**Set Access Keys:**

You need to make some AWS information available to your environment. If you don't already have the access key and secret access key of an AWS user with IAM Create-User permissions, you must Create [Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for such a user with IAM Create-User permissions, then export the access keys:

    $ export AWS_ACCESS_KEY_ID=<AWS access key>
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key>
    $ export AWS_REGION=<region>  # this should be us-east-1 unless told otherwise.

If you don't want to set environment variables, [access keys can be stored locally via the AWS CLI.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

### Create a new deployer role

The `deployer` configuration sets up an IAM role with permissions for deploying the cumulus stack.

__All deployments in the various config.yml files inherit from the `default` deployment, and new deployments only need to override relevant settings.__

**_Append_ a new deployment to `<daac>-deploy/deployer/config.yml`:**

    <deployer-deployment-name>:         # e.g. dev (Note: Omit brackets, i.e. NOT <dev>)
      prefix: <prefix>                  # prefixes CloudFormation-created deployer resources and permissions
      stackName: <prefix>-deployer      # name of this deployer stack in CloudFormation (e.g. <prefix>-deployer)
      stackNameNoDash: <stack-name>     # Same as stackName, but camel-case and without dashes
      buckets:
        internal: <prefix>-internal     # Previously created internal bucket name
      shared_data_bucket: cumulus-data-shared  # Devseed-managed shared bucket (contains custom ingest lmabda functions/common ancillary files)

**Deploy modified `deployer` stack**[^1]

    $ kes cf deploy --kes-folder deployer --deployment <deployer-deployment-name> --region <region>

Note: If global `kes` commands do not work, your `npm install` of the `<daac>-deploy` repo has included a local copy under `./node_modules/kes/bin`, in which case you should try `./node_modules/kes/bin/cli.js cf deploy --kes-folder  deployer --deployment <deployer-deployment-name> --region <region>`.

A successful completion will result in output similar to:

    $ ./node_modules/kes/bin/cli.js cf deploy --kes-folder deployer --deployment default --region us-east-1
    Template saved to deployer/cloudformation.yml
    Uploaded: s3://<bucket-name>/<stack-name>/cloudformation.yml
    Waiting for the CF operation to complete
    CF operation is in state of CREATE_COMPLETE

This creates a new DeployerRole [role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) in the [IAM Console](https://console.aws.amazon.com/iam/home) named `<deployer-stack-name>-DeployerRole-<generatedhashvalue>`. Note its Role ARN for later.

### Create IAM Roles

The `iam` configuration creates 4 [roles](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) and an [instance profile](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html) used internally by the cumulus stack.

**_Append_ a new deployment to `<daac>-deploy/iam/config.yml`:**

    <iam-deployment-name>:
      prefix: <prefix>  # prefixes CloudFormation-created iam resources and permissions, MUST MATCH prefix in deployer stack
      stackName: <prefix>-iams  # name of this iam stack in CloudFormation (e.g. <prefix>-iams)
      buckets:
        internal: <prefix>-internal
        private: <prefix>-private
        protected: <prefix>-protected
        public: <prefix>-public

**Deploy `iam` stack**[^1]

    $ ./node_modules/kes/bin/cli.js cf deploy --kes-folder iam --deployment <iam-deployment-name> --region <region>

If the `iam` deployment command  succeeds, you should see 4 new roles in the [IAM Console](https://console.aws.amazon.com/iam/home). Note their Role ARNs for later.

* `<stack-name>-ecs`
* `<stack-name>-lambda-api-gateway`
* `<stack-name>-lambda-processing`
* `<stack-name>-steprole`

The same information can be obtained from the AWS CLI command: `aws iam list-roles`.

The `iam` deployment also creates an instance profile named `<stack-name>-ecs` that can be viewed frmo the AWS CLI command: `aws iam list-instance-profiles`.


### Assign an `sts:AssumeRole` policy to a new or existing user:

Using the [command line interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-iam-policy.html) or [IAM console](https://console.aws.amazon.com/iam/home) create and assign a policy to a user who will deploy cumulus.

This AssumeRole policy, when applied to a user, allows the user to act with the permissions described by the DeployerRole. Paste this into the "JSON" tab of the policy creator interface.

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


**Update local AWS Access Keys**

Create or obtain [Access Keys](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html) for the user who will assume the DeployerRole in IAM (the same user you just assigned the AssumeRole policy to), then export the access keys, replacing the previous values in your environment:

    $ export AWS_ACCESS_KEY_ID=<AWS access key> (User with sts:AssumeRole Permission for <arn:DeployerRole>)
    $ export AWS_SECRET_ACCESS_KEY=<AWS secret key> (User with sts:AssumeRole Permission for <arn:DeployerRole>)
    $ export AWS_REGION=<region>

If you don't want to set environment variables, [access keys can be stored locally via the AWS CLI.](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

_Make sure you've updated your actual envionment variables before proceeding (e.g., if sourcing from a file, resource the file)._


### Append new section to the Cumulus Stack

##### Earthdata Login

The cumulus stack is expected to authenticate with [Earthdata Login](https://urs.earthdata.nasa.gov/documentation). Create and register a new application. For non-production deployments, you will use the [User Accpetance Tools (UAT) site](https://uat.urs.earthdata.nasa.gov). Follow the directions on [how to register an application.](https://wiki.earthdata.nasa.gov/display/EL/How+To+Register+An+Application). in the `.env` file, replace `clientid` and `clientpassword` with the newly generated values.

#### Set up an environment file:

Create or update `<daac>-deploy/app/.env`. Be sure that `.env` is `.gitignore`-d so that it is not included in your repository.

This file should have the following items, or a subset of them, depending on your particular existing deployment:
```CMR_PASSWORD=<Your CMR password>
CMR_PROVIDER=<Your CMR provider>
CMR_USERNAME=<Your CMR username>
DOCKER_EMAIL=<Your Dockerhub email>
DOCKER_PASSWORD=<Your Dockerhub password>
EARTHDATA_CLIENT_ID=<Your Earthdata application's cliend ID (can be in UAT)
EARTHDATA_CLIENT_PASSWORD=<Your Earthdata application's account password>```

**Update main configuration file for the deployment, `<daac>-deploy/app/config.yml`**

The various configuration sections are described below with a sample `config.yml` at the end. Do not alter any content that already exists in your daac's `<daac-deploy>/app/config.yml` file unless you're sure you know what you are doing; instead, simply append a new section to its end.

###### vpc

You probably already have at least 1 vpc associated with your existing deployment, but its subnets can be transitory in nature depending on what kind of load balancing and/or docker activities are taking place at a given time. Thus, you must identify at least one persistent subnet to use as a subnet ID (you may only specify one). Navigate to  [AWS EC2 > Auto Scaling Groups](https://console.aws.amazon.com/ec2/autoscaling/home) and note the Availibility Zones (probably us-east-1a) and note the "Availibility Zone" (e.g., us-east-1a). Next, visit [AWS VPC](https://console.aws.amazon.com/vpc/home) and click on "Subnets". Copy the 'VPC' value into 'vpcId' and the appropriate 'Subnet ID' value, based on the Availability Zone value you just saw on the Auto Scaling Groups page, into 'subnets'. If you have no vpc and/or subnets, do not include the vpc section in your new configuration.

**Note** : If you see the error "The availability zones of the specified subnets and the Auto Scaling group do not match" in AWS > CloudFormation > Stacks > Stack Detail > Events appear while this stack is being deployed, it means you've chosen a subnet that isn't correct; this could be due to load balancing happening at different times. Try to pick the "1a" subnet, which seems to serve as some sort of default, if you have multiples to choose from.

###### buckets

The config buckets should map to the same names you used when creating buckets in the [Prepare AWS](#prepare-aws) step.

###### iams

Add the ARNs for each of the four roles and one instanceProfile created in the [Create IAM Roles](create-iam-roles) step.    For more inforamtion on how to locate them, see [Locating Cumulus IAM Roles](iam_roles.md).

###### cmr

If your existing deployment does not require these values, you may omit this section. They are used for posting to CMR, so any CMR credentials provided must have sufficient permission for this.

###### ecs

Configuration for the Amazon EC2 Container Service (ECS) instance. These values will depend on the nature of your existing deployment's ECS needs (i.e., what kind of docker items are included with your deployment). `instanceType` specifies attributes of the container such as its size; see [EC2 Instance Types](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html) for more information. `desiredInstances` should currently be set to 0, or else Cloud Formation may never finish creating the new cumulus stack due to a current bug with existing Cumulus docker images. The `docker` items are needed so the stack can source the appropriate docker images from dockerhub.

###### users

List the Earthdata Login usernames of any user(s) you want to be able to access the Cumulus Dashboard; omit this section of not using the Dashboard. For non-production environments, list their UAT Earthdata Login usernames. 

###### activities

Copy and paste this section from the `<default>` section at the top of the file, if it exists.

###### Sample config.yml

	 <cumulus-deployment-name>:
	   stackName: <prefix>-cumulus
           bucketPrefix: <prefix>

           vpc:                         # Do not include this section if you have no 
             vpcId: <vpcId>             # vpc or subent(s)
             subnets:
               - subnet-<hash>          # try the "1a" subnet when you have a choice

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

           cmr:
             username: '{{CMR_USERNAME}}'        # Set in .env or use a placeholder
             provider: '{{CMR_PROVIDER}}'        # Set in .env or use a placholder
             clientId: '{{EARTHDATA_CLIENT_ID}}' # Set in .env or use a placeholder

	   ecs:
             instanceType: <varies>              # Dependent on needs of your existing deployment
	     desiredInstances: 0                 # Should be zero currently due to bugs in docker
             docker:
               username: '{{DOCKER_EMAIL}}'      # Set in .env
               password: '{{DOCKER_PASSWORD}}'   # Set in .env
               email: '{{DOCKER_EMAIL}}'         # Set in .env

           users:                                # Earthdata Login names of allowed Dashboard users, if any
             - username: "username"

           activities:
             - name: "copied from 'default' deployment at top of this file"

           urs_url: https://uat.urs.earthdata.nasa.gov/ # Make sure to include the trailing slash

     	   # if not specified the value of the apigateway backend endpoint is used
	   # api_backend_url: https://apigateway-url-to-api-backend/ #make sure to include the trailing slash

	   # if not specified the value of the apigateway dist url is used
	   # api_distribution_url: https://apigateway-url-to-distribution-app/ #make sure to include the trailing slash


----
### Deploy the Cumulus stack

Once the preceeding configuration steps have completed, run the following to deploy cumulus from your `<daac>-deploy` root directory:


    $ ./node_modules/kes/bin/cli.js cf deploy --kes-folder app --region <region> --template ../cumulus/packages/deployment/app --deployment <prefix> --role <arn:deployerRole>


You need to monitor the progess of the stack deployment from the [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/home); this step is currently buggy and prone to errors. 

If you see this error: 
"The availability zones of the specified subnets and the Auto Scaling group do not match" -- This means you chose the wrong subnet for your vpc. All but one of the subnets are transitory, only existing when various load balancing and/or docker operations are taking place. Thus, you must choose the one and only persistent subnet. Navigate to [AWS EC2 > Auto Scaling Groups](https://console.aws.amazon.com/ec2/autoscaling/home) and note the Availibility Zones (probably us-east-1a). Use that information in conjunction with [AWS VPC > Subnets](https://console.aws.amazon.com/vpc/home) to select the subnet ID corresponding to the correct availability zone (e.g., the subnet for "us-east-1a".

If the deployment isn't failing but is taking a long time, navigate to [AWS ECS](https://console.aws.amazon.com/ecs/home) and then to "Clusters". Identify the new cluster associated with your <prefix> app deployment and click on it. It probably says in the table "Desired tasks 1", or some other non-zero number, and "Running tasks 0". You should update the cluster to change "Number of tasks" to 0, or else you will receive (eventually) an error such as "Service arn:aws:ecs:us-east-1:numbers:service/<prefix>-cumulus-<ECS service name> did not stabilize" and your app deployment will fail. 

If you did the above and the deployment is still taking a long time, be patient and let it continue to run. It will eventually time out and fail if it's in a state where it can't complete.

**Note** : If the stack fails to be created, AWS might not be able to automatically delete it for you even if you attempt to do so using the AWS console. The cause appears to be an inability to delete named State Machines that this stack created. The names of the specific state machines can be gathered from the "Events" section of the stack's output on the AWS CloudFormation Console; you can then (carefully) manually delete the specified State Machines, thus readying AWS for the next attempt.

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


Note that the output of a successful deploy gives you urls that you will use to update your Earthdata application.

#### Update Earthdata Application.

You will need to add two redirect urls to your Earthdata login application.
login to URS (UAT), and under My Applications -> Application Administration -> use the edit icon of your application.  Then under Manage -> redirect URIs, add the API url returned from the stack deployment, e.g. `https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/token`.
And add the Distribution url `https://<kido2r7kji>.execute-api.us-east-1.amazonaws.com/dev/redirect`[^3]. You may also delete the placeholder url you used to create the application.



----
## Deploy Cumulus Dashboard

### Prepare AWS

**Create S3 bucket:**

* Create it, e.g. `<prefix>-dashboard`.
* After it's created, configure the bucket to host a website:
  * AWS console:  "Properties" -> "Static Website Hosting", point to `index.html`
  * AWS console:  "Permissions", click the - for 'Everyone List objects' to allow the world to read the files here (actual access is controlled via the "users" list in app/config.yml)
  * CLI: `aws s3 website s3://<prefix>-dashboard --index-document index.html`
* The bucket's url will be `http://<prefix>-dashboard.s3-website-<region>.amazonaws.com` or you can find it on the AWS console via "Properties" -> "Static website hosting" -> "Endpoint"

### Install dashboard

    from your root deploy directory
    $ git clone https://github.com/cumulus-nasa/cumulus-dashboard
    $ cd cumulus-dashboard
    $ npm install

### Dashboard Configuration

Configure dashboard:

Update config in `cumulus-dashboard/app/scripts/config/config.js`:

replace the default apiRoot `https://wjdkfyb6t6.execute-api.us-east-1.amazonaws.com/dev/` with your app's apiroot.[^2]

    apiRoot: process.env.APIROOT || 'https://<czbbkscuy6>.execute-api.us-east-1.amazonaws.com/dev/'

**Note**  evironmental variables are available during the build:`DAAC_NAME`, `STAGE`, `HIDE_PDR`, any of these can be set on the command line to override the values contained in `config.js`. 


Build the dashboard:

      $ npm run build

**Note** : If you get an error from this about Problem clearing the cache: EACCES: permission denied, rmdir '/tmp/gulp-cache/default', this probably means the files at that location, and/or the folder, are owned by someone else. A dirty workaround for this is to edit the file `cumulus-dashboard/node_modules/gulp-cache/index.js` and alter the value of the line `var fileCache = new Cache({cacheDirName: 'gulp-cache'});` to something like, say, `var fileCache = new Cache({cacheDirName: '<prefix>-cache'});`. Now gulp-cache will be able to write to /tmp/<prefix>-cache/default, and the error should go away.

##r Dashboard Deployment

**In order to deploy the dashboard, unless your deployment user already has elevated privileges, you will have to reload/re-export the environment variables for your AWS 'admin' user's account (the AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY_ID, and AWS_REGION). If you do not do this, you will see error messages complaining about "Upload Failed....access denied."

**Source the higher-privileged AWS user credential set, then deploy dashboard to s3 bucket from the `cumulus-dashboard` directory:

      $ aws s3 sync dist s3://<prefix>-dashboard --acl public-read


You should be able to visit the dashboard website at `http://<prefix>-dashboard.s3-website-<region>.amazonaws.com` or find the url
`<prefix>-dashboard` -> "Properties" -> "Static website hosting" -> "Endpoint"

**Note** : If the dashboard sends you to an Earthdata Login page that has an error reading "Invalid request, please verify the client status or redirect_uri before resubmitting", this means you've either forgotten to update one or more of your EARTHDATA_CLIENT_ID, EARTHDATA_CLIENT_PASSWORD, or APIROOT environmental variables (see above), or you haven't placed the correct values in them, or you've forgotten to add both the "redirect" and "token" URL to the Earthdata Application.
**Note** : There is odd caching behavior associated with the dashboard and Earthdata Login at this point in time that can cause the above error to reappear on the Earthdata Login page loaded by the dashboard even after fixing the cause of the error. If you experience this, attempt to access the dashboard in a new incognito/private browser window, and it should work.




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
