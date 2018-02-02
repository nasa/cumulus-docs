# Ingest Inputs and Return Values

## General Structure

Cumulus uses a common format for all inputs and outputs to workflows. The same format is used for input and output from workflow steps. The common format consists of a JSON object which holds all necessary information about the task execution and AWS environment. Tasks return objects identical in format to their input with the exception of a task-specific `"payload"` field. Tasks may also augment their execution metadata.

## Input Format

Below is the input format, annotated inline:

    {
      "cumulus_meta": {          // External resources accessible to the Task. The paths being present here allows 
                                 // configuration to parameterize values that are not known until the stack 
                                 // is created.  For instance, a configuration field have the value 
                                 // "{cumulus_meta.buckets.private}", which instructs the task to look up the 
                                 // private bucket while allowing the Task to remain ignorant of what buckets 
                                 // are available.
      
        "stack": "<string>",     // The name of the task's CloudFormation Task, useful as a prefix
        "buckets": {             // Names of S3 buckets available to the app 
          "internal": "<string>",   // The name of the bucket holding configuration and deployment data
          "private": "<string>",    // The name of the bucket holding internal platform data
          "protected": "<string>",  // The name of the bucket holding protected data
          "public": "<string>"      // The name of the bucket holding data to be served publicly   
        },
        "state_machine": "<string>",    // (when message_source is sfn) The ARN of the state machine being run
        "execution_name": "<string>",   // (when message_source is sfn) The name of the execution being run
        "workflow_name": "<string>",    // (when message_source is sfn) The name of the workflow being run
        "message_source": "<string>",   // A string describing the source that caused ingest to start,
                                        // set to sfn, stdin or local
      },
      "meta": {                  // Metadata taken from the collection configuration and other configuration 
                                 // settings. Tasks may add fields to the 'meta' object at will (in their 
                                 // returned output) in order to pass data to future tasks. Tasks should 
                                 // avoid assuming that fields are present in the meta object and avoid 
                                 // naming fields to put in the meta object, preferring instead to let 
                                 // configuration decide what goes into the object.      
        "cmr": {                 // (optional) CMR credential for exporting metadata to CMR
          "username": "<string>",   // CMR user name
          "password": "<string>",   // CMR encrypted password
          "clientId": "<string>",   // Earthdata client ID
          "provider": "<string>"    // CMR provide ID
        },
        "provider": {            // Provider configuration information taken from the 'providers' of 
                                 // collection configuration.  Any field from the provider is allowed.
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

The Cumulus Message Adapter and Cumulus Message Adapter libraries help task developers integrate their tasks into a Cumulus workflow. These libraries adapt input and outputs from tasks into the Cumulus Message format. The Scheduler service creates the initial event by combining the collection configuration, external resource configuration, workflow configuration, and deployment environment settings.  The subsequent workflow messages between tasks must conform to the message schema. By using Cumulus Message Adapter, individual task Lambda functions only receive the input and output specifically configured for the task, and not non-task-related message fields.

The Cumulus Message Adapter libraries implement an AWS Lambda handler that adapts incoming messages in the Cumulus protocol to a format more easily consumable by Cumulus tasks, invokes the tasks, and then adapts their response back to the Cumulus message protocol to be sent to the next task.  

A task's Lambda function can include a Cumulus Message Adapter library which constructs input/output messages and resolves task configurations. In the Lambda function configuration file lambdas.yml, a task Lambda function can be configured to use Cumulus Message Adapter, for example:

    DiscoverPdrs:
      handler: index.handler
      useMessageAdapter: true  

Input to task application code is a json object with keys:
* `input`: By default, the incoming payload is the payload from previous task, or it can be a portion of the payload as specified in the task configuration.
* `config`: Task-specific configuration object with URL templates resolved.

Output of the task application code:
* `Task output`: By default, the task's return value is the next payload, or a portion of it is interpreted as the next payload as specified in the task configuration.

**Cumulus Message Adapter has the following steps:**

### 1. Retrieve a Cumulus message from S3 Bucket, or store a Cumulus message to a S3 Bucket.

Because of the potential size of a Cumulus message, mainly the `"payload"` field, if the message size is greater than 10000 bytes, the full message will be stored to S3 Bucket.  The message may contain a reference to an S3 Bucket and Key, as follows:

    {
      "cumulus_meta": {...},
      "replace": {
        "Bucket": "gitc-foo",
        "Key": "bar/baz"
        }
    }

When a workflow receives a large message, the Cumulus Message Adapter is responsible for fetching the JSON message document and passing it to the task.  When a task output message is too big, the Cumulus Message Adapter will store the message to S3 Bucket under $.cumulus_meta.buckets.internal, and return a new message with an S3 reference as in the above example.

### 2. Resolve URL templates in the task configuration

In the workflow configuration, each task has its own configuration, and it can use URL template as a value to achieve simplicity or for values only available at execution time. The Cumulus Message Adapter resolves the URL templates and then passes message to next task. For example, given a task which has the following configuration:

    Discovery:
        config:
          useQueue: true
          stack: '$.cumulus_meta.stack'
          provider: '$.meta.provider'
          inlinestr: 'prefix{meta.foo}suffix',
          array: '{[$.meta.foo]}',
          object: '{{$.meta}}'

The corresponding Cumulus Message would be:

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

The message sent to the task would be:

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
      },
      "input":{...}
    }  
            
URL template variables replace dotted paths inside curly brackets with their corresponding value. If the Cumulus Message Adapter cannot resolve a value, it will ignore the template, leaving it verbatim in the string.  While seemingly complex, this allows significant decoupling of Tasks from one another and the data that drives them. Tasks are able to easily receive runtime configuration produced by previously run tasks and domain data.

### 3. Resolve task input

By default, the incoming payload is the payload from the previous task.  The task can also be configured to use a portion of the payload its input message.  For example, given a task specifies cumulus_message.input:
    
    ExampleTask:
      config:
        cumulus_message:
            input: '$.payload.foo'
            
The task configuration in the message would be:

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

The Cumulus Message Adapter will resolve the task input, instead of sending the whole `"payload"` as task input, the task input would be:
    
    {
      "input" : {
        "anykey": "anyvalue"
      },
      "config": {...}
    }

### 4. Resolve task output

By default, the task's return value is the next payload.  However, the workflow task configuration can specify a portion of the return value as the next payload, and can also augment values to other fields. Based on the task configuration under `cumulus_message.outputs`, the Message Adapter uses a task's return value to output a message as configured by the task-specific config defined under `workflow_config`. The Message Adapter dispatches a "source" to a "destination" as defined by URL templates stored in the task-specific `cumulus_message.outputs`. The value of the task's return value at the "source" URL is used to create or replace the value of the task's return value at the "destination" URL. For example, given a task specifies cumulus_message.output in its workflow configuration as follows:
    
    ExampleTask:
      config:
        cumulus_message:
            outputs: 
              - source: '$'
                destination: '$.payload'
              - source: '$.output.anykey'
                destination: '$.meta.baz'
                
The corresponding Cumulus Message would be:

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

Given the response from the task is:

    {
      "output": {
          "anykey": "boo"
      }
    }

The Cumulus Message Adapter would output the following Cumulus Message:

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

The Cumulus Message Adapter has the capability to validate task input, output and configuration messages against their schemas.  The default location of the schemas is the schemas folder in the top level of the task and the default filenames are input.json, output.json, and config.json. The task can also configure a different schema location.  If no schema can be found, the Cumulus Message Adapter will not validate the messages.

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
