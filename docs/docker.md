# Dockerizing Data Processing

Software for the processing of data is developed in a variety of languages, with a different set of dependencies. To standardize processing, Docker allows us to provide an environment (called an image) to meet the needs of any processing software, while running on the kernel of the host server (in this case, an EC2 instance). Thi lightweight virtualization does not carry the overhead of any additional VM, providing near instant startup and the ability run any dockerized process as a command line call.


## Using Docker

Before building a new Docker image for processing data.


### Docker Registry

Docker images can be pre-built and stored in the cloud in a Docker registry. Currently we are using the AWS Docker Registry, called ECR. To access these images, you must first log in using your AWS credentials. The AWS CLI provides a command to get the proper login string to be used to login. Use this command to generate the login command and execute it.

```
# install awscli
$ pip install awscli

# login to the AWS Docker registry
$ aws ecr get-login --region us-east-1 | source /dev/stdin
```

As long as you have permissions to access the NASA Cumulus AWS account, this will allow you to pull images from the repository, and push rebuilt or new images.


### Source Control and Versions

All the code necessary for processing a data collection, and the code used to create a Docker image for it is contained within a single GitHub repository, following the naming convention docker-*dataname*, where *dataname* is the short name of the data collection. The git 'develop' branch is the current development version, 'master' is the latest release version, and a git tag exists for each tagged version (e.g., v0.1.3). 

Docker images can have multipled tagged versions. The Docker images in the registry follow this same convention.  A docker image tagged as 'develop' is an image of the development branch. 'latest' is the master brach, and thus the latest tagged version, with an additional tagged image for each version tagged in the git repository.

The generation of the released tagged images are created and deployed automatically with Circle-CI, the continuous integration system used by Cumulus. When new commits are merged to a branch, the appropriate Docker image is built, tested, and deployed to the Docker registry. More on testing below.


## Docker Images


### docker-base

Docker images are built in layers, allowing lower level dependencies to be shared as docker layers among more than one child layer. A base docker image is provided then includes some dependenceis shared among the current HS3 data processing codes. This includes, but is not limited to, NetCDF liraries, AWS Cli, Python, Git, as well as py-cumulus. Py-cumulus is a collection of Python utilities that are used in the main python-based processing scripts. The docker-base repository is used to generate new images that are then stored in the AWS Docker registry (ECR).

The docker-base image can be interacted with by calling running it in interactive mode, since the default entrypoint to the image is a bash shell.


### Example docker image: docker-hs3-avaps


```
# cumulus processing Dockerfile: docker-hs3-avaps

FROM 985962406024.dkr.ecr.us-east-1.amazonaws.com/cumulus-base:latest

# copy needed files
WORKDIR /work
COPY . /work

RUN apt-get install -y nco libhdf5-dev

# compile code
RUN gcc convert/hs3cpl2nc.c -o _convert -I/usr/include/hdf5/serial -L/usr/include/x86_64-linux-gnu -lnetcdf -lhdf5_serial

# TODO - input and output directories will be Data Pipeline staging dir env vars
ENTRYPOINT ["/work/process.py"]
CMD ["input", "output"]
```



### Development with docker-compose

For development it is necessary to build images locally, test them, a docker-compose.yml is supplied for all Docker images, including the base image. 

To run a pre-defined docker command using docker-compose run commands, issue the command:

	$ docker-compose run *command*

where *commmand* is one of

* *build*: This
* *bash*: Run a bash script
* *test*: Processes data in the directory *data/input* and saves the output to the *data/test-output* directory.

Note that running *test* doesn't run any tests on the output.



## Python Processing Handler

All of the processing is managed through a Python function called the processing handler. The handler processes a directory of 1 or more granules



## Process Testing



Test data

On S3