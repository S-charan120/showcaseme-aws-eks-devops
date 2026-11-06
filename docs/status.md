# Implementation status

Last reviewed: 2026-11-06

## Resume-alignment matrix (AWS v14)

| Resume requirement | Repository evidence | Status |
|---|---|---|
| React.js + Node.js portfolio application | React UI and Express API source | Present; not yet build/test validated in CI |
| Amazon EKS | Terraform EKS cluster and managed node group definitions | Implemented in code; Terraform not yet validated/applied |
| Amazon ECR | Two immutable repositories and image scanning | Implemented in code; no images published to a real AWS account |
| Amazon RDS | Private PostgreSQL instance, subnet group, encryption and SG rules | Implemented in code; not provisioned |
| Amazon S3 | Private, encrypted, versioned bucket with Block Public Access | Implemented in code; not provisioned |
| VPC and IAM | Public/private subnets, routing, cluster/node roles, OIDC roles | Implemented in code; Terraform not validated |
| Terraform | AWS platform configuration and example variables | Implemented in code; fmt/validate/plan still required |
| Helm | API/web Deployments and Services, probes, resource requests/limits, HPA, Ingress, PDB, RBAC | Chart scaffold present; lint/template validation still required |
| Argo CD | Application, metrics-server and Cluster Autoscaler Application manifests | Manifests present; not installed or synced |
| GitLab CI | API/web/terraform/Helm validation, Docker build, ECR publish, GitOps promotion | Pipeline file present; no GitLab project/pipeline execution verified |
| Kubernetes RBAC | Namespace-scoped observer Role and RoleBinding | Manifest present; not applied |
| IRSA | App S3 role, Load Balancer Controller role, Cluster Autoscaler role | Terraform trust/policy definitions present; not applied |
| EKS node group autoscaling | Managed node group min/desired/max, ASG discovery tags and Cluster Autoscaler role/Application | Configuration present; not run |
| 12-to-8-minute release improvement | No comparable measured release data | Not verified; do not claim as evidence yet |

## Application fixes already included
- Added dependencies imported by the API, including AWS S3 SDK and URL signer.
- Added the initial PostgreSQL migration required by the API startup migration runner.
- Added API and web Dockerfiles, local Compose environment and Nginx proxy configuration.
- Configured web image to run as a non-root Nginx container on port 8080.

## Remaining before this can be called complete
1. Generate and commit npm lockfiles; change CI from `npm install` to `npm ci`.
2. Run API tests, frontend production build, Docker image builds, Terraform fmt/init/validate and Helm lint/template.
3. Fix all static validation errors before any AWS apply.
4. Complete runtime secret delivery for `DATABASE_URL` and `JWT_SECRET`; document safe creation/rotation.
5. Configure and execute the GitLab pipeline in the GitLab project, including OIDC and GitOps promotion.
6. Install Argo CD, AWS Load Balancer Controller, metrics-server and Cluster Autoscaler, then verify reconciliation and autoscaling.
7. Provision AWS only after reviewing the plan and account costs; verify RDS, S3, EKS and application flows.
8. Record repeatable release durations. Do not claim the 12-to-8-minute improvement until measured.

A source file or manifest being committed is not evidence that it has been deployed or validated in a live cluster.
