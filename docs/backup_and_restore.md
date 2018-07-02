# Backup and Restore

[@cumulus/api](https://www.npmjs.com/package/@cumulus/api) uses a number of methods to preserve the metadata generated in a Cumulus instance.

## Data in DynamoDB

All configurations and system-generated metadata is stored in DynamoDB tables except the logs. System logs are stored in the AWS CloudWatch service.

Cumulus-api creates the following DynamoDB tables:

- **Users:** api/dashboard users
- **Collections:** collection records 
- **Providers:** provider records
- **Rules:** rules for managing and running workflows
- **Executions:** workflow executions (step function executions)
- **Granules:** granules processed by the Cumulus instance
- **PDRs:** PDRs processed in Cumulus

Amazon DynamoDB stores three geographically distributed replicas of each table to enable high availability and data durability. Amazon DynamoDB runs exclusively on solid-state drives (SSDs). SSDs help AWS achieve the design goals of predictable low-latency response times for storing and accessing data at any scale.

## Backup and Restore with AWS

You can enable point-in-time recovery (PITR) as well as create an on-demand backup for your Amazon DynamoDB tables.

PITR provides continuous backups of your DynamoDB table data. You can enable PITR with a single click from the AWS Management Console or a single API call. When enabled, DynamoDB maintains continuous backups of your table up to the last 35 days. You can recover a copy of that table to a previous state at any point in time from the moment you enable PITR, up to a maximum of the 35 preceding days. PITR provides continuous backups until you explicitly disable it.

On-demand backups allow you to create backups of DynamoDB table data and its settings. You can initiate an on-demand backup at any time with a single click from the AWS Management Console or a single API call. You can restore the backups to a new DynamoDB table in the same AWS Region at any time.

PITR gives your DynamoDB tables continuous protection from accidental writes and deletes. With PITR, you do not have to worry about creating, maintaining, or scheduling backups. You enable PITR on your table and your backup is available for restore at any point in time from the moment you enable it, up to a maximum of the 35 preceding days. For example, imagine a test script writing accidentally to a production DynamoDB table. You could recover your table to any point in time within the last 35 days.

On-demand backups help with long-term archival requirements for regulatory compliance. On-demand backups give you full-control of managing the lifecycle of your backups, from creating as many backups as you need to retaining these for as long as you need.

## Enabling PITR during deployment

You can enable point-in-time recovery on all existing tables in your `config.yml`. Add the following configuration to your `config.yml` under a deployment section:

```yaml
default:

    enablePointInTime: true
```

**Imoprtant Note:** Configuring point-in-time recovery is not supported by the CloudFormation (as of June 2018). We enable this feature deployment using AWS API. However, due to a limitation of AWS API, the feature fails to be enabled if it is running against newly created tables.

Therefore, if you are deploying a new stack, make sure the feature is turned off on your first deployment. You can turn it on and enable about an hour after your tables are created.


## Backup and Restore with cumulus-api CLI

cumulus-api CLI also includes a backup and restore command. The CLI backup command downloads the content of any of your DynamoDB tables to `.json` files. You can also use these `.json` files to restore the records to another DynamoDB table.

### Backup with the CLI

To backup a table with the CLI, make sure `@cumulus/api` package is installed. Then run:

     $ ./node_modules/.bin/cumulus-api backup --table <table-name>

the backup will be stored at `backups/<table-name>.json`

### Restore with the CLI

To restore data from a json file run the following command:

     $ ./node_modules/.bin/cumulus-api restore backups/<table-name>.json --table <new-table-name>