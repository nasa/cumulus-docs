# Ingest Inputs and Return Values

## General Structure

Cumulus uses a common format for all inputs and outputs from workflow steps consisting of a JSON object which holds all necessary information about the task execution and AWS environment. Tasks return objects identical in format to their input with the exception of a task-specific `"payload"` field. Tasks may also augment their execution metadata.

## Input Format

Below is the input format, annotated inline:

    {
      "cumulus_meta": {          // External resources accessible to the Task. Tasks should generally 
                                 // prefer to be passed resources explicitly in their configuration rather 
                                 // than looking up paths here. The paths being present here, however allows 
                                 // configuration to parameterize values that are not known until the stack 
                                 // is created.  For instance, a configuration field have the value 
                                 // "{cumulus_meta.buckets.private}", which instructs the Task to look up the 
                                 // private bucket while allowing the Task to remain ignorant of what buckets 
                                 // are available.
      
        "stack": "<string>",     // The name of the Task's CloudFormation Task, useful as a prefix
        "buckets": {             // Names of S3 buckets available to the app 
          "internal": "<string>",   // The name of the bucket holding configuration and deployment data
          "private": "<string>",    // The name of the bucket which holds internal platform data
          "protected": "<string>",  // The name of the bucket which holds protected data
          "public": "<string>"      // The name of the bucket which holds data to be served publicly   
        },
        "state_machine": "<string>",    // (Step-Function only) The ARN of the state machine being run
        "execution_name": "<string>",   // (Step-Function only) The name of the execution being run
        "workflow_name": "<string>",    // (Step-Function only) The name of the workflow being run
        "message_source": "<string>",   // A string describing the source that caused ingest to start,
                                        // set to sfn, stdin or local
      },
      "meta": {                  // Metadata taken from the collection configuration and other configuration 
                                 // settings. Tasks may add fields to the 'meta' object at will (in their 
                                 // returned output) in order to pass data to future tasks. Tasks should 
                                 // avoid assuming that fields are present in the meta object and avoid 
                                 // naming fields to put in the meta object, preferring instead to let 
                                 // configuration decide what goes into the object.      
        "cmr": {                 // CMR credential for exporting metadata to CMR
          "username": "<string>",   // CMR user name
          "password": "<string>",   // CMR encrypted password
          "clientId": "<string>",   // Earthdata client ID
          "provider": "<string>"    // CMR provide ID
        },
        "provider": {            // Provider configuration information taken from the 'providers' of 
                                 // collection configuration.  Any fields are allowed.
          "id": "<string>",      // An id used to identify this provider
          "anykey": "anyvalue"   // additional configuration items
        },
        "collection": {          // Metadata taken from the 'meta' attribute of the collection. These can 
                                 // contain any data that is specific to the collection.
          "anykey": "anyvalue"
        },
        "queues": {              // List of SQS queues that are used by the cumulus-api
          "anyqueue": "queue endpoint"
        }
      },
      "workflow_config": {       // Defines configuration for tasks that are part of a workflow as a map 
                                 // of task name to a JSON object containing configuration settings
        "any task name": "any ask configuration" // task configuration for each task in the workflow
      },
      "exception": "<object>",   // An optional field that a task can return with any valid as a signal 
                                 // that the task aborted for a reason. Information in this can be used by 
                                 // the workflow to determine next steps
      "payload": "<object>"      // A Task-specific payload. This can be any data type required by the Task.
                                 // It can be considered the input and output of the Task, whereas the other 
                                 // fields are execution context. Tasks should document their expected payload 
                                 // input and output formats. Generally a Task will return an object which is 
                                 // nearly identical to its input in all fields but 'payload', and 'payload' 
                                 // will be completely different"
    }

## Cumulus Message Adapter

The Scheduler service creates the initial event by combining the collection configuration, external resource configuration, workflow configuration, and deployment environment settings.  The subsequent workflow messages between tasks must conform to the message schema. By using Cumulus Message Adapter, individule task Lambda function can focus on the input and output specific to the task, and does not worry about the non-task related message fields.

Cumulus Message Adapter implements an AWS Lambda handler that adapts incoming messages in the Cumulus protocol to a format more easily consumable by Cumulus tasks, invokes the tasks, and then adapts their response back to the Cumulus message protocol to be sent to the next task.  

A task Lambda function can be configured to use Cumulus Message Adapter to help construct the input/output messages and resolve task configurations. In the Lambda function configuration file, a task Lambda function can be configured to use Cumulus Message Adapter, for example,

    DiscoverPdrs:
      handler: index.handler
      useMessageAdapter: true  

A task Lambda function using the Message Adapter shall take a event message which contains two fields, `"input"` and `"config"`.
> `input`: By default, the incoming payload is the payload from previous task, or it can be a portion of the payload as specified in the task configuration.

> `config`: Task-specific configuration object with URL templates resolved.

> `Task output`: By default, the task's return value is the next payload, or a portion of it is interpreted as the next payload as specified in the task configuration.

**Cumulus Message Adapter has the following capabilities:**

### 1. Retrieve a Cumulus message from S3 Bucket, or store a cumulus message to a S3 Bucket.

Because of the potential size of a Cumulus message, mainly the `"payload"` field, if the message size is greater than 10000 bytes, the full message will be stored to S3 Bucket.  The message may contain a reference to an S3 Bucket and Key, as follows:

    {
      "cumulus_meta": {...},
      "replace": {
        "Bucket": "gitc-foo",
        "Key": "bar/baz"
        }
    }

When a workflow task receives such message, the Cumulus Message Adapter is responsible for fetching the JSON message document and pass it to the task.  When a task output message is too big, the Cumulus Message Adapter will store the message to S3 Bucket under $.cumulus_meta.buckets.internal, and return a new message with S3 reference as above example.

### 2. Resolve URL templates in the task configuration

In the workflow configuration, each task has its own configuration, and it can use URL template as a value for achieve simplicity or for values only available at execution time.  When each task executes, it is expected to resolve URL templates found in its configuration against the entire Cumulus message. The Cumulus Message Adapter solves the URL templates and then passes message to next task. For example, a task has configuration in the workflow:

    Discovery:
        config:
          useQueue: true
          stack: '$.cumulus_meta.stack'
          provider: '$.meta.provider'
          inlinestr: 'prefix{meta.foo}suffix',
          array: '{[$.meta.foo]}',
          object: '{{$.meta}}'

The task configuration in the message (only partial message is shown here):

    {
      "cumulus_meta": {
        "stack": "foo-cumulus",
        ....
      },
      "meta": {
        "foo": "bar",
        "provider": {
          "id": "FOO_DAAC",
          "anykey": "anyvalue"
        },
        ...
      },
      "workflow_config": {
        "Discovery": {
          "useQueue": true,
          "stack": "{{$.cumulus_meta.stack}}",
          "object": "{{$.meta.provider}}",
          "inlinestr": "prefix{meta.foo}suffix",
          "array": "{[$.meta.foo]}"
        },
        ...
      }
    }

Into this as part of the message passed to task:

    {
      "config" : {
        "useQueue": true,
        "stack": "foo-cumulus",
        "object": {
          "id": "FOO_DAAC",
          "anykey": "anyvalue"
        },
        "inlinestr": "prefixbarsuffix",
        "array": ["bar"]
      }
      
URL template variables replace dotted paths inside curly brackets with their corresponding value. If the Cumulus Message Adapter cannot resolve a value, it should ignore the template, leaving it verbatim in the string.  While seemingly complex, this allows significant decoupling of Tasks from one another and the data that drives them. Tasks are able to easily receive runtime configuration produced by previously run Tasks and domain data.

### 3. Resolve task input

By default, the incoming payload is the payload from previous task.  The task can also be configured to use a portion of the payload its input message.  For example, a task specifies cumulus_message.input in its workflow configuration:
    
    ExampleTask:
      config:
        cumulus_message:
            input: '$.payload.foo'
            
The task configuration in the message:

    {
      "workflow_config": {
        "ExampleTask": {
          "cumulus_message": {
            "input": "{{$.payload.foo}}"
          }
        }
      },
      "payload": {
        "foo": {
          "anykey": "anyvalue"
        }
      }
    }

The Cumulus Message Adapter will resolve the task input, instead of send the whole `"payload"` as task input, the task input would be:
    
      "input" : {
        "anykey": "anyvalue"
      }

### 4. Resolve task output

By default, the task's return value is the next payload.  However, the workflow task configuration can specify a portion of the return value as the next payload, and can also augment values to other fields.  Based on the task configuration under cumulus_message.outputs, the Message Adapter applies a task's return value to an output message, from source to destination. If the destination already exists, its value would be updated.  For example, a task specifies cumulus_message.output in its workflow configuration:
    
    ExampleTask:
      config:
        cumulus_message:
            outputs: 
              - source: '$'
                destination: '$.payload'
              - source: '$.output.anykey'
                destination: '$.meta.baz'
                
The task configuration in the message:

    {
      "workflow_config": {
        "ExampleTask": {
          "cumulus_message": {
            "outputs": [
              {
                "source": "{{$}}",
                "destination": "{{$.payload}}"
              },
              {
                "source": "{{$.output.anykey}}",
                "destination": "{{$.meta.baz}}"
              }
            ]
          }
        }
      },
      "meta": {
        "foo": "bar"
      },
      "payload": {
        "anykey": "anyvalue"
      }
    }

The response from task:

    {
      "output": {
          "anykey": "boo"
      }
    }

So the message would be like this after the adapter resolves the output:

    {
      "workflow_config": {
        "ExampleTask": {
          "cumulus_message": {
            "outputs": [
              {
                "source": "{{$}}",
                "destination": "{{$.payload}}"
              },
              {
                "source": "{{$.output.anykey}}",
                "destination": "{{$.meta.baz}}"
              }
            ]
          }
        }
      },
      "meta": {
        "foo": "bar",
        "baz": "boo"
      },
      "payload": {
        "output": {
          "anykey": "boo"
        }
      }
    }
    
### 5. Validate task input, output and configuration messages against the schemas provided.

If the task has schemas for input, output and configuration messages, the Message Adapter validates each of the messages against its corresponding schema after a message is generated.

## Specific Payload Formats

### Remote Urls

Input to: sync-http-urls

Returned by: discover-http-tiles, sync-wms

    "payload": [             // Array of remote URLs
      {
         "url": "<string>",     // A single remote URL
         "version": "<string>"  // An opaque string that identifies the remote file version.
                                // This can be used to allow re-fetching of remote resources if
                                // the change but still have the same URL
      },
      ...                       // Potentially more URLs
    ]

### S3 Objects

Produced by: sync-http-urls

Input to: generate-mrf

    "payload": [               // Array of S3 objects
      {
        "Bucket": "<string>",  // The S3 bucket. The key's case convention is broken to
                               // maintain consistency with the S3 SDK/API. These objects
                               // can (and should) be passed verbatim to the SDK.
        "Key": "<string>"      // The S3 object's key.
      }
      ...                      // Potentially more objects
    ]

### null

Produced by: scheduler, discover-cmr-granules

Input to: All starting tasks

    "payload": null  // Or just leave it off
