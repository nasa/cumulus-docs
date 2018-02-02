# Cumulus Configuration and Message Protocol

This document describes the Cumulus configuration file and the messages that are passed between tasks.

# Configuration and Message Use Diagram

<img src="/images/cumulus_configuration_and_message_schema_diagram.png">

* **Configuration** - The Cumulus configuration file defines everything needed to describe an instance of Cumulus. See details in the [Configuration section](#configuration) below.
* **Scheduler** - This starts ingest of a collection on configured intervals.
* **Input to Step Functions** - The Scheduler uses the Configuration as source data to construct the input to the Workflow. See the [Message Protocol section](#message-protocol) for details on how the configuration is used to
* **AWS Step Functions** - Run the workflows as kicked off by the scheduler or other processes.
* **Input to Task** - The input for each task is a JSON document that conforms to the message schema.
* **Output from Task** - The output of each task must conform to the message schemas as well and is used as the input for the subsequent task.

## Configuration

The Cumulus configuration file defines everything needed to describe an instance of Cumulus. This includes:

* **Provider configuration** - A list of providers and settings that apply at the provider level.
* **Workflows** - The Step Functions defined using the [AWS Step Function State Language](http://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html).
* **Collections** - Settings specific for ingesting data for a collection. This includes:
  * **Workflow** - a reference to a workflow at the top level that will allow ingesting the collection.
  * **Triggers** - Settings indicating how an ingest is started for a collection.
  * **Meta** - An element that is open for extension allowing the definition of any collection level configuration items needed.
  * **Workflow Task Configuration** - Templates that specify the configurations for each of the tasks that run within a workflow.

### URL Templating

When each task executes, it is expected to resolve URL templates found in its collection configuration against the entire collection configuration. For example, tasks should resolve the following collection:

```JSON
{
  "meta": { "name": "Hello" },
  "config" : { "output" : "{meta.name} World!" }
}
```

Into this:

```JSON
{
  "meta": { "name": "Hello" },
  "config" : { "output" : "Hello World!" }
}
```

URL template variables replace dotted paths inside curly brackets with their corresponding value. If a Task cannot resolve a value, it should ignore the template, leaving it verbatim in the string.  This allows decoupling tasks from one another and the data that drives them. Tasks are able to easily receive runtime configuration produced by previously run Tasks and domain data.

### Configuration JSON Schema and Example

[Download Configuration Schema](/schemas/collections_config_schema.json)

[Download Example Configuration](/schemas/example-data/example-collection.json)

## Message Protocol

The Message Protocol defines the the data that is used as input to individual workflow tasks. This includes:

* **Cumulus Meta** - External resources accessible to the Task. Tasks should generally prefer to be passed resources explicitly in their configuration rather than looking up paths here.
* **Meta** - Metadata taken from the collection configuration and other configuration settings. Tasks may add fields to the 'meta' object at will (in their returned output) in order to pass data to future tasks.
* **Workflow Configuration** - Specify the configurations for each of the tasks that run within a workflow.
* **Exception** - A field to indicate a task failure. Information in this can be used by the workflow to determine next steps.
* **Payload** - The main data produced by a task or used as input to the next task would go in this element.

### Creating the Workflow Input from the Configuration

The input to a workflow is generated from the Configuration and some other sources. This details the sources of the top level fields for the input.

* **Cumulus Meta** - Generated at workflow deployment time from workflow configuration.
* **Meta** - Metadata taken from the collection configuration and other configuration settings. Tasks may add fields to the this object in order to pass data to future tasks.
* **Workflow Configuration** - Generated at workflow deployment time from workflow configuration.
* **Exception** - Set to `'None'` initially.  A task can set this field.
* **Payload** - Set to `null` initially.  It is the main data produced by a task.

### Message Protocol Schema and Example

[Download Message Schema](/schemas/message_schema.json)

[Download Example Message](/schemas/example-data/example-message-envelope.json)

#### Generated Schema Documentation

## Common Schema Types

The Ingest Common JSON Schema defines common types for other JSON schemas.

[Download Common Schema](/schemas/ingest_common_schema.json)
