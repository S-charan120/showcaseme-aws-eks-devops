# AWS ShowcaseMe architecture

- API and React web run as separate EKS workloads, packaged as Helm releases.
- PostgreSQL is Amazon RDS in private subnets; application credentials are injected from Secrets Manager.
- S3 remains private with Block Public Access; application access uses IRSA-scoped permissions.
- Terraform manages VPC, EKS, IAM and AWS data services. Helm defines workload resources and HPA.
- Argo CD continuously reconciles the GitLab repository's `main` branch and `deploy/helm/showcaseme` path (as configured in `deploy/argocd/application.yaml`). Rollback is a Git revert followed by reconciliation.
- GitLab CI (`.gitlab-ci.yml`) runs validation, builds and publishes commit-SHA images to ECR, then updates `deploy/helm/showcaseme/values-aws.yaml` through GitOps promotion. Argo CD—not GitLab CI—applies the resulting desired state. GitHub Actions (`.github/workflows/validate.yml`) performs repository checks only; it does not deploy AWS. CodeBuild is not part of this design.
