# AWS portfolio repository completion notes

This document separates checks that can be reproduced from this repository from checks that require a configured AWS/GitLab account.

## Homaid — ECS Fargate

### Intended path
React/Nginx and Node.js API images → ECR → two ECS Fargate services in private subnets → ALB path routing → MongoDB endpoint → CloudWatch. Terraform provisions the network, load balancer, repositories, roles, task definitions, services, alarms and optional Route 53 alias. GitHub Actions validates changes and only attempts deployment from the protected `main` branch when the AWS role variable is configured.

### Release checks
- Validate API tests, web build, compose model, Docker builds and Terraform.
- Inspect Terraform plan and confirm remote state before apply.
- Populate the two Secrets Manager secret values after creation.
- Restrict GitHub OIDC subject to this repository's intended ref.
- Verify ECR images carry the commit SHA, then verify the two ECS services, target groups, readiness and CloudWatch logs.
- Record workflow run URL, commit SHA, task-definition ARNs and release timestamps before making any deployment-duration claim.

### Operational caveat
The baseline ALB listener is HTTP. For a public production domain, configure ACM, HTTPS listener and HTTP-to-HTTPS redirect before routing real user traffic. The single NAT Gateway is a cost-optimized learning choice and a zonal resilience trade-off.

## ShowcaseMe — EKS

### Intended path
GitLab CI validates/tests and builds API/web images → GitLab OIDC obtains short-lived AWS credentials → ECR → GitOps Helm values are promoted with SHA tags → Argo CD reconciles the chart to EKS. Terraform provisions the VPC, EKS/node group, RDS, private S3 and OIDC roles. CodeBuild is intentionally excluded.

### Release checks
- Run GitLab merge-request validation (API, frontend, Terraform and Helm).
- Confirm the GitLab OIDC token subject and audience exactly match the IAM trust policy.
- Verify ECR repositories and exact SHA tags.
- Ensure the GitOps promotion commit updates both workload image tags.
- Verify Argo CD revision/sync/health, deployment rollouts, ingress targets, HPA metrics, RDS access and scoped S3 access.
- Record pipeline URL, commit SHA, ECR digests, Argo CD revision and rollout timestamps before claiming a release-time improvement.

### Operational caveats
- Terraform-generated database/JWT credentials are sensitive state values. Use an encrypted, access-controlled remote backend and do not export or commit state files.
- The EKS public API endpoint is restricted by `cluster_admin_cidrs`; replace the loopback-only example with the operator's public /32 before provisioning.
- The sample uses one NAT Gateway and a single-AZ RDS instance to control lab cost. These are not multi-AZ production resilience settings.
- Install AWS Load Balancer Controller with its matching policy/version and install Cluster Autoscaler with a version compatible with the selected Kubernetes minor version.
- The current Argo CD Application uses GitLab as the source of truth. If using GitLab CI promotion, ensure Argo CD has read access to that repository.

## Evidence standard
A green GitHub validation workflow proves repository checks ran in GitHub-hosted CI. It does not prove an AWS deployment. A GitLab pipeline definition does not prove GitLab OIDC or ECR publication until run in the configured GitLab project. A Helm render does not prove a healthy EKS rollout. Keep these distinctions in project descriptions and interview explanations.
