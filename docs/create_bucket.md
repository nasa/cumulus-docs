# Creating an S3 Bucket

Buckets can be created with the AWS command line utility or the web interface.


## Command line

Using the [AWS command line tool](https://aws.amazon.com/cli/) [create-bucket](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html) s3api subcommand:

```
$ aws s3api create-bucket --bucket foobar-internal
{
    "Location": "/foobar-internal"
}
```

Please note security settings and other bucket options can be set via the options listed in the s3api documentation.

Repeat the above step for each bucket to be created.


## Web interface

See: [AWS "Creating a Bucket" documentation](http://docs.aws.amazon.com/AmazonS3/latest/gsg/CreatingABucket.html)
