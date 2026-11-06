# Implementation status

Last reviewed: 2026-11-06

## AWS v14 resume-alignment matrix

| Resume requirement | Repository evidence | Status |
|---|---|---|
| React.js + Node.js portfolio application | React UI, Express API, JWT auth and PostgreSQL persistence | Source present; test/build run pending |
| Amazon EKS | Terraform cluster and managed node group | Configuration present; Terraform validation/apply pending |
| Amazon ECR | Two immutable image repositories with push scanning | Configuration present; no AWS images published yet |
| Amazon RDS | Private encrypted PostgreSQL, secret generation and private SG | Configuration present; no AWS DB provisioned |
| Amazon S3 | Private encrypted versioned bucket with Block Public Access | Configuration present; no AWS bucket provisioned |
| VPC / IAM | VPC, subnets, routing, EKS roles, OIDC and scoped application roles | Configuration present; validate/apply pending |
| Terraform | EKS, VPC, RDS, S3, IAM and ECR | Configuration present; fmt/init/validate/plan pending |
| Helm | API/web deployments, services, probes, limits/requests, HPA, Ingress, PDB and RBAC | Chart present; lint/template pending |
| GitLab CI | API/web tests/build, Terraform/Helm validation, ECR publish, GitOps promotion | Pipeline source present; GitLab execution pending |
| Argo CD | App, metrics-server and Cluster Autoscaler Application manifests | Manifest present; Argo CD sync pending |
| Kubernetes RBAC | Namespace-scoped observer Role/RoleBinding | Manifest present; apply pending |
| IRSA | API S3, Load Balancer Controller and Cluster Autoscaler roles | Terraform present; apply/runtime verification pending |
| Node group autoscaling | ASG discovery tags, CA IAM role and Argo application | Configuration present; runtime scale test pending |
| 12-to-8-minute release improvement | No measured baseline or comparable release runs recorded | Not verified; must not present as measured evidence |

## Recent engineering fixes
- Completed missing API dependencies, Dockerfiles and initial PostgreSQL migration.
- Added verified PostgreSQL TLS using the AWS RDS global CA bundle.
- Added generated RDS and JWT secrets in Secrets Manager and a bootstrap procedure for the Kubernetes runtime Secret.
- Added VPC/EKS/ECR/RDS/S3 Terraform, scoped IAM/IRSA, Helm workloads and Argo CD/GitLab CI scaffolding.
- Added cost controls and troubleshooting/deployment documentation.

## Remaining completion gates
1. Generate and commit npm lockfiles; change CI install steps to `npm ci`.
2. Run GitHub validation: API tests, frontend production build, Docker builds, Terraform format/init/validate and Helm lint/template.
3. Resolve every validation finding before provisioning AWS.
4. Configure AWS account, Terraform state, GitLab OIDC and GitOps repository mirror/token.
5. Provision only after reviewing the plan and billing implications.
6. Run GitLab CI and verify ECR publishing and GitOps promotion.
7. Install Argo CD, AWS Load Balancer Controller, metrics-server and Cluster Autoscaler; verify sync/scale behavior.
8. Test registration/login, portfolio CRUD/publish, private RDS, S3 presigned upload and IRSA boundaries.
9. Measure release duration using consistent boundaries before making any 12-to-8-minute claim.

A committed manifest or successful CI build is not proof of a live deployment.
