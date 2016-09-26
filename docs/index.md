# Cumulus

- **Current Phase:** 1
- **DAACs Covered:** GHRC
- **Collections Covered:** HS3

Cumulus is a cloud-based data ingest, archive, distribution and management prototype for NASA's future Earth science data streams

The prototype is primarily developed on Amazon Web Services (AWS). This documentation includes both guidelines, examples and source code docs.

This is a minimum viable product (MVP). In phase I, the platform is specifically designed to work with HS3 collections and it does not support others collections.

The platform relies on multiple AWS services that have to be configured separately before all pieces can work together. In future phases, the deployment will use AWS CloudFormation service to automatically create and configure most of these services.
