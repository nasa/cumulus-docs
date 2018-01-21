# Cumulus Tasks

<img src="/images/cumulus-task-message-flow.png">

This flow is detailed in sections below.

## Cumulus Message Format

A Cumulus Message has the 4 following keys:

* **`workflow_config`:** Stores configuration for each task in the workflow, keyed by task name.
* **`cumulus_meta`:** Stores meta information about the workflow - the state machine and associated execution's name. This information is used to look up the current active task which is then used to look up the corresponding task's config in `workflow_config`.
* **`meta`:** Stores execution-agnostic variables which can be re-used via templates in `workflow_config`.
* **`payload`:** The payload is the arbitrary output of the task's main handler code.

Here's a simple example of a Cumulus Message:

```json
{
  "workflow_config": {
    "Example": {
      "inlinestr": "prefix{meta.foo}suffix",
      "array": "{[$.meta.foo]}",
      "object": "{{$.meta}}"
    }
  },
  "cumulus_meta": {
    "message_source": "sfn",
    "state_machine": "arn:aws:states:us-east-1:1234:stateMachine:MySfn",
    "execution_name": "MyExecution__id-1234",
    "id": "id-1234"
  },
  "meta": {
    "foo": "bar"
  },
  "payload": {
    "anykey": "anyvalue"
  }
}
```

## Sled message prep functions

The event coming into the lambda task is assumed to be in the cumulus message format and should first be handled by message prep before being passed to the main task handler.

#### 1. Fetch remote event

Cumulus messages can be too big for AWS size limits (for Lambda or Step Functions or both?). Fetch remote event will fetch the actual event from S3 if the cumulus message includes a `replace` key. In this scenario, the incoming cumulus message object has only 2 message keys:

```json
{
  "replace": {
    "Bucket": "cumulus-bucket",
    "Key": "my-large-event.json"
  },
  "cumulus_meta": {}
}
```

Once "my-large-event.json" is fetched from S3, it's returned from the fetch remote event function. In the case that no "replace" key is present in the cumulus message, the cumulus message passed to the lambda task is returned as-is.

#### 2. Fetch step function config

Determines what current task is being executed (note this is different from what lambda handler is being used, because the same lambda handler can be used for different tasks) by calling the step function API. The current task name is used to load the appropriate configuration from the cumulus message 'workflow_config'.

#### 3. Load nested event

Using the config returned from the previous step, resolves templates for the final config and input to send to the main handler.

## Main handler

After message prep, the message passed to the main handler is of the form:

```json
{
  "input": {},
  "config": {},
  "messageConfig": {}
}
```


## Sled create next message functions

Whatever comes out of the main handler function is used to construct an outgoing cumulus message.

#### 1. Assign Outputs

The config loaded from the **Fetch step function config** step may have a `cumulus_message` key. This can be used to "dispatch" fields from the main handler output to a destination in the final event output. Here's an example where the value of `input.anykey` would be dispatched as the value of `payload.out` in the final cumulus message:

```json
{
  "workflow_config": {
    "Example": {
      "bar": "baz",
      "cumulus_message": {
        "input": "{{$.payload.input}}",
        "outputs": [
          {
            "source": "{{$.input.anykey}}",
            "destination": "{{$.payload.out}}"
          }
        ]
      }
    }
  },
  "cumulus_meta": {
    "task": "Example",
    "message_source": "local",
    "id": "id-1234"
  },
  "meta": {
    "foo": "bar"
  },
  "payload": {
    "input": {
      "anykey": "anyvalue"
    }
  }
}
```

#### 2. Store remote event

**Store remote event** complements **Fetch remote event**: If the cumulus message is too big, it will be stored in S3 and the final output of the task will be an object with just the `cumulus_meta` and `replace` keys, where the `replace` key identifies where the large event has been stored in S3.


