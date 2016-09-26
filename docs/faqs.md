#### What is a collection? What is a granule?

Collections and granules are concepts within NASA's data mangement systems. Specifically, for Cumulus, they are metadata categories for groups of data (ie, collections) and individual data files (ie, granules), structured to one of the UMM-compatible specifications. We use [ECHO 10](echo.nasa.gov/ingest/schemas/operations/docs/).

#### How do I create or edit a collection in Cumulus?

This can be accomplished via the Dashboard, from the main page (for creating a new collection) or from the collection page (for editing).

#### How do I delete granules?

For Phase 1, this can only be accomplished manually via the AWS Console, by deleting the granule from the DynamoDB table and the S3 buckets. In Phase 2, this will be made easier, through the Dashboard.

#### How do I cancel an ongoing data processing task?

This will be enabled in Phase 2.
