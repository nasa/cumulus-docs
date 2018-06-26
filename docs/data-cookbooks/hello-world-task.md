# HelloWorld Task

Example task meant to be a sanity check/introduction to the Cumulus workflows.

### Workflow Configuration

The [workflow definition](https://github.com/cumulus-nasa/cumulus/blob/master/example/workflows.yml#L1) can be found in `workflow.yml` under `HelloWorldWorkflow:`

```
HelloWorldWorkflow:
  Comment: 'Returns Hello World'
  StartAt: StartStatus
  States:
    StartStatus:
      Type: Task
      Resource: ${SfSnsReportLambdaFunction.Arn}
      CumulusConfig:
        cumulus_message:
          input: '{$}'
      Next: HelloWorld
    HelloWorld:
      CumulusConfig:
        buckets: '{$.meta.buckets}'
        provider: '{$.meta.provider}'
        collection: '{$.meta.collection}'
      Type: Task
      Resource: ${HelloWorldLambdaFunction.Arn}
      Next: StopStatus
    StopStatus:
      Type: Task
      Resource: ${SfSnsReportLambdaFunction.Arn}
      CumulusConfig:
        sfnEnd: true
        stack: '{$.meta.stack}'
        bucket: '{$.meta.buckets.internal.name}'
        stateMachine: '{$.cumulus_meta.state_machine}'
        executionName: '{$.cumulus_meta.execution_name}'
        cumulus_message:
          input: '{$}'
      Catch:
        - ErrorEquals:
          - States.ALL
          Next: WorkflowFailed
      End: true
    WorkflowFailed:
      Type: Fail
      Cause: 'Workflow failed'
```

![](/images/hello-world_workflow.png)
*Workflow as seen in AWS Console*

### Task Configuration

The [task itself](https://github.com/cumulus-nasa/cumulus/blob/master/example/lambdas.yml#L1) is defined in `lambdas.yml` under `HelloWorld:`

```
HelloWorld:
  handler: index.handler
  timeout: 300
  memory: 256
  source: 'node_modules/@cumulus/hello-world/dist/'
  useMessageAdapter: true
```

### Execution

### Debugging

### Summary


