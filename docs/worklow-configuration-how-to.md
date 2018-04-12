
# Workflow Configuration How-To's

## How to specify a bucket for granules

How to configure `workflows.yml` workflow configurations for specifying buckets.

### Point to buckets in the configuration

Buckets specified in `app/config.yml` will become part of the `meta` object of the Cumulus message and can be accessed in your workflow configuration.

To use the buckets specified in your config, you can do the following:

```
DiscoverGranules:
      CumulusConfig:
        provider: '{$.meta.provider}'
        collection: '{$.meta.collection}'
        buckets: '{$.meta.buckets}'
```

### Hardcode a bucket

Bucket names can be hardcoded in your workflow configuration, for example:

```
DiscoverGranules:
      CumulusConfig:
        provider: '{$.meta.provider}'
        collection: '{$.meta.collection}'
        buckets:
          internal: 'sample-internal-bucket'
```
Or you can do a combination of meta buckets and hardcoded:

```
DiscoverGranules:
      CumulusConfig:
        provider: '{$.meta.provider}'
        collection: '{$.meta.collection}'
        buckets:
          internal: 'sample-internal-bucket'
          private: '{$.meta.buckets.private}'
```

### Using meta and hardcoding 

Bucket names can be configured using a mixture of hardcoded values and values from the meta. For example, to configure the bucket based on the collection name you could do something like:

```
DiscoverGranules:
      CumulusConfig:
        provider: '{$.meta.provider}'
        collection: '{$.meta.collection}'
        buckets:
          internal: '{$.meta.collection.name}-bucket'
```
