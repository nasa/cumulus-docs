
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
## How to specify a file location in a bucket

Granule files can be placed in folders and subfolders in buckets for better organization. This is done by setting a `url_path` in the base level of a collection configuration to be applied to all files. To only affect placement of a single file, the `url_path` variable can be placed in that specific file of the collection configuration. There are a number of different ways to populate `url_path`.

### Hardcoding file placement

A file path can be added as the `url_path` in the collection configuration to specify the final location of the files. For example, take the following collection configuration

```
{
  "name": "MOD09GQ",
  "version": "006",
  "url_path": "example-path",
  "files": {
    {
      "bucket": "protected",
      "regex": "^MOD09GQ\\.A[\\d]{7}\\.[\\S]{6}\\.006.[\\d]{13}\\.hdf$",
      "sampleFileName": "MOD09GQ.A2017025.h21v00.006.2017034065104.hdf",
      "url_path": "file-example-path"
    },
    {
      "bucket": "private",
      "regex": "^MOD09GQ\\.A[\\d]{7}\\.[\\S]{6}\\.006.[\\d]{13}\\.hdf\\.met$",
      "sampleFileName": "MOD09GQ.A2017025.h21v00.006.2017034065104.hdf.met"
    }
  }
}
```

The first file, `MOD09GQ.A2017025.h21v00.006.2017034065104.hdf` has its own `url_path` so the resulting file path might look like `s3://cumulus-test-sandbox-protected/file-example-path/MOD09GQ.A2017025.h21v00.006.2017034065104.hdf`. The second file, `MOD09GQ.A2017025.h21v00.006.2017034065104.hdf.met`, does not have it's own `url_path` so it will use the collection `url_path` and have a final file path of `s3://cumulus-test-sandbox-protected/example-path/MOD09GQ.A2017025.h21v00.006.2017034065104.hdf.met`.

### Using a template for file placement

Instead of hardcoding the placement, the `url_path` can be a template to be populated with metadata during the move-granules step. For example:

```
"url_path": "{cmrMetadata.Granule.Collection.ShortName}"
```

This url path with be assigned as the collection shortname, `"MOD09GQ"`.
There can also be multiple subfolders in the `url_path`.

```
"url_path": "{cmrMetadata.Granule.Collection.ShortName}/{substring(file.name, 0, 3)}"
```

This example will populate to `"MOD09GQ/MOD"`

### Adding Metadata dates and times to the URL Path

There are a number of options to pull dates from the CMR file metadata. With this metadata:

```
"cmrMetadata": {
  "Granule": {
    "Temporal": {
      "RangeDateTime": {
        "BeginningDateTime": "2003-02-19T00:00:00Z",
        "EndingDateTime": "2003-02-19T23:59:59Z"
      }
    }
  }
}
```

`{extractYear(cmrMetadata.Granule.Temporal.RangeDateTime.BeginningDateTime)}` will pull out the year of the metedata: `2003`.

`{extractMonth(cmrMetadata.Granule.Temporal.RangeDateTime.BeginningDateTime)}` will pull out the month of the metedata: `2`.

`{extractDate(cmrMetadata.Granule.Temporal.RangeDateTime.BeginningDateTime)}` will pull out the month of the metedata: `19`.

`{extractHour(cmrMetadata.Granule.Temporal.RangeDateTime.BeginningDateTime)}` will pull out the month of the metedata: `0`.


