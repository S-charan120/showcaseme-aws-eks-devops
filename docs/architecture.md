# AWS ShowcaseMe architecture

- API and React web run as separate EKS workloads, packaged as Helm releases.
- PostgreSQL is Amazon RDS in private subnets; application credentials are injected from Secrets Manager.
- S3 remains private with Block Public Access; application access uses IRSA-scoped permissions.
- Terraform manages VPC, EKS, IAM and AWS data services. Helm defines workload resources and HPA.
- Argo CD continuously reconciles a Git repository. Rollback is a Git revert followed by reconciliation.
- GitLab CI runs validation and coordinates image publication to ECR. The resume v14 does not include CodeBuild.
