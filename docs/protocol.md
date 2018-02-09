# Configuration and Message Use Diagram

<img src="/images/cumulus_configuration_and_message_schema_diagram.png">

* **Configuration** - The Cumulus workflow configuration defines everything needed to describe an instance of Cumulus. 
* **Scheduler** - This starts ingest of a collection on configured intervals.
* **Input to Step Functions** - The Scheduler uses the Configuration as source data to construct the input to the Workflow.
* **AWS Step Functions** - Run the workflows as kicked off by the scheduler or other processes.
* **Input to Task** - The input for each task is a JSON document that conforms to the message schema.
* **Output from Task** - The output of each task must conform to the message schemas as well and is used as the input for the subsequent task.

## Common Schema Types

The Ingest Common JSON Schema defines common types for other JSON schemas.

<a href="/schemas/ingest_common_schema.json" target="_blank">Download Common Schema</a>
